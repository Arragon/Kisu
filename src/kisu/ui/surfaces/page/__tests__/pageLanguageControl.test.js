// PageLanguageControl 测试（MVP-20 / INH-1161）。
// 单元：选中值、未知码回退 + 明示、禁用；集成：controller → PUTRULE → 重开保持。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
} from "../../../../../config/msg";
import { PageSurface } from "../PageSurface";
import { PageLanguageControl } from "../PageLanguageControl";
import { ModeProvider } from "../../../primitives";
import {
  getLanguageOptions,
  getDefaultTargetLanguage,
} from "../../../../product/page/languages";
import { createPageController } from "../../../../product/page/controller";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};
const flushInAct = async () => {
  await act(async () => {
    await flushPromises();
  });
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

const fireChange = (el, value) => {
  el.value = value;
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const OPTIONS = getLanguageOptions();
const FALLBACK = getDefaultTargetLanguage();

const vm = (overrides) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({ targetLanguage: "zh-CN" }),
    can: Object.freeze({ changeLanguage: true }),
    blockedBy: null,
    error: null,
    ...overrides,
  });

describe("PageLanguageControl unit (MVP-20)", () => {
  it("selects the current target language from the injected options", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageLanguageControl
          viewModel={vm()}
          options={OPTIONS}
          fallbackValue={FALLBACK}
        />
      </ModeProvider>
    );
    const select = container.querySelector("select");
    expect(select.value).toBe("zh-CN");
    expect(select.querySelectorAll("option").length).toBe(OPTIONS.length);
    unmount();
  });

  it("falls back on unknown stored codes and surfaces the raw value", () => {
    const onSetTargetLanguage = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <PageLanguageControl
          viewModel={vm({ data: Object.freeze({ targetLanguage: "xx-Nope" }) })}
          options={OPTIONS}
          fallbackValue={FALLBACK}
        />
      </ModeProvider>
    );
    expect(container.querySelector("select").value).toBe(FALLBACK);
    const status = container.querySelector('[role="status"]');
    expect(status.textContent).toContain("xx-Nope");
    unmount();
    void onSetTargetLanguage;
  });

  it("reports changes and disables with can", () => {
    const onSetTargetLanguage = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <PageLanguageControl
          viewModel={vm()}
          options={OPTIONS}
          fallbackValue={FALLBACK}
          onSetTargetLanguage={onSetTargetLanguage}
        />
      </ModeProvider>
    );
    fireChange(container.querySelector("select"), "ja");
    expect(onSetTargetLanguage).toHaveBeenCalledWith("ja");

    const { container: c2, unmount: u2 } = render(
      <ModeProvider>
        <PageLanguageControl
          viewModel={vm({ can: Object.freeze({ changeLanguage: false }) })}
          options={OPTIONS}
          fallbackValue={FALLBACK}
        />
      </ModeProvider>
    );
    expect(c2.querySelector("select").disabled).toBe(true);
    unmount();
    u2();
  });
});

describe("PageLanguageControl integration (MVP-20)", () => {
  const makeContentScriptTransport = (rule, setting) => {
    const t = {
      sent: [],
      rule,
      setting,
      sendAction: async (action, args) => {
        t.sent.push([action, args]);
        if (action === MSG_TRANS_GETRULE) {
          return { rule: t.rule, setting: t.setting };
        }
        if (action === MSG_TRANS_PUTRULE) {
          t.rule = { ...t.rule, ...args };
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
      <PageSurface
        viewModel={view}
        actions={controller.actions}
        languageOptions={OPTIONS}
        languageFallback={FALLBACK}
      />
    );
  };

  it("writes through KCL and persists across a popup reopen", async () => {
    const t = makeContentScriptTransport(
      { transOpen: "false", toLang: "zh-CN" },
      {}
    );
    const first = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    const { container, unmount } = render(<Harness controller={first} />);
    await flushInAct();

    fireChange(
      container.querySelector('[aria-label="Target language"]'),
      "ja"
    );
    await flushInAct();
    expect(t.sent).toContainEqual([MSG_TRANS_PUTRULE, { toLang: "ja" }]);
    first.dispose();
    unmount();

    const second = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    await flushInAct();
    expect(second.getView().data.targetLanguage).toBe("ja");
    second.dispose();
  });

  it("is a no-op on blocked sites and keeps the view on failure", async () => {
    const t = makeContentScriptTransport(
      { transOpen: "false" },
      { blacklist: "example.com" }
    );
    const blocked = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    await flushInAct();
    await blocked.actions.setTargetLanguage("ja");
    expect(
      t.sent.find(([action]) => action === MSG_TRANS_PUTRULE)
    ).toBeUndefined();
    blocked.dispose();

    let fail = false;
    const failing = {
      sendAction: async (action, args) => {
        if (action === MSG_TRANS_PUTRULE && fail) {
          return { error: "rejected" };
        }
        return t.sendAction(action, args);
      },
    };
    const controller = createPageController({
      sendAction: failing.sendAction,
      href: "https://example.org/",
    });
    await flushInAct();
    const before = controller.getView().data.targetLanguage;
    fail = true;
    await controller.actions.setTargetLanguage("ja");
    expect(controller.getView().data.targetLanguage).toBe(before);
    expect(controller.getView().status).toBe("idle");
    controller.dispose();
  });
});
