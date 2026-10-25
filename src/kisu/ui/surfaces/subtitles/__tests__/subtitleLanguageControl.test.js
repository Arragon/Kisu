// SubtitleLanguageControl 测试（MVP-42 / INH-1183）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SubtitleLanguageControl } from "../SubtitleLanguageControl";
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
  { value: "zh-CN", label: "Chinese" },
  { value: "ja", label: "Japanese" },
];
const FALLBACK = "zh-CN";

const vm = ({ targetLanguage = "zh-CN", canChange = true } = {}) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({ targetLanguage }),
    can: Object.freeze({ changeLanguage: canChange }),
    blockedBy: null,
    error: null,
  });

const mount = (viewModel, onSetTargetLanguage) =>
  render(
    <ModeProvider>
      <SubtitleLanguageControl
        viewModel={viewModel}
        options={OPTIONS}
        fallbackValue={FALLBACK}
        onSetTargetLanguage={onSetTargetLanguage}
      />
    </ModeProvider>
  );

describe("SubtitleLanguageControl (MVP-42)", () => {
  it("selects the current target language", () => {
    const { container, unmount } = mount(vm());
    expect(container.querySelector("select").value).toBe("zh-CN");
    unmount();
  });

  it("falls back on unknown codes with a notice", () => {
    const onSetTargetLanguage = jest.fn();
    const { container, unmount } = mount(
      vm({ targetLanguage: "xx-Nope" }),
      onSetTargetLanguage
    );
    expect(container.querySelector("select").value).toBe(FALLBACK);
    expect(
      container.querySelector('[data-testid="kisu-subtitle-language"] [role="status"]')
        .textContent
    ).toContain("xx-Nope");
    unmount();
  });

  it("reports changes, shows the next-load notice, disables with can", () => {
    const onSetTargetLanguage = jest.fn();
    const { container, unmount } = mount(vm(), onSetTargetLanguage);
    fireChange(container.querySelector("select"), "ja");
    expect(onSetTargetLanguage).toHaveBeenCalledWith("ja");
    const statuses = [...container.querySelectorAll('[role="status"]')].map((s) =>
      s.textContent
    );
    expect(statuses.some((t) => t.includes("next video"))).toBe(true);
    unmount();

    const { container: c2, unmount: u2 } = mount(vm({ canChange: false }));
    expect(c2.querySelector("select").disabled).toBe(true);
    u2();
  });

  it("renders nothing without data", () => {
    const { container, unmount } = mount(
      vm({ targetLanguage: undefined }) && {
        status: "loading",
        data: null,
        can: Object.freeze({}),
        blockedBy: null,
        error: null,
      }
    );
    expect(container.querySelector('[data-testid="kisu-subtitle-language"]')).toBeNull();
    unmount();
  });
});
