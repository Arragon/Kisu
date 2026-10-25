// PopupShell 测试（MVP-16 / INH-1157）。
// 验收：承载 Page view-model 全部状态；light/dark；键盘 focus；状态占位；
// 只依赖 primitives/tokens（视觉推翻不触碰 controller/KCL）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import fs from "fs";
import path from "path";
import { getColorPalette } from "../../../tokens/tokens";
import { PopupShell } from "../PopupShell";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const fireClick = (el) =>
  act(() => {
    el.click();
  });

const vm = (overrides) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({}),
    can: Object.freeze({}),
    blockedBy: null,
    error: null,
    ...overrides,
  });

describe("PopupShell state slots (MVP-16)", () => {
  it("renders children for idle and active states", () => {
    const { container, unmount } = render(
      <PopupShell title="Kisu" viewModel={vm({ status: "idle" })}>
        <button type="button">page controls</button>
      </PopupShell>
    );
    expect(container.textContent).toContain("page controls");

    const { container: c2, unmount: u2 } = render(
      <PopupShell title="Kisu" viewModel={vm({ status: "active" })}>
        <button type="button">stop</button>
      </PopupShell>
    );
    expect(c2.textContent).toContain("stop");
    unmount();
    u2();
  });

  it("shows a loading placeholder instead of children", () => {
    const { container, unmount } = render(
      <PopupShell title="Kisu" viewModel={vm({ status: "loading", data: null })}>
        <button type="button">never</button>
      </PopupShell>
    );
    expect(container.querySelector('[data-testid="kisu-popup-loading"]')).not.toBeNull();
    expect(container.textContent).not.toContain("never");
    unmount();
  });

  it("shows the normalized error (code + message, no stack) for the error state", () => {
    const { container, unmount } = render(
      <PopupShell
        title="Kisu"
        viewModel={vm({
          status: "error",
          data: null,
          error: { code: "TRANSPORT_UNAVAILABLE", message: "no page rule" },
        })}
      >
        <button type="button">never</button>
      </PopupShell>
    );
    const status = container.querySelector('[role="status"]');
    expect(status.textContent).toContain("TRANSPORT_UNAVAILABLE");
    expect(status.textContent).toContain("no page rule");
    expect(container.textContent).not.toContain("never");
    unmount();
  });
});

describe("PopupShell chrome (MVP-16)", () => {
  it("uses the typical extension popup width", () => {
    const { container, unmount } = render(
      <PopupShell title="Kisu" viewModel={vm({})}>
        <span>x</span>
      </PopupShell>
    );
    expect(
      container.querySelector('[data-testid="kisu-popup-shell"]').style.width
    ).toBe("360px");
    unmount();
  });

  it("moves focus into the shell on mount without joining the tab order", () => {
    const { container, unmount } = render(
      <PopupShell title="Kisu" viewModel={vm({})}>
        <span>x</span>
      </PopupShell>
    );
    const frame = container.querySelector('[role="group"]');
    expect(document.activeElement).toBe(frame);
    expect(frame.tabIndex).toBe(-1);
    unmount();
  });

  it("renders an accessible close action when onClose is provided", () => {
    const onClose = jest.fn();
    const { container, unmount } = render(
      <PopupShell title="Kisu" viewModel={vm({})} onClose={onClose}>
        <span>x</span>
      </PopupShell>
    );
    const close = [...container.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Close"
    );
    expect(close).toBeTruthy();
    fireClick(close);
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("resolves dark mode through the palette", () => {
    const dark = getColorPalette("dark");
    const { container, unmount } = render(
      <PopupShell title="Kisu" mode="dark" viewModel={vm({})}>
        <span>x</span>
      </PopupShell>
    );
    expect(
      container.querySelector('[data-testid="kisu-popup-shell"]').style
        .backgroundColor
    ).toBe(toRgb(dark.bg.default));
    unmount();
  });
});

describe("PopupShell dependency boundary (MVP-16)", () => {
  it("imports only react, primitives and tokens — never KCL or product code", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "PopupShell.jsx"),
      "utf8"
    );
    const imports = source.match(/from "([^"]+)"/g) || [];
    expect(imports.length).toBeGreaterThan(0);
    imports.forEach((entry) => {
      expect(entry === 'from "react"' || /^from "\.\.\/\.\.\/(primitives|tokens)/.test(entry)).toBe(true);
    });
  });
});
