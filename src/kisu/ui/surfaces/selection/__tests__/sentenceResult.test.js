// SentenceResult 测试（MVP-31 / INH-1172）。
// 验收：译文优先原文次级、streaming 有界区域（loading 分块不跳动）、
// 错误呈现、仅 sentence/multiline 挂载。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SentenceResult } from "../SentenceResult";
import { ModeProvider } from "../../../primitives";
import { getColorPalette } from "../../../tokens/tokens";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const light = getColorPalette("light");
const toRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
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

const vm = ({ kind = "sentence", data, error, status } = {}) =>
  Object.freeze({
    status: status ?? "ready",
    data: Object.freeze({
      text: Object.freeze({
        raw: "The quick brown fox jumps over the lazy dog.",
        kind,
        reason: "default",
      }),
      providers: Object.freeze({
        resolved: Object.freeze([]),
        missing: Object.freeze([]),
      }),
      result: null,
      ...(data || {}),
    }),
    can: Object.freeze({}),
    blockedBy: null,
    error: error ?? null,
  });

const mount = (viewModel) =>
  render(
    <ModeProvider>
      <SentenceResult viewModel={viewModel} />
    </ModeProvider>
  );

describe("SentenceResult (MVP-31)", () => {
  it("renders output first, original secondary", () => {
    const { container, unmount } = mount(
      vm({
        data: {
          result: { kind: "translate", status: "ready", payload: { output: "敏捷的棕色狐狸跳过了懒狗。" } },
        },
      })
    );
    const result = container.querySelector('[data-testid="kisu-sentence-result"]');
    const output = container.querySelector('[data-testid="kisu-sentence-output"]');
    const original = container.querySelector('[data-testid="kisu-sentence-original"]');
    expect(output.textContent).toBe("敏捷的棕色狐狸跳过了懒狗。");
    expect(original.textContent).toContain("quick brown fox");
    // 译文在原文之前（译文优先）
    expect(result.textContent.indexOf("敏捷的棕色狐狸")).toBeLessThan(
      result.textContent.indexOf("quick brown fox")
    );
    // 原文次级：次级文字色
    expect(original.style.color).toBe(toRgb(light.text.secondary));
    unmount();
  });

  it("streams partial text inside a bounded region during loading", () => {
    const { container, unmount } = mount(
      vm({
        status: "loading",
        data: {
          result: {
            kind: "translate",
            status: "loading",
            payload: { partial: "敏捷的棕色狐" },
          },
        },
      })
    );
    const region = container.querySelector('[data-testid="kisu-sentence-loading"] > div');
    expect(region.textContent).toBe("敏捷的棕色狐");
    // 有界：固定 max-height + 滚动，内容增长不顶开容器
    expect(region.style.overflowY).toBe("auto");
    expect(region.style.maxHeight).not.toBe("");
    expect(container.textContent).toContain("Translating…");
    unmount();
  });

  it("loading without partial shows the placeholder only", () => {
    const { container, unmount } = mount(
      vm({
        status: "loading",
        data: { result: { kind: "translate", status: "loading", payload: null } },
      })
    );
    expect(container.textContent).toContain("Translating…");
    unmount();
  });

  it("renders the shared error hint", () => {
    const { container, unmount } = mount(
      vm({ error: { code: "PROVIDER_REQUEST_FAILED", message: "rate limited" } })
    );
    expect(
      container.querySelector('[data-testid="kisu-sentence-error"]').textContent
    ).toContain("rate limited");
    unmount();
  });

  it("renders nothing for lexical kinds or missing data", () => {
    const { container, unmount } = mount(
      vm({ kind: "lexical" })
    );
    expect(container.querySelector('[data-testid="kisu-sentence-result"]')).toBeNull();
    unmount();

    const { container: c2, unmount: u2 } = mount(vm({ status: "loading", data: null }));
    expect(c2.querySelector('[data-testid="kisu-sentence-result"]')).toBeNull();
    u2();
  });
});
