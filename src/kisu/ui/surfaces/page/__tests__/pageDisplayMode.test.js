// PageDisplayMode 测试（MVP-19 / INH-1160）。
// 单元：组合 ↔ 三档产品模式映射、禁用、补丁映射；
// 集成：真实 controller → KCL PUTRULE → 运行态更新 → "重开 Popup 保持"（第二个
// controller 从同一内容脚本状态回读到新模式）。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
} from "../../../../../config/msg";
import { PageSurface } from "../PageSurface";
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

const fireClick = (el) =>
  act(() => {
    el.click();
  });

// 模拟内容脚本：GETRULE 回读 live rule；PUTRULE 把补丁写进 live rule
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

const vm = (overrides) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({
      displayMode: Object.freeze({
        onlyTranslation: false,
        order: "original-first",
      }),
    }),
    can: Object.freeze({ changeDisplayMode: true }),
    blockedBy: null,
    error: null,
    ...overrides,
  });

describe("PageDisplayMode unit (MVP-19)", () => {
  it("maps the composition to the three product modes with selection", () => {
    const cases = [
      [{ onlyTranslation: false, order: "original-first" }, "original-first"],
      [{ onlyTranslation: false, order: "translation-first" }, "translation-first"],
      [{ onlyTranslation: true, order: "translation-first" }, "translated"],
    ];
    cases.forEach(([displayMode, expected]) => {
      const { container, unmount } = render(
        <PageSurfaceLike displayMode={displayMode} />
      );
      const checked = container.querySelector('[aria-checked="true"]');
      expect(checked.textContent).toBe(
        expected === "translated"
          ? "Translated only"
          : expected === "translation-first"
            ? "Bilingual · Translation first"
            : "Bilingual · Original first"
      );
      unmount();
    });
  });

  it("emits KCL patches via onSetDisplayMode", () => {
    const onSetDisplayMode = jest.fn();
    const { container, unmount } = render(
      <PageDisplayModeDirect
        onSetDisplayMode={onSetDisplayMode}
        displayMode={{ onlyTranslation: false, order: "original-first" }}
      />
    );
    fireClick(radioByLabel(container, "Translated only"));
    expect(onSetDisplayMode).toHaveBeenCalledWith({ onlyTranslation: true });
    fireClick(radioByLabel(container, "Bilingual · Translation first"));
    expect(onSetDisplayMode).toHaveBeenCalledWith({
      onlyTranslation: false,
      order: "translation-first",
    });
    unmount();
  });

  it("disables every option when can.changeDisplayMode is false", () => {
    const { container, unmount } = render(
      <PageDisplayModeDirect
        canChange={false}
        displayMode={{ onlyTranslation: false, order: "original-first" }}
      />
    );
    container
      .querySelectorAll('[role="radio"]')
      .forEach((r) => expect(r.disabled).toBe(true));
    unmount();
  });
});

// ---- 测试用的小直连/组合 helper ----
import { PageDisplayMode } from "../PageDisplayMode";
import { ModeProvider } from "../../../primitives";

const PageSurfaceLike = ({ displayMode }) => (
  <ModeProvider>
    <PageDisplayMode viewModel={vm({ data: Object.freeze({ displayMode: Object.freeze(displayMode) }) })} />
  </ModeProvider>
);
const PageDisplayModeDirect = ({ displayMode, canChange = true, onSetDisplayMode }) => (
  <ModeProvider>
    <PageDisplayMode
      viewModel={vm({
        data: Object.freeze({ displayMode: Object.freeze(displayMode) }),
        can: Object.freeze({ changeDisplayMode: canChange }),
      })}
      onSetDisplayMode={onSetDisplayMode}
    />
  </ModeProvider>
);
const radioByLabel = (container, label) =>
  [...container.querySelectorAll('[role="radio"]')].find(
    (r) => r.textContent === label
  );

describe("PageDisplayMode integration: runtime persistence across popup reopen (MVP-19)", () => {
  const Harness = ({ controller }) => {
    const [view, setView] = useState(controller.getView());
    useEffect(() => controller.subscribe(setView), [controller]);
    return <PageSurface viewModel={view} actions={controller.actions} />;
  };

  it("PUTRULE updates the live rule and a second controller reads the new mode", async () => {
    const t = makeContentScriptTransport(
      { transOpen: "true", transOnly: "false", transOrder: "original-first" },
      {}
    );
    const first = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    const { container, unmount } = render(<Harness controller={first} />);
    await flushInAct();

    fireClick(radioByLabel(container, "Translated only"));
    await flushInAct();
    expect(t.sent).toContainEqual([MSG_TRANS_PUTRULE, { transOnly: "true" }]);
    expect(
      container.querySelector('[aria-checked="true"]').textContent
    ).toBe("Translated only");
    first.dispose();
    unmount();

    // 模拟重开 Popup：新 controller 从同一内容脚本状态回读
    const second = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    expect(second.getView().status).toBe("loading");
    await flushInAct();
    expect(second.getView().data.displayMode).toEqual({
      onlyTranslation: true,
      order: "original-first",
    });
    second.dispose();
  });

  it("keeps the previous view when the mode command fails", async () => {
    let failPutRule = false;
    const t = makeContentScriptTransport(
      { transOpen: "true", transOnly: "false", transOrder: "original-first" },
      {}
    );
    const failing = {
      sendAction: async (action, args) => {
        if (action === MSG_TRANS_PUTRULE && failPutRule) {
          return { error: "rejected" };
        }
        return t.sendAction(action, args);
      },
    };
    const controller = createPageController({
      sendAction: failing.sendAction,
      href: "https://example.com/",
    });
    const views = [];
    const off = controller.subscribe((v) => views.push(v));
    await flushInAct();
    const before = controller.getView().data.displayMode;

    failPutRule = true;
    await controller.actions.setDisplayMode({ onlyTranslation: true });
    expect(controller.getView().data.displayMode).toBe(before); // 保留旧视图
    expect(controller.getView().status).toBe("active"); // 未翻入 error

    off();
    controller.dispose();
  });

  it("setDisplayMode is a no-op when can.changeDisplayMode is false", async () => {
    const t = makeContentScriptTransport(
      { transOpen: "false" },
      { blacklist: "example.com" }
    );
    const controller = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    await flushInAct();
    await controller.actions.setDisplayMode({ onlyTranslation: true });
    expect(
      t.sent.find(([action]) => action === MSG_TRANS_PUTRULE)
    ).toBeUndefined();
    controller.dispose();
  });
});
