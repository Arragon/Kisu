// SubtitleProviderPicker 测试（MVP-41 / INH-1182）。
// 验收：registry 名称选项、失效回退 + warning、next-load 明示、can 禁用、凭据不可达。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SubtitleProviderPicker } from "../SubtitleProviderPicker";
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
  Object.freeze({
    apiSlug: "broken",
    name: "Broken",
    apiType: "NotAnEngine",
    usable: false,
    capabilities: Object.freeze({}),
  }),
]);

const vm = ({
  provider = { apiSlug: "Microsoft", registered: true },
  canChange = true,
  providers = PROVIDERS,
} = {}) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({
      provider: Object.freeze(provider),
      providers,
    }),
    can: Object.freeze({ changeProvider: canChange }),
    blockedBy: null,
    error: null,
  });

const mount = (viewModel, onSetProvider) =>
  render(
    <ModeProvider>
      <SubtitleProviderPicker viewModel={viewModel} onSetProvider={onSetProvider} />
    </ModeProvider>
  );

describe("SubtitleProviderPicker (MVP-41)", () => {
  it("lists usable providers only and selects the current one", () => {
    const { container, unmount } = mount(vm());
    const select = container.querySelector("select");
    expect([...select.querySelectorAll("option")].map((o) => o.value)).toEqual([
      "Microsoft",
      "my-ai",
    ]);
    expect(select.value).toBe("Microsoft");
    unmount();
  });

  it("shows a recoverable state for a stale provider with fallback selection", () => {
    const { container, unmount } = mount(
      vm({ provider: { apiSlug: "Ghost", registered: false } })
    );
    const status = container.querySelector('[data-testid="kisu-subtitle-provider"] > [role="status"]');
    expect(status.textContent).toContain("Ghost");
    expect(status.textContent).toContain("no longer available");
    expect(container.querySelector("select").value).toBe("Microsoft");
    unmount();
  });

  it("emits the chosen slug and shows the next-load notice", () => {
    const onSetProvider = jest.fn();
    const { container, unmount } = mount(vm(), onSetProvider);
    fireChange(container.querySelector("select"), "my-ai");
    expect(onSetProvider).toHaveBeenCalledWith("my-ai");
    const statuses = [...container.querySelectorAll('[role="status"]')].map((s) =>
      s.textContent
    );
    expect(statuses.some((t) => t.includes("next video"))).toBe(true);
    unmount();
  });

  it("disables with can and hides select without usable providers", () => {
    const { container, unmount } = mount(vm({ canChange: false }));
    expect(container.querySelector("select").disabled).toBe(true);
    unmount();

    const { container: c2, unmount: u2 } = mount(
      vm({ providers: Object.freeze([PROVIDERS[2]]) })
    );
    expect(c2.querySelector("select").disabled).toBe(true);
    u2();
  });

  it("never exposes credential material", () => {
    const { container, unmount } = mount(vm());
    expect(container.textContent).not.toContain("apiKey");
    unmount();
  });
});
