// SubtitleControl 测试（MVP-39 / INH-1180）。
// 验收：disabled 时照常挂载、状态四态、toggle 回调、slot、错误/加载。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SubtitleControl } from "../SubtitleControl";
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

const vm = ({ data, error, status } = {}) =>
  Object.freeze({
    status: status ?? "ready",
    data:
      data === null
        ? null
        : Object.freeze({
            enabled: true,
            displayMode: Object.freeze({ bilingual: true, order: "original-first" }),
            provider: Object.freeze({ apiSlug: "Microsoft", registered: true }),
            targetLanguage: "zh-CN",
            autoTranslate: true,
            segmentation: Object.freeze({}),
            context: Object.freeze({}),
            runtime: Object.freeze({
              videoId: "v1",
              mounted: true,
              autoTranslate: true,
              progressed: 0,
              processing: false,
              activeTrackKey: null,
              fromLang: "auto",
            }),
            ...(data || {}),
          }),
    can: Object.freeze({ setEnabled: true }),
    blockedBy: null,
    error: error ?? null,
  });

const mount = (viewModel, actions = {}, children) =>
  render(
    <ModeProvider>
      <SubtitleControl viewModel={viewModel} actions={actions}>
        {children}
      </SubtitleControl>
    </ModeProvider>
  );

describe("SubtitleControl (MVP-39)", () => {
  it("enabled: shows Disable action and active status", () => {
    const actions = { setEnabled: jest.fn() };
    const { container, unmount } = mount(vm(), actions);
    const toggle = container.querySelector('[data-testid="kisu-subtitle-toggle"]');
    expect(toggle.textContent).toBe("Disable");
    expect(
      container.querySelector('[data-testid="kisu-subtitle-status"]').textContent
    ).toBe("Subtitles active");
    fireClick(toggle);
    expect(actions.setEnabled).toHaveBeenCalledWith(false);
    unmount();
  });

  it("disabled: still mounts with warning status and Enable action", () => {
    const actions = { setEnabled: jest.fn() };
    const { container, unmount } = mount(
      vm({ data: { enabled: false, runtime: { videoId: "v1", mounted: false, processing: false, progressed: 0, autoTranslate: true, activeTrackKey: null, fromLang: "auto" } } }),
      actions
    );
    expect(
      container.querySelector('[data-testid="kisu-subtitle-control"]')
    ).not.toBeNull(); // disabled 也挂载
    expect(
      container.querySelector('[data-testid="kisu-subtitle-status"]').textContent
    ).toBe("Subtitles are disabled");
    const toggle = container.querySelector('[data-testid="kisu-subtitle-toggle"]');
    expect(toggle.textContent).toBe("Enable");
    fireClick(toggle);
    expect(actions.setEnabled).toHaveBeenCalledWith(true);
    unmount();
  });

  it("translating status from the runtime snapshot", () => {
    const { container, unmount } = mount(
      vm({ data: { runtime: { videoId: "v1", mounted: true, processing: true, progressed: 40, autoTranslate: true, activeTrackKey: null, fromLang: "auto" } } })
    );
    expect(
      container.querySelector('[data-testid="kisu-subtitle-status"]').textContent
    ).toBe("Translating subtitles…");
    unmount();
  });

  it("no-subtitles state when runtime not mounted", () => {
    const { container, unmount } = mount(
      vm({ data: { runtime: { videoId: null, mounted: false, processing: false, progressed: 0, autoTranslate: true, activeTrackKey: null, fromLang: "auto" } } })
    );
    expect(
      container.querySelector('[data-testid="kisu-subtitle-status"]').textContent
    ).toBe("No subtitles on this video yet");
    unmount();
  });

  it("renders children slots and loading/error placeholders", () => {
    const { container, unmount } = mount(
      vm(),
      {},
      <span data-testid="kisu-slot-child">slot</span>
    );
    expect(container.querySelector('[data-testid="kisu-slot-child"]')).not.toBeNull();
    unmount();

    const { container: c2, unmount: u2 } = mount(vm({ data: null, status: "loading" }));
    expect(c2.querySelector('[data-testid="kisu-subtitle-loading"]')).not.toBeNull();
    u2();

    const { container: c3, unmount: u3 } = mount(
      vm({ data: null, status: "error", error: { code: "X", message: "boom" } })
    );
    expect(c3.querySelector('[data-testid="kisu-subtitle-error"]').textContent).toContain(
      "boom"
    );
    u3();
  });
});
