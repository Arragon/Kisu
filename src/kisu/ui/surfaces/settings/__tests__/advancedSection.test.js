// AdvancedSection 测试（MVP-53 / INH-1194）。
// 验收：可达性契约（projection map §8 点名字段逐一在清单）、导航契约、
// 无回调时按钮禁用（可达性不因缺回调丢失——入口在，动作待接线）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AdvancedSection, LEGACY_CAPABILITIES } from "../AdvancedSection";
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

describe("AdvancedSection (MVP-53)", () => {
  it("reachability contract: every projection-map §8 capability is listed", () => {
    const text = LEGACY_CAPABILITIES.join("\n");
    [
      "minLength",
      "httpTimeout",
      "clearCache",
      "injectRules",
      "csplist",
      "orilist",
      "skipLangs",
      "translateVariants",
      "langDetector",
      "mouseHoverSetting",
      "inputRule",
      "touchModes",
      "contextMenuType",
      "fabClickAction",
      "rootMargin",
      "customStyles",
      "subrulesList",
      "prompts",
      "logLevel",
    ].forEach((key) => {
      expect(text).toContain(key.split(" ")[0]);
    });
  });

  it("forwards the legacy navigation contract", () => {
    const onOpenLegacy = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <AdvancedSection onOpenLegacy={onOpenLegacy} />
      </ModeProvider>
    );
    const button = container.querySelector('[data-testid="kisu-advanced-open-legacy"]');
    expect(button.disabled).toBe(false);
    fireClick(button);
    expect(onOpenLegacy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("keeps the entry visible but inert without a callback (reachability preserved)", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <AdvancedSection />
      </ModeProvider>
    );
    const button = container.querySelector('[data-testid="kisu-advanced-open-legacy"]');
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(true);
    expect(
      container.querySelector('[data-testid="kisu-advanced-capabilities"]').children.length
    ).toBe(LEGACY_CAPABILITIES.length);
    unmount();
  });
});
