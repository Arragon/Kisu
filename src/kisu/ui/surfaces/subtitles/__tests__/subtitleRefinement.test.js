// Subtitle 控件 Ink 视觉收敛测试（DES-07 / INH-1208）。
// 验收：播放器内紧凑档（toggle xs/sm 内边距）、长反馈文案可换行（不遮挡播放器）、
// context capability 原因 verbatim 真实呈现；SPA lifecycle / subtitle 语义
// 不经此处改动（MVP-39..44 各自测试守护）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SubtitleControl } from "../SubtitleControl";
import { SubtitleContextControl } from "../SubtitleContextControl";
import { SubtitleProviderPicker } from "../SubtitleProviderPicker";
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

const baseRuntime = Object.freeze({
  videoId: "v1",
  mounted: true,
  autoTranslate: true,
  progressed: 0,
  processing: false,
  activeTrackKey: null,
  fromLang: "auto",
});

const controlVm = (overrides = {}) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({
      enabled: true,
      displayMode: Object.freeze({ bilingual: true, order: "original-first" }),
      provider: Object.freeze({ apiSlug: "Microsoft", registered: true }),
      targetLanguage: "zh-CN",
      context: Object.freeze({}),
      providers: Object.freeze([]),
      runtime: baseRuntime,
      ...overrides,
    }),
    can: Object.freeze({ setEnabled: true, changeContext: true, changeProvider: true }),
    blockedBy: null,
    error: null,
  });

const LONG_TEXT =
  "An Extremely Long Feedback Sentence Repeated To Prove Wrapping Behaviour Inside The Player Panel Without Horizontal Overflow";

describe("Subtitle panel compactness (DES-07)", () => {
  it("uses the compact player-panel padding on the enable toggle", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SubtitleControl viewModel={controlVm()} actions={{ setEnabled: () => {} }} />
      </ModeProvider>
    );
    const toggle = container.querySelector('[data-testid="kisu-subtitle-toggle"]');
    expect(toggle.style.padding).toBe("4px 8px"); // space.xs / space.sm
    expect(toggle.textContent).toBe("Disable");
    unmount();
  });
});

describe("Subtitle feedback wrapping (DES-07)", () => {
  it("wraps long panel errors instead of covering the player", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SubtitleControl
          viewModel={Object.freeze({
            ...controlVm(),
            status: "error",
            data: null,
            error: Object.freeze({ code: "TRANSPORT_UNAVAILABLE", message: LONG_TEXT }),
          })}
        />
      </ModeProvider>
    );
    const error = container.querySelector('[data-testid="kisu-subtitle-error"]');
    expect(error.textContent).toContain(LONG_TEXT); // 归一化 message verbatim
    expect(error.style.overflowWrap).toBe("anywhere");
    unmount();
  });

  it("wraps provider-invalidated warnings", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SubtitleProviderPicker
          viewModel={controlVm({
            provider: Object.freeze({ apiSlug: LONG_TEXT, registered: false }),
          })}
          onSetProvider={() => {}}
        />
      </ModeProvider>
    );
    const warning = [...container.querySelectorAll('[role="status"]')].find((el) =>
      el.textContent.includes("no longer available")
    );
    expect(warning.style.overflowWrap).toBe("anywhere");
    unmount();
  });

  it("wraps every SubtitleStatus detail row", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SubtitleStatus
          viewModel={controlVm({
            runtime: Object.freeze({ ...baseRuntime, mounted: false }),
          })}
        />
      </ModeProvider>
    );
    const row = container.querySelector('[data-testid="kisu-subtitle-row-no-captions"]');
    expect(row).not.toBeNull();
    expect(row.style.overflowWrap).toBe("anywhere");
    unmount();
  });
});

describe("Context capability realism (DES-07)", () => {
  it("still presents the capability reason verbatim and wraps it", () => {
    const reason = `${LONG_TEXT} — incompatible with the current player frame`;
    const { container, unmount } = render(
      <ModeProvider>
        <SubtitleContextControl
          viewModel={controlVm({
            context: Object.freeze({
              slug: "-",
              capability: Object.freeze({ supported: false, reason }),
            }),
          })}
          onSetContextMode={() => {}}
        />
      </ModeProvider>
    );
    const reasonRow = container.querySelector(
      '[data-testid="kisu-subtitle-context-reason"]'
    );
    expect(reasonRow.textContent).toBe(reason); // 不改写、不猜测（#9 真实性）
    expect(reasonRow.style.overflowWrap).toBe("anywhere");
    unmount();
  });
});
