// SubtitleContextControl 测试（MVP-43 / INH-1184）。
// 验收：四态门控、Off+AI 选项、slug/- 回调、next-load 明示、无 data 不渲染。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SubtitleContextControl } from "../SubtitleContextControl";
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

const fireChange = (el, value) => {
  el.value = value;
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const PROVIDERS = Object.freeze([
  Object.freeze({
    apiSlug: "Microsoft",
    name: "Microsoft",
    apiType: "Microsoft",
    usable: true,
    capabilities: Object.freeze({ ai: false }),
  }),
  Object.freeze({
    apiSlug: "my-ai",
    name: "My AI",
    apiType: "OpenAI",
    usable: true,
    capabilities: Object.freeze({ ai: true }),
  }),
]);

const vm = ({ slug = "-", supported = true, reason = null, canChange = true } = {}) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({
      context: Object.freeze({
        slug,
        capability: Object.freeze({ id: "subtitle.context", supported, reason }),
      }),
      providers: PROVIDERS,
    }),
    can: Object.freeze({ changeContext: canChange }),
    blockedBy: null,
    error: null,
  });

const mount = (viewModel, onSetContextMode) =>
  render(
    <ModeProvider>
      <SubtitleContextControl
        viewModel={viewModel}
        onSetContextMode={onSetContextMode}
      />
    </ModeProvider>
  );

describe("SubtitleContextControl (MVP-43)", () => {
  it("supported: select shows Off plus AI-only providers with the current slug", () => {
    const { container, unmount } = mount(vm({ slug: "my-ai" }));
    const select = container.querySelector("select");
    expect([...select.querySelectorAll("option")].map((o) => o.value)).toEqual([
      "-",
      "my-ai",
    ]); // 机器翻译 provider 不出现
    expect(select.value).toBe("my-ai");
    expect(select.disabled).toBe(false);
    unmount();
  });

  it("emits the chosen slug and '-' for off", () => {
    const onSetContextMode = jest.fn();
    const { container, unmount } = mount(vm({ slug: "-" }), onSetContextMode);
    fireChange(container.querySelector("select"), "my-ai");
    expect(onSetContextMode).toHaveBeenCalledWith("my-ai");
    fireChange(container.querySelector("select"), "-");
    expect(onSetContextMode).toHaveBeenLastCalledWith("-");
    unmount();
  });

  it.each([
    ["incompatible", "Microsoft", "not an AI engine"],
    ["unregistered", "ghost", "not registered"],
  ])("broken (%s) capability disables the control with the reason", (_name, slug, reasonPart) => {
    const onSetContextMode = jest.fn();
    const { container, unmount } = mount(
      vm({ slug, supported: false, reason: `provider "${slug}" is ${reasonPart}` }),
      onSetContextMode
    );
    expect(container.querySelector("select").disabled).toBe(true);
    expect(
      container.querySelector('[data-testid="kisu-subtitle-context-reason"]').textContent
    ).toContain(reasonPart);
    fireChange(container.querySelector("select"), "my-ai");
    expect(onSetContextMode).not.toHaveBeenCalled();
    unmount();
  });

  it("absent capability stays configurable (that is the point of the control)", () => {
    const onSetContextMode = jest.fn();
    const { container, unmount } = mount(
      vm({ slug: "-", supported: false, reason: 'not configured ("-")' }),
      onSetContextMode
    );
    expect(container.querySelector("select").disabled).toBe(false);
    expect(
      container.querySelector('[data-testid="kisu-subtitle-context-reason"]').textContent
    ).toContain('not configured');
    fireChange(container.querySelector("select"), "my-ai");
    expect(onSetContextMode).toHaveBeenCalledWith("my-ai");
    unmount();
  });

  it("shows the next-load notice", () => {
    const { container, unmount } = mount(vm());
    const statuses = [...container.querySelectorAll('[role="status"]')].map((s) =>
      s.textContent
    );
    expect(statuses.some((t) => t.includes("next video"))).toBe(true);
    unmount();
  });

  it("renders nothing without data", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SubtitleContextControl
          viewModel={Object.freeze({
            status: "loading",
            data: null,
            can: Object.freeze({}),
            blockedBy: null,
            error: null,
          })}
        />
      </ModeProvider>
    );
    expect(container.querySelector('[data-testid="kisu-subtitle-context"]')).toBeNull();
    unmount();
  });
});
