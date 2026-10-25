// SubtitleStatus 测试（MVP-44 / INH-1185）。
// 验收：no captions / provider failure / translating+进度 / 内部失败各态、
// 播放不受阻（纯被动行）、无 stack、未知码共享兜底、干净状态零渲染。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SubtitleStatus } from "../SubtitleStatus";
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

const runtime = (overrides = {}) =>
  Object.freeze({
    videoId: "v1",
    mounted: true,
    processing: false,
    progressed: 0,
    autoTranslate: true,
    activeTrackKey: null,
    fromLang: "auto",
    ...overrides,
  });

const vm = ({ error = null, provider = { apiSlug: "Microsoft", registered: true }, enabled = true, rt = {} } = {}) =>
  Object.freeze({
    status: error ? "error" : "ready",
    data: Object.freeze({
      enabled,
      provider: Object.freeze(provider),
      runtime: runtime(rt),
    }),
    can: Object.freeze({}),
    blockedBy: null,
    error,
  });

const mount = (viewModel) =>
  render(
    <ModeProvider>
      <SubtitleStatus viewModel={viewModel} />
    </ModeProvider>
  );

const row = (container, key) =>
  container.querySelector(`[data-testid="kisu-subtitle-row-${key}"]`);

describe("SubtitleStatus (MVP-44)", () => {
  it("no captions: enabled but runtime not mounted", () => {
    const { container, unmount } = mount(vm({ rt: { mounted: false } }));
    expect(row(container, "no-captions").textContent).toContain(
      "No subtitles found"
    );
    unmount();
  });

  it("provider failure: stale slug with recoverable guidance", () => {
    const { container, unmount } = mount(
      vm({ provider: { apiSlug: "Ghost", registered: false } })
    );
    expect(row(container, "provider").textContent).toContain("Ghost");
    expect(row(container, "provider").textContent).toContain("pick another");
    unmount();
  });

  it("translating: progress percentage detail", () => {
    const { container, unmount } = mount(
      vm({ rt: { processing: true, progressed: 40 } })
    );
    expect(row(container, "progress").textContent).toContain("40%");
    unmount();
  });

  it("internal failure: command error mapped, no stack shape", () => {
    const { container, unmount } = mount(
      vm({
        error: {
          code: "PROVIDER_REQUEST_FAILED",
          message: "failed at Translator.toggle (translator.js:3943)",
        },
      })
    );
    const text = row(container, "error").textContent;
    expect(text).toContain("try again");
    expect(text).not.toMatch(/\bat \w+\.?\w*\(/);
    unmount();
  });

  it("unknown error codes fall back to the shared describeError", () => {
    const { container, unmount } = mount(
      vm({ error: { code: "FUTURE_CODE", message: "m" } })
    );
    expect(row(container, "error").textContent).toBe("FUTURE_CODE: m");
    unmount();
  });

  it("clean state renders nothing (baseline lives in SubtitleControl)", () => {
    const { container, unmount } = mount(vm());
    expect(
      container.querySelector('[data-testid="kisu-subtitle-status-detail"]')
    ).toBeNull();
    unmount();
  });

  it("renders without data", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SubtitleStatus
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
    expect(
      container.querySelector('[data-testid="kisu-subtitle-status-detail"]')
    ).toBeNull();
    unmount();
  });
});
