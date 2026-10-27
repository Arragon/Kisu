// SubtitleModeControl 测试（MVP-40 / INH-1181）。
// 验收：组合↔三档映射、补丁映射、next-load 明示、can 禁用。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SubtitleModeControl } from "../SubtitleModeControl";
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

const vm = ({ displayMode = { bilingual: true, order: "original-first" }, canChange = true } = {}) =>
  Object.freeze({
    status: "ready",
    data: Object.freeze({
      displayMode: Object.freeze(displayMode),
    }),
    can: Object.freeze({ changeDisplayMode: canChange }),
    blockedBy: null,
    error: null,
  });

const mount = (viewModel, onSetDisplayMode) =>
  render(
    <ModeProvider>
      <SubtitleModeControl viewModel={viewModel} onSetDisplayMode={onSetDisplayMode} />
    </ModeProvider>
  );

const radioByLabel = (container, label) =>
  [...container.querySelectorAll('[role="radio"]')].find((r) => r.textContent === label);

describe("SubtitleModeControl (MVP-40)", () => {
  it.each([
    [{ bilingual: true, order: "original-first" }, "Bilingual · Original first"],
    [{ bilingual: true, order: "translation-first" }, "Bilingual · Translation first"],
    [{ bilingual: false, order: "translation-first" }, "Translated only"],
  ])("selects the option matching %j", (displayMode, label) => {
    const { container, unmount } = mount(vm({ displayMode }));
    expect(radioByLabel(container, label).getAttribute("aria-checked")).toBe("true");
    unmount();
  });

  it("emits the frozen KCL patches from subtitle-modes.md", () => {
    const onSetDisplayMode = jest.fn();
    const { container, unmount } = mount(vm(), onSetDisplayMode);
    fireClick(radioByLabel(container, "Translated only"));
    expect(onSetDisplayMode).toHaveBeenCalledWith({ bilingual: false });
    fireClick(radioByLabel(container, "Bilingual · Translation first"));
    expect(onSetDisplayMode).toHaveBeenCalledWith({
      bilingual: true,
      order: "translation-first",
    });
    unmount();
  });

  it("shows the next-load notice", () => {
    const { container, unmount } = mount(vm());
    expect(
      container.querySelector('[role="status"]').textContent
    ).toContain("next video");
    unmount();
  });

  it("disables every option when can.changeDisplayMode is false", () => {
    const onSetDisplayMode = jest.fn();
    const { container, unmount } = mount(vm({ canChange: false }), onSetDisplayMode);
    container
      .querySelectorAll('[role="radio"]')
      .forEach((r) => expect(r.disabled).toBe(true));
    fireClick(radioByLabel(container, "Translated only"));
    expect(onSetDisplayMode).not.toHaveBeenCalled();
    unmount();
  });

  it("renders nothing without data", () => {
    const { container, unmount } = mount(vm({ displayMode: undefined }) && {
      status: "loading",
      data: null,
      can: Object.freeze({}),
      blockedBy: null,
      error: null,
    });
    expect(container.querySelector('[data-testid="kisu-subtitle-mode"]')).toBeNull();
    unmount();
  });
});
