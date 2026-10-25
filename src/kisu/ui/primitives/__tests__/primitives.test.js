// Primitives 契约测试（MVP-14 / INH-1155）。
// 渲染采用上游既有模式（act + createRoot，仓库不引入 @testing-library）。
// 验收：每件有最小测试；light/dark 取值均来自 tokens（断言具体 token 值）；
// 键盘/焦点行为正确。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  IconButton,
  SegmentedControl,
  Select,
  Surface,
  InlineStatus,
  Tooltip,
  ModeProvider,
} from "../index";
import {
  getColorPalette,
  elevation,
  radius as radiusTokens,
} from "../../tokens/tokens";

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

const buttonByName = (container, name) =>
  [...container.querySelectorAll("button")].find(
    (b) => b.textContent === name || b.getAttribute("aria-label") === name
  );

const fireClick = (el) =>
  act(() => {
    el.click();
  });
const fireKeyDown = (el, key) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
// React 的 onFocus/onBlur 监听 focusin/focusout
const fireFocus = (el) =>
  act(() => {
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  });
const fireBlur = (el) =>
  act(() => {
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  });
const fireChange = (el, value) => {
  el.value = value;
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const light = getColorPalette("light");
const dark = getColorPalette("dark");

// jsdom 的 style 读取会把 hex 规范化为 rgb() 形式
const toRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

describe("Button (MVP-14)", () => {
  it("fires clicks and maps variants to token colors", () => {
    const onClick = jest.fn();
    const { container, unmount } = render(
      <Button variant="primary" onClick={onClick}>
        Translate
      </Button>
    );
    const el = buttonByName(container, "Translate");
    expect(el.style.backgroundColor).toBe(toRgb(light.action.primary));
    expect(el.style.color).toBe(toRgb(light.text.onAction));
    fireClick(el);
    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("secondary variant uses surface tokens and disabled blocks clicks", () => {
    const onClick = jest.fn();
    const { container, unmount } = render(
      <Button disabled onClick={onClick}>
        Stop
      </Button>
    );
    const el = buttonByName(container, "Stop");
    expect(el.disabled).toBe(true);
    expect(el.style.backgroundColor).toBe(toRgb(light.bg.subtle));
    fireClick(el);
    expect(onClick).not.toHaveBeenCalled();
    unmount();
  });

  it("resolves the dark palette through ModeProvider", () => {
    const { container, unmount } = render(
      <ModeProvider mode="dark">
        <Button variant="primary">Dark</Button>
      </ModeProvider>
    );
    expect(buttonByName(container, "Dark").style.backgroundColor).toBe(
      toRgb(dark.action.primary)
    );
    unmount();
  });
});

describe("IconButton (MVP-14)", () => {
  it("requires an accessible name and forwards it", () => {
    const { container, unmount } = render(<IconButton label="Copy" />);
    expect(buttonByName(container, "Copy")).toBeTruthy();
    unmount();
  });

  it("throws on missing label outside production", () => {
    expect(() => render(<IconButton />)).toThrow(TypeError);
  });
});

describe("SegmentedControl (MVP-14)", () => {
  const options = [
    { value: "bilingual", label: "Bilingual" },
    { value: "translated", label: "Translated" },
    { value: "original", label: "Original" },
  ];

  it("exposes radio semantics with the selected option checked", () => {
    const { container, unmount } = render(
      <SegmentedControl options={options} value="translated" />
    );
    const radios = container.querySelectorAll('[role="radio"]');
    expect(radios).toHaveLength(3);
    expect(radios[1].getAttribute("aria-checked")).toBe("true");
    expect(radios[1].tabIndex).toBe(0);
    expect(radios[0].tabIndex).toBe(-1);
    unmount();
  });

  it("selects via click and via arrow keys", () => {
    const onChange = jest.fn();
    const { container, unmount } = render(
      <SegmentedControl options={options} value="bilingual" onChange={onChange} />
    );
    fireClick(buttonByName(container, "Original"));
    expect(onChange).toHaveBeenCalledWith("original");

    fireKeyDown(container.querySelector('[role="radiogroup"]'), "ArrowRight");
    expect(onChange).toHaveBeenCalledWith("translated");
    fireKeyDown(container.querySelector('[role="radiogroup"]'), "End");
    expect(onChange).toHaveBeenCalledWith("original");
    unmount();
  });

  it("arrow keys skip disabled options", () => {
    const onChange = jest.fn();
    const withDisabled = [
      { value: "a", label: "A" },
      { value: "b", label: "B", disabled: true },
      { value: "c", label: "C" },
    ];
    const { container, unmount } = render(
      <SegmentedControl options={withDisabled} value="a" onChange={onChange} />
    );
    fireKeyDown(container.querySelector('[role="radiogroup"]'), "ArrowRight");
    expect(onChange).toHaveBeenCalledWith("c");
    unmount();
  });
});

describe("Select (MVP-14)", () => {
  it("renders native options and reports changes", () => {
    const onChange = jest.fn();
    const { container, unmount } = render(
      <Select
        aria-label="Target language"
        options={[
          { value: "zh-CN", label: "Chinese" },
          { value: "ja", label: "Japanese" },
        ]}
        value="zh-CN"
        onChange={onChange}
      />
    );
    const el = container.querySelector("select");
    expect(el.getAttribute("aria-label")).toBe("Target language");
    expect(el.value).toBe("zh-CN");
    expect(el.querySelectorAll("option")).toHaveLength(2);
    fireChange(el, "ja");
    expect(onChange).toHaveBeenCalledWith("ja");
    unmount();
  });
});

describe("Surface (MVP-14)", () => {
  it("maps level/border/lift to token values", () => {
    const { container, unmount } = render(
      <Surface level="subtle" bordered lift="low" data-testid="surface">
        body
      </Surface>
    );
    const el = container.querySelector('[data-testid="surface"]');
    expect(el.style.backgroundColor).toBe(toRgb(light.bg.subtle));
    expect(el.style.border).toContain(light.border.default);
    expect(el.style.boxShadow).toBe(elevation.low);
    expect(el.style.borderRadius).toBe(`${radiusTokens.md}px`);
    unmount();
  });

  it("default level uses the default background in dark mode", () => {
    const { container, unmount } = render(
      <ModeProvider mode="dark">
        <Surface data-testid="surface-dark">x</Surface>
      </ModeProvider>
    );
    expect(
      container.querySelector('[data-testid="surface-dark"]').style
        .backgroundColor
    ).toBe(toRgb(dark.bg.default));
    unmount();
  });
});

describe("InlineStatus (MVP-14)", () => {
  it("is a live status region using the tone's paired tokens", () => {
    const { container, unmount } = render(
      <InlineStatus tone="error">quota exceeded</InlineStatus>
    );
    const el = container.querySelector('[role="status"]');
    expect(el.textContent).toBe("quota exceeded");
    expect(el.style.backgroundColor).toBe(toRgb(light.status.error.bg));
    expect(el.style.color).toBe(toRgb(light.status.error.fg));
    unmount();
  });

  it("falls back to info for unknown tones", () => {
    const { container, unmount } = render(
      <InlineStatus tone="sparkle">note</InlineStatus>
    );
    expect(container.querySelector('[role="status"]').style.backgroundColor).toBe(
      toRgb(light.status.info.bg)
    );
    unmount();
  });
});

describe("Tooltip (MVP-14)", () => {
  it("stays hidden until focus and wires aria-describedby", () => {
    const { container, unmount } = render(
      <Tooltip label="Copies to clipboard">
        <Button>Copy</Button>
      </Tooltip>
    );
    const trigger = buttonByName(container, "Copy");
    expect(container.querySelector('[role="tooltip"]')).toBeNull();

    fireFocus(trigger);
    const tip = container.querySelector('[role="tooltip"]');
    expect(tip.textContent).toBe("Copies to clipboard");
    // aria-describedby 在包裹层（它持有 onFocus/onBlur），不在子按钮上
    expect(trigger.parentElement.getAttribute("aria-describedby")).toBe(tip.id);

    fireBlur(trigger);
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
    unmount();
  });
});
