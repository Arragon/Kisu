// Kisu provisional semantic UI tokens（MVP-13 / INH-1154）。
//
// 契约规则（见同目录 README）：
// 1. 全部数值为 **provisional**——只保证可读/可访问/light-dark，不表达最终品牌
//    风格；Design Freedom Gate（M1/DES-03..04）前不冻结。
// 2. 产品代码只允许按语义名引用 token；禁止依赖具体 hex/px/shadow 值
//    （P2-T05 boundary test 强制）。
// 3. 替换 token 值不得改变产品语义——语义在键名，不在值。
// 4. 不把任何外部产品（Linear/Arc/Material…）的样式写成架构约束。

// DES-02 用户已选 Ink（黑白极简）方向，DES-03 已将 Ink 色板转正为默认；
// 其余三方向保留于 directions.js 作探索记录。DES-10 用户终验后移除收敛标记。
export const TOKEN_STATUS = "ink-converged"; // DES-02 用户选 Ink（黑白极简），DES-03 已转正；DES-10 用户终验后移除标记

const lightPalette = Object.freeze({
  bg: Object.freeze({
    default: "#ffffff",
    subtle: "#f2f2f2",
    inverse: "#111111",
  }),
  text: Object.freeze({
    primary: "#111111",
    secondary: "#444444",
    disabled: "#999999",
    inverse: "#ffffff",
    onAction: "#ffffff",
  }),
  border: Object.freeze({
    default: "#dddddd",
    strong: "#555555",
  }),
  action: Object.freeze({
    primary: "#111111",
    hover: "#000000",
    active: "#000000",
  }),
  status: Object.freeze({
    info: Object.freeze({ fg: "#1f2937", bg: "#f3f4f6" }),
    success: Object.freeze({ fg: "#166534", bg: "#dcfce7" }),
    warning: Object.freeze({ fg: "#854d0e", bg: "#fef9c3" }),
    error: Object.freeze({ fg: "#991b1b", bg: "#fee2e2" }),
  }),
});

const darkPalette = Object.freeze({
  bg: Object.freeze({
    default: "#0a0a0a",
    subtle: "#151515",
    inverse: "#fafafa",
  }),
  text: Object.freeze({
    primary: "#fafafa",
    secondary: "#bfbfbf",
    disabled: "#666666",
    inverse: "#0a0a0a",
    onAction: "#0a0a0a",
  }),
  border: Object.freeze({
    default: "#2a2a2a",
    strong: "#8a8a8a",
  }),
  action: Object.freeze({
    primary: "#fafafa",
    hover: "#ffffff",
    active: "#d4d4d4",
  }),
  status: Object.freeze({
    info: Object.freeze({ fg: "#d4d4d4", bg: "#1f1f1f" }),
    success: Object.freeze({ fg: "#d4d4d4", bg: "#1f1f1f" }),
    warning: Object.freeze({ fg: "#d4d4d4", bg: "#1f1f1f" }),
    error: Object.freeze({ fg: "#d4d4d4", bg: "#262626" }),
  }),
});

const palettes = Object.freeze({ light: lightPalette, dark: darkPalette });

// 获取指定模式的语义色板（冻结）。feature code 经此消费颜色 token。
export const getColorPalette = (mode = "light") => {
  const palette = palettes[mode];
  if (!palette) {
    throw new TypeError(`unknown color mode "${mode}" (light|dark)`);
  }
  return palette;
};

export const space = Object.freeze({
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
});

export const type = Object.freeze({
  fontFamily:
    "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
  size: Object.freeze({ sm: 12, md: 14, lg: 17 }),
  weight: Object.freeze({ regular: 400, medium: 500, strong: 700 }),
  lineHeight: Object.freeze({ tight: 1.25, normal: 1.45, relaxed: 1.65 }),
});

export const radius = Object.freeze({
  none: 0,
  sm: 4,
  md: 8,
  round: 999,
});

export const elevation = Object.freeze({
  none: "none",
  low: "0 1px 2px rgba(0, 0, 0, 0.12)",
  mid: "0 2px 6px rgba(0, 0, 0, 0.16)",
  high: "0 6px 16px rgba(0, 0, 0, 0.2)",
});

export const motion = Object.freeze({
  durationMs: Object.freeze({
    instant: 0,
    fast: 120,
    normal: 200,
    slow: 320,
  }),
  easing: Object.freeze({
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    decelerate: "cubic-bezier(0.05, 0.7, 0.1, 1)",
  }),
});

// Kisu 自有表面的层级。与上游 tranbox 的 2147483647 如何竞争/共存，
// 属于各 surface（P4/P5）的挂载决策，不在 token 层预设。
export const zIndex = Object.freeze({
  content: 0,
  overlay: 1000,
  toast: 1100,
});

// 用另一组值解析整套 token（Design Freedom Gate 换风格的机制面）。
// 语义键集保持不变——值可替换，键即语义。
export const resolveTokens = ({ color, ...rest } = {}) => {
  const mergedPalettes =
    color && color.light && color.dark
      ? Object.freeze({
          light: Object.freeze(color.light),
          dark: Object.freeze(color.dark),
        })
      : palettes;
  return Object.freeze({
    status: TOKEN_STATUS,
    color: mergedPalettes,
    space: rest.space ? Object.freeze(rest.space) : space,
    type: rest.type ? Object.freeze(rest.type) : type,
    radius: rest.radius ? Object.freeze(rest.radius) : radius,
    elevation: rest.elevation ? Object.freeze(rest.elevation) : elevation,
    motion: rest.motion ? Object.freeze(rest.motion) : motion,
    zIndex: rest.zIndex ? Object.freeze(rest.zIndex) : zIndex,
  });
};
