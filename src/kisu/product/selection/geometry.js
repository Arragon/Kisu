// Selection 视口几何适配器（MVP-29 / INH-1170）。
// 纯函数：视口以参数注入（{ innerWidth, innerHeight, scrollX, scrollY }），
// 不直接读 window——可测、可在 ShadowRoot 场景复用。
//
// 语义逐行复刻上游（不简化、不删除 workaround）：
// - tranboxPosition.js:2-4：16px 侧握手 + 52px chrome 预留——拉伸触发区在
//   内容盒之外，钳制值因此与内容尺寸不同（上游 REVIEW 明示不可简化）
// - useSelectionController.js:174-187 getFollowBoxPosition：默认选区下方，
//   下方溢出翻上方，仍溢出停靠视口顶部
// - useSelectionController.js:54-93 getPointerButtonPosition：光标旁 gap+
//   offset 摆放，右/下溢出翻转左/上，最后视口钳制
// 坐标系：文档坐标（fixed 定位 + scroll 偏移参与视口边界计算）。
import { kclOk, kclError } from "../../kcl/result";

// 上游预留常量（tranboxPosition.js:2-4）——provisional，语义为"非内容区预留"
const SIDE_GRIP_WIDTH = 16;
const CHROME_HEIGHT = 52;

// 按钮常量（useSelectionController.js:27-28 桌面值）
const BUTTON_SIZE = 20;
const BUTTON_MOUSE_GAP = 12;

export const GEOMETRY_CONSTANTS = Object.freeze({
  sideGripWidth: SIDE_GRIP_WIDTH,
  chromeHeight: CHROME_HEIGHT,
  buttonSize: BUTTON_SIZE,
  buttonMouseGap: BUTTON_MOUSE_GAP,
});

const num = (v) => Number(v) || 0;

const limit = (value, min, max) => {
  const safeMax = Math.max(min, max);
  return Math.min(Math.max(value, min), safeMax);
};

// 视口对象校验：缺字段按 0 处理（纯函数容错，与上游 window 读取语义一致）
const asViewport = (viewport) => ({
  innerWidth: num(viewport && viewport.innerWidth),
  innerHeight: num(viewport && viewport.innerHeight),
  scrollX: num(viewport && viewport.scrollX),
  scrollY: num(viewport && viewport.scrollY),
});

// 内容盒 → 外部盒（含握手/chrome 预留）——tranboxPosition.js:9-18 复刻
export const getBoxOuterWidth = (contentWidth) => num(contentWidth) + SIDE_GRIP_WIDTH;
export const getBoxOuterHeight = (contentHeight) => num(contentHeight) + CHROME_HEIGHT;

// 内容区允许的最大尺寸（防整体外部尺寸溢出视口）——:23-32 复刻
export const getMaxBoxContentSize = (viewport) => {
  const vp = asViewport(viewport);
  return Object.freeze({
    width: Math.max(0, vp.innerWidth - SIDE_GRIP_WIDTH),
    height: Math.max(0, vp.innerHeight - CHROME_HEIGHT),
  });
};

// 允许的最大 X/Y 坐标（防拉伸区溢出屏幕）——:37-46 复刻
export const getMaxBoxPosition = (contentWidth, contentHeight, viewport) => {
  const vp = asViewport(viewport);
  return Object.freeze({
    x: Math.max(0, vp.innerWidth - getBoxOuterWidth(contentWidth)),
    y: Math.max(0, vp.innerHeight - getBoxOuterHeight(contentHeight)),
  });
};

// 跟随选区定位（useSelectionController.js:174-187 复刻）：
// x = 选区水平中心 + offsetX；默认选区下方；下方溢出翻上方；
// 钳制 x ∈ [0, maxX(w)]、y ∈ [0, maxY(h)]。
export const getFollowBoxPosition = (rect, boxSize, boxOffsetX, boxOffsetY, viewport) => {
  if (!rect || typeof rect.left !== "number" || typeof rect.bottom !== "number") {
    return kclError("UNSUPPORTED_INPUT", "getFollowBoxPosition requires a rect");
  }
  const vp = asViewport(viewport);
  const size = boxSize && typeof boxSize === "object" ? boxSize : {};
  const w = num(size.w);
  const h = num(size.h);
  const offX = num(boxOffsetX);
  const offY = num(boxOffsetY);

  const x = (rect.left + rect.right) / 2 + offX;
  const bottomY = rect.bottom + offY;
  const maxY = vp.innerHeight - getBoxOuterHeight(h);
  const y =
    bottomY + getBoxOuterHeight(h) > vp.innerHeight
      ? rect.top - getBoxOuterHeight(h) - offY
      : bottomY;

  return kclOk(
    Object.freeze({
      x: limit(x, 0, Math.max(0, vp.innerWidth - getBoxOuterWidth(w))),
      y: limit(y, 0, Math.max(0, maxY)),
    })
  );
};

// 光标按钮定位（useSelectionController.js:54-93 复刻）：
// 默认光标右下 gap+offset；右溢出翻转左、下溢出翻转上；最后视口钳制。
export const getPointerButtonPosition = (
  pointer,
  { offsetX = 0, offsetY = 0, viewport } = {}
) => {
  if (!pointer || typeof pointer.x !== "number" || typeof pointer.y !== "number") {
    return kclError("UNSUPPORTED_INPUT", "getPointerButtonPosition requires a pointer");
  }
  const vp = asViewport(viewport);
  const offX = num(offsetX);
  const offY = num(offsetY);
  const viewportLeft = vp.scrollX;
  const viewportTop = vp.scrollY;
  const viewportRight = viewportLeft + vp.innerWidth;
  const viewportBottom = viewportTop + vp.innerHeight;

  let left = pointer.x + BUTTON_MOUSE_GAP + offX;
  let top = pointer.y + BUTTON_MOUSE_GAP + offY;

  if (left + BUTTON_SIZE > viewportRight) {
    left = pointer.x - BUTTON_MOUSE_GAP - BUTTON_SIZE + offX;
  }
  if (top + BUTTON_SIZE > viewportBottom) {
    top = pointer.y - BUTTON_MOUSE_GAP - BUTTON_SIZE + offY;
  }

  const finalLeft = limit(left, viewportLeft, viewportRight - BUTTON_SIZE);
  const finalTop = limit(top, viewportTop, viewportBottom - BUTTON_SIZE);

  return kclOk(
    Object.freeze({
      x: finalLeft - offX,
      y: finalTop - offY,
    })
  );
};
