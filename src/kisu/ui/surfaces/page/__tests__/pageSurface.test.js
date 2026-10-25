// PageSurface / PrimaryAction 测试（MVP-18 / INH-1159）。
// 单元：四态渲染 + blocked 原因 + 键盘激活 + 禁用守卫；
// 集成：真实 controller（#14）→ PopupShell → PrimaryAction 全链路。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MSG_TRANS_GETRULE, MSG_TRANS_TOGGLE } from "../../../../../config/msg";
import { PopupShell } from "../../popup/PopupShell.jsx";
import { PageSurface } from "../PageSurface.jsx";
import { PrimaryAction } from "../PrimaryAction.jsx";
import { createPageController } from "../../../../product/page/controller";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

const render = (ui) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const fireClick = (el) =>
  act(() => {
    el.click();
  });
const fireKey = (el, key) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
const fireFocus = (el) =>
  act(() => {
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  });

const vm = (overrides) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({}),
    can: Object.freeze({ translate: true, stop: false }),
    blockedBy: null,
    error: null,
    ...overrides,
  });

const primaryButton = (container) =>
  [...container.querySelectorAll("button")].find((b) =>
    ["Translate", "Stop", "Translate…"].includes(b.textContent)
  );

describe("PrimaryAction states (MVP-18)", () => {
  it("idle renders an enabled primary Translate and fires onTranslate", () => {
    const onTranslate = jest.fn();
    const { container, unmount } = render(
      <PrimaryAction viewModel={vm()} onTranslate={onTranslate} />
    );
    const button = primaryButton(container);
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("Translate");
    fireClick(button);
    expect(onTranslate).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("active renders Stop and fires onStop", () => {
    const onStop = jest.fn();
    const { container, unmount } = render(
      <PrimaryAction
        viewModel={vm({
          status: "active",
          can: { translate: false, stop: true },
        })}
        onStop={onStop}
      />
    );
    const button = primaryButton(container);
    expect(button.textContent).toBe("Stop");
    expect(button.disabled).toBe(false);
    fireClick(button);
    expect(onStop).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("loading and error disable the action", () => {
    const { container: c1, unmount: u1 } = render(
      <PrimaryAction viewModel={vm({ status: "loading", can: {} })} />
    );
    expect(primaryButton(c1).disabled).toBe(true);
    u1();

    const { container: c2, unmount: u2 } = render(
      <PrimaryAction
        viewModel={vm({
          status: "error",
          can: {},
          error: { code: "TRANSPORT_UNAVAILABLE", message: "x" },
        })}
      />
    );
    expect(primaryButton(c2).disabled).toBe(true);
    u2();
  });

  it("blocked states stay disabled with an explicit reason", () => {
    const onTranslate = jest.fn();
    const { container, unmount } = render(
      <PrimaryAction
        viewModel={vm({
          can: { translate: false, stop: false },
          blockedBy: "site",
        })}
        onTranslate={onTranslate}
      />
    );
    const button = primaryButton(container);
    expect(button.disabled).toBe(true);
    fireClick(button);
    expect(onTranslate).not.toHaveBeenCalled();

    fireFocus(button.parentElement);
    const tip = container.querySelector('[role="tooltip"]');
    expect(tip.textContent).toContain("disabled for this site");
    unmount();
  });

  it("activates via Enter and Space keys, and keys are inert when disabled", () => {
    const onTranslate = jest.fn();
    const { container, unmount } = render(
      <PrimaryAction viewModel={vm()} onTranslate={onTranslate} />
    );
    const button = primaryButton(container);
    fireKey(button, "Enter");
    fireKey(button, " ");
    expect(onTranslate).toHaveBeenCalledTimes(2);

    const { container: c2, unmount: u2 } = render(
      <PrimaryAction
        viewModel={vm({ can: { translate: false, stop: false }, blockedBy: "provider" })}
        onTranslate={onTranslate}
      />
    );
    fireKey(primaryButton(c2), "Enter");
    expect(onTranslate).toHaveBeenCalledTimes(2); // 禁用态键盘无动作
    unmount();
    u2();
  });
});

const flushInAct = async () => {
  await act(async () => {
    await flushPromises();
  });
};

describe("PageSurface integration with the real controller (MVP-18)", () => {
  const makeTransport = (rule, setting) => {
    const t = {
      sent: [],
      rule,
      setting,
      sendAction: async (action) => {
        t.sent.push(action);
        if (action === MSG_TRANS_GETRULE) {
          return { rule: t.rule, setting: t.setting };
        }
        if (action === MSG_TRANS_TOGGLE) {
          t.rule = {
            ...t.rule,
            transOpen: t.rule.transOpen === "true" ? "false" : "true",
          };
        }
        return {};
      },
    };
    return t;
  };

  const Harness = ({ controller }) => {
    const [view, setView] = useState(controller.getView());
    useEffect(() => controller.subscribe(setView), [controller]);
    return (
      <PopupShell title="Kisu" viewModel={view}>
        <PageSurface viewModel={view} actions={controller.actions} />
      </PopupShell>
    );
  };

  it("wires shell → surface → controller end to end", async () => {
    const t = makeTransport({ transOpen: "false" }, {});
    const controller = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    const { container, unmount } = render(<Harness controller={controller} />);

    await flushInAct();
    expect(t.sent).toContain(MSG_TRANS_GETRULE);
    const translate = primaryButton(container);
    expect(translate.textContent).toBe("Translate");

    await act(async () => {
      translate.click();
      await flushPromises();
    });
    expect(t.sent).toContain(MSG_TRANS_TOGGLE);
    expect(primaryButton(container).textContent).toBe("Stop");

    await act(async () => {
      primaryButton(container).click();
      await flushPromises();
    });
    expect(primaryButton(container).textContent).toBe("Translate");
    controller.dispose();
    unmount();
  });

  it("keeps the action disabled end to end on a blacklisted site", async () => {
    const t = makeTransport({ transOpen: "false" }, { blacklist: "example.com" });
    const controller = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/x",
    });
    const { container, unmount } = render(<Harness controller={controller} />);
    await flushInAct();
    expect(primaryButton(container).disabled).toBe(true);
    controller.dispose();
    unmount();
  });
});
