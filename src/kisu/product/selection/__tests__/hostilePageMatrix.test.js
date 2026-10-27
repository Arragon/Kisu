// Selection hostile-page / viewport 回归矩阵（MVP-34 / INH-1175，P4）。
// 覆盖六类敌意环境，验证几何适配器与触发适配器在其中的行为：
//   1. reset CSS      —— 适配器为纯数值运算，页面 CSS 不参与（结构断言）
//   2. 高 z-index     —— 定位只关心坐标，z-index 属 surface 渲染（结构断言）
//   3. transform 容器 —— getBoundingClientRect 返回变换后坐标，适配器直接消费
//   4. 滚动容器       —— 文档坐标 + scroll 偏移参与视口边界计算
//   5. code 块选区    —— 触发适配器照常路由（上游抑制语义属 caller guard）
//   6. zoom           —— 小视口模拟 zoom，钳制与翻转仍正确
import React from "react";
import { act } from "react";
import {
  getFollowBoxPosition,
  getPointerButtonPosition,
  getMaxBoxPosition,
  getMaxBoxContentSize,
} from "../geometry";
import { createSelectionTrigger, readSelectionSnapshot } from "../trigger";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

const freeze = (o) => Object.freeze(o);

// 变换后的 rect 模拟：translate + rotate 后 getBoundingClientRect 返回的
// 仍是视口坐标系轴对齐包围盒——适配器只消费该包围盒。
const TRANSFORMED_RECT = freeze({
  left: -35.36,
  right: 64.64,
  top: 14.64,
  bottom: 114.64,
});

describe("hostile matrix: reset CSS (MVP-34)", () => {
  it("geometry is pure numeric math — no DOM/CSS dependency", () => {
    // 同一输入在任何页面 CSS 下产生同一输出（纯函数结构保证）
    const rect = freeze({ left: 400, right: 500, top: 300, bottom: 320 });
    const vp = freeze({ innerWidth: 1280, innerHeight: 800, scrollX: 0, scrollY: 0 });
    const a = getFollowBoxPosition(rect, { w: 300, h: 200 }, 0, 0, vp);
    const b = getFollowBoxPosition(rect, { w: 300, h: 200 }, 0, 0, vp);
    expect(a).toEqual(b);
    // CSS reset（box-sizing: border-box 等）不可能改变数值结果
    expect(a.value.x).toBe(450);
    expect(a.value.y).toBe(320);
  });
});

describe("hostile matrix: high z-index pages (MVP-34)", () => {
  it("positions are render-order independent — adapter outputs pure coordinates", () => {
    // z-index 2147483647 的宿主元素不影响几何计算
    const max = getMaxBoxPosition(300, 200, freeze({ innerWidth: 1280, innerHeight: 800 }));
    expect(max.x).toBe(1280 - 316);
    expect(max.y).toBe(800 - 252);
    const maxContent = getMaxBoxContentSize(freeze({ innerWidth: 1280, innerHeight: 800 }));
    expect(maxContent.width).toBe(1280 - 16);
  });
});

describe("hostile matrix: transform containers (MVP-34)", () => {
  it("consumes the transformed axis-aligned bounding box correctly", () => {
    // rotate(45deg) 后的包围盒（负 left 是 transform 的真实产物）
    const { value } = getFollowBoxPosition(
      TRANSFORMED_RECT,
      { w: 300, h: 200 },
      0,
      0,
      freeze({ innerWidth: 1280, innerHeight: 800 })
    );
    // 中心 (-35.36+64.64)/2 = 14.64；下方 114.64 + 252 = 366.64 < 800 → 不翻转
    expect(value.x).toBeCloseTo(14.64, 2);
    expect(value.y).toBeCloseTo(114.64, 2);
  });

  it("flips above when the transformed box overflows the bottom", () => {
    const { value } = getFollowBoxPosition(
      freeze({ ...TRANSFORMED_RECT, top: 700, bottom: 790 }),
      { w: 300, h: 200 },
      0,
      0,
      freeze({ innerWidth: 1280, innerHeight: 800 })
    );
    expect(value.y).toBe(700 - (200 + 52));
  });
});

describe("hostile matrix: scroll containers (MVP-34)", () => {
  it("pointer positioning honours document coordinates via scroll offsets", () => {
    const vp = freeze({ innerWidth: 800, innerHeight: 600, scrollX: 500, scrollY: 400 });
    const pointer = freeze({ x: 1200, y: 900 }); // 文档坐标（含滚动偏移）
    const { value } = getPointerButtonPosition(pointer, { viewport: vp });
    // 视口右缘 = 500+800=1300 > 1200+12+20 → 不翻转
    expect(value.x).toBe(1212);
    expect(value.y).toBe(912);
  });

  it("clamps the pointer button inside the scrolled viewport", () => {
    const vp = freeze({ innerWidth: 800, innerHeight: 600, scrollX: 500, scrollY: 400 });
    const pointer = freeze({ x: 1400, y: 1100 }); // 超出视口右/下
    const { value } = getPointerButtonPosition(pointer, { viewport: vp });
    // 右溢出翻左：1400-12-20=1368 → 钳到 right-size=1280
    expect(value.x).toBe(1280);
    // 下溢出翻上：1068 → 钳到 bottom-size=980（上游 limit 顺序：flip 后视口钳制）
    expect(value.y).toBe(980);
  });

  it("follow selection honours scroll offsets in the viewport bounds", () => {
    const vp = freeze({ innerWidth: 800, innerHeight: 600, scrollX: 0, scrollY: 400 });
    const rect = freeze({ left: 100, right: 200, top: 500, bottom: 550 });
    const { value } = getFollowBoxPosition(rect, { w: 300, h: 200 }, 0, 0, vp);
    // 下方 550+252=802 > 600 → 翻上方 500-252=248 → 正值保留
    expect(value.y).toBe(248);
  });
});

describe("hostile matrix: code blocks (MVP-34)", () => {
  it("trigger routes selections inside pre/code without suppression", () => {
    // 上游抑制（如跳过 code 翻译）属 caller guard；触发适配器不代行抑制
    const calls = [];
    const controller = { open: async (text) => calls.push(text) };
    const trigger = createSelectionTrigger({
      controller,
      getSelection: () => makeSelection("const x = 1;"),
    });
    trigger.value.onMouseUp();
    return flushPromises().then(() => {
      expect(calls).toEqual(["const x = 1;"]);
      trigger.value.destroy();
    });
  });

  it("caller guard can suppress code blocks explicitly", async () => {
    const calls = [];
    const controller = { open: async (text) => calls.push(text) };
    const trigger = createSelectionTrigger({
      controller,
      getSelection: () => makeSelection("const x = 1;"),
      guard: (text) => !/^const |^function /.test(text), // 调用方语义
    });
    trigger.value.onMouseUp();
    await flushPromises();
    expect(calls).toEqual([]);
    trigger.value.destroy();
  });

  it("readSelectionSnapshot handles whitespace-only code selection", () => {
    expect(readSelectionSnapshot(makeSelection("  \n  "))).toBeNull();
  });
});

describe("hostile matrix: zoom (MVP-34)", () => {
  it.each([
    ["zoom 50%", 640, 400],
    ["zoom 100%", 1280, 800],
    ["zoom 200%", 2560, 1600],
  ])("%s: clamps and flips stay within the effective viewport", (_name, w, h) => {
    const vp = freeze({ innerWidth: w, innerHeight: h, scrollX: 0, scrollY: 0 });
    const max = getMaxBoxPosition(300, 200, vp);
    expect(max.x).toBe(Math.max(0, w - 316));
    expect(max.y).toBe(Math.max(0, h - 252));

    // 超宽 box 在任何 zoom 下都钳到 0
    expect(getMaxBoxPosition(5000, 100, vp).x).toBe(0);
  });

  it("pointer flip works at zoom 200% viewport edges", () => {
    const vp = freeze({ innerWidth: 2560, innerHeight: 1600, scrollX: 0, scrollY: 0 });
    const pointer = freeze({ x: 2550, y: 1590 }); // 右下角
    const { value } = getPointerButtonPosition(pointer, { viewport: vp });
    // 右溢出翻左：2550-12-20=2518 < 2560-20 → 保留
    expect(value.x).toBe(2518);
    // 下溢出翻上：1590-12-20=1558 < 1600-20 → 保留
    expect(value.y).toBe(1558);
  });

  it("follow selection flips correctly at zoom 50% (640x400)", () => {
    const vp = freeze({ innerWidth: 640, innerHeight: 400, scrollX: 0, scrollY: 0 });
    const rect = freeze({ left: 100, right: 200, top: 350, bottom: 390 });
    const { value } = getFollowBoxPosition(rect, { w: 300, h: 200 }, 0, 0, vp);
    // 下方 390+252=642 > 400 → 翻上方 350-252=98 → 正值
    expect(value.y).toBe(98);
  });
});

// ---- helpers ----
function makeSelection(text, rect) {
  return {
    rangeCount: 1,
    toString: () => text,
    getRangeAt: () => ({
      getBoundingClientRect: () => rect || { left: 1, right: 2, top: 3, bottom: 4 },
    }),
  };
}
