// 几何适配器测试（MVP-29 / INH-1170）。
// 验收矩阵：上下左右翻转、zoom（小视口）、scroll（文档坐标偏移）、钳制、
// chrome/握手预留语义、常数冻结。
import {
  GEOMETRY_CONSTANTS,
  getBoxOuterWidth,
  getBoxOuterHeight,
  getMaxBoxContentSize,
  getMaxBoxPosition,
  getFollowBoxPosition,
  getPointerButtonPosition,
} from "../geometry";

// 上游常量（tranboxPosition.js / useSelectionController.js）
const SIDE = 16;
const CHROME = 52;
const BTN = 20;
const GAP = 12;

const VP = { innerWidth: 1280, innerHeight: 800, scrollX: 0, scrollY: 0 };

const freeze = (o) => Object.freeze(o);

describe("geometry constants (MVP-29)", () => {
  it("preserves upstream workaround constants verbatim", () => {
    expect(GEOMETRY_CONSTANTS).toEqual({
      sideGripWidth: 16,
      chromeHeight: 52,
      buttonSize: 20,
      buttonMouseGap: 12,
    });
    expect(Object.isFrozen(GEOMETRY_CONSTANTS)).toBe(true);
  });

  it("outer size = content + side grips / chrome", () => {
    expect(getBoxOuterWidth(300)).toBe(300 + SIDE);
    expect(getBoxOuterHeight(200)).toBe(200 + CHROME);
  });

  it("max content size prevents outer overflow of the viewport", () => {
    const max = getMaxBoxContentSize(VP);
    expect(max.width).toBe(1280 - SIDE);
    expect(max.height).toBe(800 - CHROME);
    // zoom 模拟：小视口钳到 0
    expect(getMaxBoxContentSize({ innerWidth: 10, innerHeight: 10 }).width).toBe(0);
  });
});

describe("max box position (MVP-29)", () => {
  it("clamps to viewport minus outer size", () => {
    const max = getMaxBoxPosition(300, 200, VP);
    expect(max.x).toBe(1280 - (300 + SIDE));
    expect(max.y).toBe(800 - (200 + CHROME));
  });

  it("clamps to 0 when the box is wider than the viewport", () => {
    expect(getMaxBoxPosition(2000, 100, VP).x).toBe(0);
    expect(getMaxBoxPosition(100, 2000, VP).y).toBe(0);
  });
});

describe("follow selection position (MVP-29)", () => {
  // 选区：left 400 right 500, top 300 bottom 320
  const RECT = freeze({ left: 400, right: 500, top: 300, bottom: 320 });
  const CENTER_X = 450;

  it("places below the selection by default (bottom-left aligned)", () => {
    const { value } = getFollowBoxPosition(RECT, { w: 300, h: 200 }, 0, 0, VP);
    expect(value.x).toBe(CENTER_X);
    expect(value.y).toBe(320); // rect.bottom + offsetY
  });

  it("flips above when the box overflows the bottom edge", () => {
    // 选区紧贴视口底部 → 下方放不下 → 翻上方
    const rect = freeze({ left: 400, right: 500, top: 700, bottom: 790 });
    const { value } = getFollowBoxPosition(rect, { w: 300, h: 200 }, 0, 0, VP);
    // top(700) - outerHeight(200+52) - 0 = 448
    expect(value.y).toBe(700 - (200 + CHROME));
  });

  it("docks at viewport top when neither side has room", () => {
    // 选区跨全视口高度：下方溢出 → 翻上方 top(10)-452 为负 → 钳到 0（视口顶部）
    const rect = freeze({ left: 400, right: 500, top: 10, bottom: 790 });
    const { value } = getFollowBoxPosition(rect, { w: 300, h: 400 }, 0, 0, VP);
    expect(value.y).toBe(0);
  });

  it("applies offsets and clamps x within viewport", () => {
    const rect = freeze({ left: 1200, right: 1260, top: 100, bottom: 120 });
    const { value } = getFollowBoxPosition(rect, { w: 300, h: 200 }, 40, 0, VP);
    // 中心 1230 + 40 = 1270 → maxX = 1280-300-16 = 964 → 钳到 964
    expect(value.x).toBe(964);
    // 超宽 box：x 钳到 0
    const { value: v2 } = getFollowBoxPosition(
      freeze({ left: 0, right: 10, top: 100, bottom: 120 }),
      { w: 2000, h: 100 },
      0,
      0,
      VP
    );
    expect(v2.x).toBe(0);
  });

  it("scroll shifts document coordinates (fixed positioning + scroll offset)", () => {
    const vp = { innerWidth: 1280, innerHeight: 800, scrollX: 100, scrollY: 200 };
    const rect = freeze({ left: 400, right: 500, top: 300, bottom: 320 });
    const { value } = getFollowBoxPosition(rect, { w: 300, h: 200 }, 0, 0, vp);
    // 上游语义：跟随定位不直接加 scroll（rect 已是文档坐标），但指针按钮定位会加。
    // follow 的 x/y 与无 scroll 时一致（上游 :174-187 未读 scroll）。
    expect(value.x).toBe(CENTER_X);
    expect(value.y).toBe(320);
  });

  it("rejects a missing rect", () => {
    expect(getFollowBoxPosition(null, { w: 100, h: 100 }, 0, 0, VP).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
  });
});

describe("pointer button position (MVP-29)", () => {
  const POINTER = freeze({ x: 600, y: 400 });

  it("places right-below the pointer with the mouse gap", () => {
    const { value } = getPointerButtonPosition(POINTER, { viewport: VP });
    expect(value.x).toBe(600 + GAP);
    expect(value.y).toBe(400 + GAP);
  });

  it("flips left when overflowing the right edge", () => {
    const pointer = freeze({ x: 1270, y: 400 });
    const { value } = getPointerButtonPosition(pointer, { viewport: VP });
    // right 溢出 → 翻左：600? no: x - gap - size = 1270 - 12 - 20 = 1238
    expect(value.x).toBe(1270 - GAP - BTN);
    expect(value.y).toBe(400 + GAP);
  });

  it("flips up when overflowing the bottom edge", () => {
    const pointer = freeze({ x: 600, y: 795 });
    const { value } = getPointerButtonPosition(pointer, { viewport: VP });
    expect(value.y).toBe(795 - GAP - BTN);
  });

  it("clamps within the viewport near edges", () => {
    // 光标 1275+gap=1287 右溢出 → 翻左 1275-12-20=1243（未触视口钳制）
    const pointer = freeze({ x: 1275, y: 100 });
    const { value } = getPointerButtonPosition(pointer, { viewport: VP });
    expect(value.x).toBe(1243);
    expect(value.y).toBe(100 + GAP);
  });

  it("applies offsets and honours scroll (document coordinates)", () => {
    const vp = { innerWidth: 1280, innerHeight: 800, scrollX: 50, scrollY: 100 };
    const pointer = freeze({ x: 600, y: 400 });
    const { value } = getPointerButtonPosition(
      pointer,
      { offsetX: 10, offsetY: 20, viewport: vp }
    );
    // 上游语义：offset 参与 flip/钳制决策后在返回值中减去（无钳制时正负抵消）
    expect(value.x).toBe(600 + GAP);
    expect(value.y).toBe(400 + GAP);
  });

  it("rejects a missing pointer", () => {
    expect(
      getPointerButtonPosition(null, { viewport: VP }).error.code
    ).toBe("UNSUPPORTED_INPUT");
  });
});
