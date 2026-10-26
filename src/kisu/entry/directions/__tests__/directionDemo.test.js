// DirectionDemo 测试（DES-01 执行 / M1）。
// 验收：四方向可切换且 primitives 实际取到方向色板、dark 切换生效、
// 切换不改变功能语义（同一组按钮/状态槽位）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DirectionDemo } from "../DirectionDemo";
import { DESIGN_DIRECTIONS } from "../../../ui/tokens/directions";
import { getColorPalette } from "../../../ui/tokens/tokens";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const toRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const render = (ui) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(ui));
  return {
    host,
    unmount: () => act(() => root.unmount()),
  };
};

const fireClick = (el) =>
  act(() => {
    el.click();
  });

const buttonByText = (host, text) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === text);

const surfaceOf = (host, id) =>
  host.querySelector(`[data-testid="kisu-direction-surface-${id}"]`);

describe("DirectionDemo (DES-01 execution)", () => {
  it("renders all four direction switcher buttons", () => {
    const { host, unmount } = render(<DirectionDemo />);
    DESIGN_DIRECTIONS.forEach((d) => {
      expect(host.querySelector(`[data-testid="kisu-direction-${d.id}"]`)).not.toBeNull();
    });
    unmount();
  });

  it.each(
    DESIGN_DIRECTIONS.map((d) => [d.id, d])
  )("%s: switching applies its palette to the primitives", (id, direction) => {
    const { host, unmount } = render(<DirectionDemo />);
    fireClick(host.querySelector(`[data-testid="kisu-direction-${id}"]`));
    const surface = surfaceOf(host, id);
    expect(surface).not.toBeNull();
    expect(surface.style.backgroundColor).toBe(
      toRgb(direction.tokens.color.light.bg.default)
    );
    const primary = [...surface.querySelectorAll("button")].find(
      (b) => b.textContent === "Primary"
    );
    expect(primary.style.backgroundColor).toBe(
      toRgb(direction.tokens.color.light.action.primary)
    );
    unmount();
  });

  it("dark toggle flips the palette within the chosen direction", () => {
    const aurora = DESIGN_DIRECTIONS.find((d) => d.id === "aurora");
    const { host, unmount } = render(<DirectionDemo />);
    fireClick(host.querySelector('[data-testid="kisu-direction-dark-toggle"]'));
    const surface = surfaceOf(host, "aurora");
    expect(surface.style.backgroundColor).toBe(
      toRgb(aurora.tokens.color.dark.bg.default)
    );
    unmount();
  });

  it("functional slice is identical across directions (same slots, semantics unchanged)", () => {
    DESIGN_DIRECTIONS.forEach((d) => {
      const { host, unmount } = render(<DirectionDemo initialDirectionId={d.id} />);
      ["Primary", "Secondary", "info", "success", "warning", "error"].forEach((label) => {
        expect(
          [...host.querySelectorAll("button, span")].some((el) => el.textContent === label)
        ).toBe(true);
      });
      unmount();
    });
  });
});
