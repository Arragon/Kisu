// GeneralSection 测试（MVP-60 / INH-1226）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { GeneralSection } from "../GeneralSection";
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

const OPTIONS = [
  { value: "en", label: "English" },
  { value: "zh", label: "简体中文" },
];

const setting = {
  uiLang: "en",
  uiLangRaw: "en",
  darkMode: "auto",
  shortcuts: { toggleTranslate: ["AltLeft", "KeyS"] },
};

describe("GeneralSection (MVP-60)", () => {
  it("renders uiLang select with the injected options and forwards changes", () => {
    const onUpdate = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <GeneralSection setting={setting} uiLangOptions={OPTIONS} onUpdate={onUpdate} />
      </ModeProvider>
    );
    const select = container.querySelector('[aria-label="Interface language"]');
    expect(select.value).toBe("en");
    fireChange(select, "zh");
    expect(onUpdate).toHaveBeenCalledWith({ uiLang: "zh" });
    unmount();
  });

  it("shows the darkMode note and read-only shortcuts", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <GeneralSection setting={setting} uiLangOptions={OPTIONS} />
      </ModeProvider>
    );
    expect(container.textContent).toContain('Theme follows "auto"');
    const list = container.querySelector('[data-testid="kisu-settings-shortcuts"]');
    expect(list.textContent).toContain("toggleTranslate");
    expect(list.textContent).toContain("AltLeft + KeyS");
    unmount();
  });

  it("shows the unknown-code notice and empty shortcuts line", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <GeneralSection
          setting={{ ...setting, uiLang: "en", uiLangRaw: "xx-Nope", shortcuts: {} }}
          uiLangOptions={OPTIONS}
        />
      </ModeProvider>
    );
    expect(container.textContent).toContain("xx-Nope");
    expect(container.textContent).toContain("No shortcuts registered.");
    unmount();
  });

  it("renders nothing without a setting snapshot", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <GeneralSection setting={null} uiLangOptions={OPTIONS} />
      </ModeProvider>
    );
    expect(container.querySelector('[data-testid="kisu-settings-general"]')).toBeNull();
    unmount();
  });
});
