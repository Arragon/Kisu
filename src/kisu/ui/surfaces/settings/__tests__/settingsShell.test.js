// SettingsShell 测试（MVP-48 / INH-1189）。
// 验收：九 section 注册表、导航切换、roving tabindex 键盘、Advanced legacy 入口、
// 未知 section 过滤。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SettingsShell } from "../SettingsShell";
import { SETTINGS_SECTION_IDS, sectionLabel } from "../sections";
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

const fireKey = (el, key) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
const fireClick = (el) =>
  act(() => {
    el.click();
  });

const makeSections = () =>
  SETTINGS_SECTION_IDS.map((id) => ({
    id,
    content: <span data-testid={`content-${id}`}>{id} content</span>,
  }));

const navButtons = (container) =>
  [...container.querySelectorAll("nav button")];

describe("sections registry (MVP-48)", () => {
  it("freezes the nine sections from the projection map", () => {
    expect(SETTINGS_SECTION_IDS).toEqual([
      "general",
      "services",
      "page",
      "selection",
      "youtube",
      "appearance",
      "sites",
      "advanced",
      "about",
    ]);
    expect(sectionLabel("services")).toBe("Translation Services");
  });
});

describe("SettingsShell (MVP-48)", () => {
  it("renders all nine nav items with General active by default", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SettingsShell sections={makeSections()} />
      </ModeProvider>
    );
    expect(navButtons(container)).toHaveLength(9);
    expect(navButtons(container)[0].getAttribute("aria-current")).toBe("true");
    expect(
      container.querySelector('[data-testid="content-general"]')
    ).not.toBeNull();
    unmount();
  });

  it("switches content on click", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SettingsShell sections={makeSections()} />
      </ModeProvider>
    );
    fireClick(navButtons(container)[2]); // Page
    expect(
      container.querySelector('[data-testid="content-page"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="content-general"]')).toBeNull();
    unmount();
  });

  it("arrow keys move selection and focus (roving tabindex)", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SettingsShell sections={makeSections()} />
      </ModeProvider>
    );
    const first = navButtons(container)[0];
    expect(first.tabIndex).toBe(0);
    fireKey(first, "ArrowDown");
    const second = navButtons(container)[1];
    expect(second.getAttribute("aria-current")).toBe("true");
    expect(document.activeElement).toBe(second);
    expect(second.tabIndex).toBe(0);
    expect(first.tabIndex).toBe(-1);
    fireKey(second, "ArrowUp");
    expect(navButtons(container)[0].getAttribute("aria-current")).toBe("true");
    unmount();
  });

  it("Advanced section shows the legacy entry and forwards clicks", () => {
    const onOpenLegacy = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <SettingsShell sections={makeSections()} onOpenLegacy={onOpenLegacy} />
      </ModeProvider>
    );
    fireClick(navButtons(container).find((b) => b.textContent === "Advanced"));
    const legacy = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("legacy")
    );
    expect(legacy).toBeTruthy();
    fireClick(legacy);
    expect(onOpenLegacy).toHaveBeenCalledTimes(1);
    // 非 Advanced section 无 legacy 按钮
    fireClick(navButtons(container).find((b) => b.textContent === "General"));
    expect(
      [...container.querySelectorAll("button")].some((b) =>
        b.textContent.includes("legacy")
      )
    ).toBe(false);
    unmount();
  });

  it("filters unknown section ids", () => {
    const sections = [
      ...makeSections(),
      { id: "mystery", content: <span>mystery</span> },
    ];
    const { container, unmount } = render(
      <ModeProvider>
        <SettingsShell sections={sections} />
      </ModeProvider>
    );
    expect(navButtons(container)).toHaveLength(9);
    expect(container.textContent).not.toContain("mystery content");
    unmount();
  });
});
