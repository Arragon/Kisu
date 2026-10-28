// 可访问性与动效边界测试（DES-09 / INH-1210）。
// 强制四条验收：关键键盘路径的 token focus-ring 全覆盖；状态不只靠颜色
//（aria + 字重）；零动效结构性满足（ui/ 无 transition/animation/@keyframes，
// prefers-reduced-motion 无需分支）；不通过改业务语义解决视觉问题
//（本文件只读源码 + 渲染断言，不改任何语义）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import fs from "fs";
import path from "path";
import { motion, getColorPalette } from "../tokens/tokens";
import { Button, Select, SegmentedControl, ModeProvider } from "../primitives";
import { SettingsShell } from "../surfaces/settings/SettingsShell";
import { ActionRow } from "../surfaces/selection/ActionRow";

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

const fireFocus = (el) =>
  act(() => {
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
  });

const collectSurfaceSources = (dir, acc = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      collectSurfaceSources(full, acc);
    } else if (/\.(jsx|js)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
};

describe("zero-motion boundary (DES-09)", () => {
  it("keeps all motion token durations at zero with linear easing", () => {
    expect(motion.durationMs).toEqual(
      expect.objectContaining({ instant: 0, fast: 0, normal: 0, slow: 0 })
    );
    expect(motion.easing).toEqual(
      expect.objectContaining({ standard: "linear", decelerate: "linear" })
    );
  });

  it("contains no transition/animation/@keyframes anywhere in ui/", () => {
    const uiDir = path.resolve(__dirname, "..");
    const offenders = [];
    for (const file of collectSurfaceSources(uiDir)) {
      const source = fs.readFileSync(file, "utf8");
      if (/transition\s*:|animation\s*:|@keyframes/.test(source)) {
        offenders.push(path.relative(uiDir, file));
      }
    }
    expect(offenders).toEqual([]);
    // prefers-reduced-motion 由此结构性满足——无动效即可减少
  });
});

describe("token focus-ring coverage (DES-09 keyboard paths)", () => {
  it("rings the Select primitive on focus", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <Select
          aria-label="Focus target"
          options={[{ value: "a", label: "A" }]}
          value="a"
        />
      </ModeProvider>
    );
    const select = container.querySelector("select");
    fireFocus(select);
    expect(select.style.outline).toBe(`2px solid ${palette.action.primary}`);
    unmount();
  });

  it("rings settings nav items on focus (roving tabindex path)", () => {
    const sections = [
      { id: "general", content: <div>general</div> },
      { id: "advanced", content: <div>advanced</div> },
    ];
    const { container, unmount } = render(
      <ModeProvider>
        <SettingsShell sections={sections} />
      </ModeProvider>
    );
    const first = container.querySelector("nav button");
    fireFocus(first);
    expect(first.style.outline).toBe(`2px solid ${palette.action.primary}`);
    unmount();
  });

  it("rings selection quiet actions on focus", () => {
    const vm = Object.freeze({
      status: "ready",
      data: Object.freeze({
        text: Object.freeze({ raw: "x", kind: "lexical" }),
        providers: Object.freeze({ resolved: Object.freeze([]), missing: Object.freeze([]) }),
        result: Object.freeze({
          kind: "translate",
          status: "ready",
          payload: Object.freeze({ output: "out" }),
        }),
      }),
      can: Object.freeze({ copy: true }),
      blockedBy: null,
      error: null,
    });
    const { container, unmount } = render(
      <ModeProvider>
        <ActionRow viewModel={vm} onCopy={() => {}} />
      </ModeProvider>
    );
    const copy = container.querySelector('[data-testid="kisu-action-copy"]');
    fireFocus(copy);
    expect(copy.style.outline).toBe(`2px solid ${palette.action.primary}`);
    unmount();
  });

  it("rings the Button primitive on focus (regression guard)", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <Button>press</Button>
      </ModeProvider>
    );
    const button = container.querySelector("button");
    fireFocus(button);
    expect(button.style.outline).toBe(`2px solid ${palette.action.primary}`);
    unmount();
  });
});

describe("status not by color alone (DES-09)", () => {
  it("marks the selected segment with aria-checked and weight, not color only", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SegmentedControl
          aria-label="Mode"
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          value="b"
        />
      </ModeProvider>
    );
    const segments = [...container.querySelectorAll('[role="radio"]')];
    const selected = segments.find((el) => el.getAttribute("aria-checked") === "true");
    expect(selected.textContent).toBe("Beta");
    expect(selected.style.fontWeight).toBe("700"); // type.weight.strong
    expect(
      segments.filter((el) => el.getAttribute("aria-checked") === "true")
    ).toHaveLength(1);
    unmount();
  });
});
