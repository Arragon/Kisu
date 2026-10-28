// SelectionOverlay 正式构图测试（DES-06 / INH-1207）。
// 验收：Ink 悬浮物规格（Surface bordered 发丝线 + lift low 投影 + md 内边距）、
// kind 分流（lexical/sentence/multiline）、动作行常驻 slot、未知 kind/无数据
// 零渲染；几何/生命周期不动（hostile-page 与 geometry 测试另行守护）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { getColorPalette } from "../../../tokens/tokens";
import { SelectionOverlay } from "../SelectionOverlay";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const palette = getColorPalette("light");

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

const vm = ({ kind, result, can } = {}) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({
      text: Object.freeze({ raw: "a chosen sentence", kind: kind || "lexical" }),
      providers: Object.freeze({
        resolved: Object.freeze([]),
        missing: Object.freeze([]),
      }),
      result: result ?? null,
    }),
    can: Object.freeze({ ...(can || {}) }),
    blockedBy: null,
    error: null,
  });

const lookupReady = {
  kind: "lookup",
  status: "ready",
  payload: { term: "serendipity", definitions: [{ pos: "noun", meaning: "luck" }] },
};

const translateReady = {
  kind: "translate",
  status: "ready",
  payload: { output: "译文在这里" },
};

describe("SelectionOverlay composition (DES-06)", () => {
  it("renders the Ink floating frame around a lexical result", () => {
    const { container, unmount } = render(
      <SelectionOverlay viewModel={vm({ kind: "lexical", result: lookupReady })} />
    );
    const overlay = container.querySelector('[data-testid="kisu-selection-overlay"]');
    expect(overlay).not.toBeNull();
    // 发丝线边框 + 容器圆角 radius.md(4) + 真悬浮物投影 elevation.low
    expect(overlay.style.border).toBe(`1px solid ${palette.border.default}`);
    expect(overlay.style.borderRadius).toBe("4px");
    expect(overlay.style.boxShadow).toBe("0 1px 2px rgba(0, 0, 0, 0.12)");
    expect(overlay.style.padding).toBe("12px"); // space.md
    // 结果 + 动作行常驻 slot
    expect(container.querySelector('[data-testid="kisu-lexical-result"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="kisu-action-row"]')).not.toBeNull();
    unmount();
  });

  it("routes sentence and multiline kinds to the sentence surface", () => {
    const sentence = render(
      <SelectionOverlay viewModel={vm({ kind: "sentence", result: translateReady })} />
    );
    expect(
      sentence.container.querySelector('[data-testid="kisu-sentence-result"]')
    ).not.toBeNull();
    expect(
      sentence.container.querySelector('[data-testid="kisu-lexical-result"]')
    ).toBeNull();
    sentence.unmount();

    const multiline = render(
      <SelectionOverlay viewModel={vm({ kind: "multiline", result: translateReady })} />
    );
    expect(
      multiline.container.querySelector('[data-testid="kisu-sentence-result"]')
    ).not.toBeNull();
    multiline.unmount();
  });

  it("renders nothing for unknown kinds or missing data", () => {
    const unknown = render(
      <SelectionOverlay viewModel={vm({ kind: "unknown" })} />
    );
    expect(unknown.container.querySelector('[data-testid="kisu-selection-overlay"]')).toBeNull();
    unknown.unmount();

    const noData = render(<SelectionOverlay viewModel={{ status: "loading", data: null }} />);
    expect(noData.container.querySelector('[data-testid="kisu-selection-overlay"]')).toBeNull();
    noData.unmount();
  });

  it("passes action callbacks through to the action row", () => {
    const onCopy = jest.fn();
    const { container, unmount } = render(
      <SelectionOverlay
        viewModel={vm({ kind: "lexical", result: lookupReady, can: { copy: true } })}
        actions={{ onCopy }}
      />
    );
    const copy = container.querySelector('[data-testid="kisu-action-copy"]');
    act(() => {
      copy.click();
    });
    expect(onCopy).toHaveBeenCalledTimes(1);
    unmount();
  });
});
