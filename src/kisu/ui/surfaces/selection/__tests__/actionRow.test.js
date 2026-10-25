// ActionRow 测试（MVP-32 / INH-1173）。
// 验收：can 驱动零占位、copy 文本按结果类型计算、retry 分流、provider 切换发 slug、
// 凭据不可达。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ActionRow } from "../ActionRow";
import { ModeProvider } from "../../../primitives";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
const fireChange = (el, value) => {
  el.value = value;
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const RESOLVED = Object.freeze([
  Object.freeze({
    apiSlug: "Microsoft",
    name: "Microsoft",
    apiType: "Microsoft",
    usable: true,
    capabilities: Object.freeze({}),
  }),
  Object.freeze({
    apiSlug: "my-ai",
    name: "My AI",
    apiType: "OpenAI",
    usable: true,
    capabilities: Object.freeze({}),
  }),
]);

const vm = ({ can = {}, result, providers } = {}) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({
      text: Object.freeze({ raw: "hello world", kind: "sentence", reason: "default" }),
      providers: Object.freeze({
        resolved: providers === undefined ? RESOLVED : providers,
        missing: Object.freeze([]),
      }),
      result: result ?? null,
    }),
    can: Object.freeze({ translate: true, lookup: false, copy: false, switchProvider: true, ...can }),
    blockedBy: null,
    error: null,
  });

const mount = (viewModel, handlers = {}) =>
  render(
    <ModeProvider>
      <ActionRow
        viewModel={viewModel}
        onCopy={handlers.onCopy}
        onTranslate={handlers.onTranslate}
        onLookup={handlers.onLookup}
        onSetProvider={handlers.onSetProvider}
      />
    </ModeProvider>
  );

const action = (container, key) =>
  container.querySelector(`[data-testid="kisu-action-${key}"]`);

describe("ActionRow (MVP-32)", () => {
  it("shows copy only when ready and passes type-specific text", () => {
    const onCopy = jest.fn();
    const { container, unmount } = mount(
      vm({
        can: { copy: true },
        result: {
          kind: "translate",
          status: "ready",
          payload: { output: "你好，世界" },
        },
      }),
      { onCopy }
    );
    fireClick(action(container, "copy"));
    expect(onCopy).toHaveBeenCalledWith("你好，世界");

    const { container: c2, unmount: u2 } = mount(
      vm({
        textKindOverride: undefined,
        can: { copy: true },
        result: {
          kind: "lookup",
          status: "ready",
          payload: {
            term: "word",
            definitions: [{ pos: "n.", meaning: "单词" }],
            detail: "notes",
          },
        },
      }),
      { onCopy }
    );
    fireClick(action(c2, "copy"));
    expect(onCopy).toHaveBeenLastCalledWith("word\nn. 单词\nnotes");
    u2();
  });

  it("retry routes by presentation type via can", () => {
    const onTranslate = jest.fn();
    const onLookup = jest.fn();
    const { container, unmount } = mount(
      vm({ can: { translate: true }, result: { kind: "translate", status: "ready", payload: { output: "x" } } }),
      { onTranslate, onLookup }
    );
    fireClick(action(container, "retry"));
    expect(onTranslate).toHaveBeenCalledTimes(1);
    unmount();

    const { container: c2, unmount: u2 } = mount(
      vm({
        can: { translate: false, lookup: true },
        result: { kind: "lookup", status: "ready", payload: { word: "w" } },
      }),
      { onTranslate, onLookup }
    );
    fireClick(action(c2, "retry"));
    expect(onLookup).toHaveBeenCalledTimes(1);
    expect(onTranslate).toHaveBeenCalledTimes(1); // 未变
    u2();
  });

  it("provider select lists resolved providers and emits the chosen slug", () => {
    const onSetProvider = jest.fn();
    const { container, unmount } = mount(vm({ can: { switchProvider: true } }), {
      onSetProvider,
    });
    const select = container.querySelector('[aria-label="Result provider"]');
    expect(
      [...select.querySelectorAll("option")].map((o) => o.value)
    ).toEqual(["Microsoft", "my-ai"]);
    fireChange(select, "my-ai");
    expect(onSetProvider).toHaveBeenCalledWith("my-ai");
    unmount();
  });

  it("hides provider select when no resolved providers and hides everything when can forbids", () => {
    const { container, unmount } = mount(
      vm({ can: { switchProvider: true }, providers: Object.freeze([]) })
    );
    expect(container.querySelector('[aria-label="Result provider"]')).toBeNull();
    expect(action(container, "copy")).toBeNull();
    unmount();

    // 错误视图（can 全关、无 result）：零占位
    const { container: c2, unmount: u2 } = mount(
      vm({
        can: { translate: false, lookup: false, copy: false, switchProvider: false },
        providers: Object.freeze([]),
      })
    );
    expect(c2.querySelector('[data-testid="kisu-action-row"]').children).toHaveLength(0);
    u2();
  });

  it("never exposes credential material", () => {
    const { container, unmount } = mount(vm({ can: { copy: true, switchProvider: true } }));
    expect(container.textContent).not.toContain("apiKey");
    unmount();
  });
});
