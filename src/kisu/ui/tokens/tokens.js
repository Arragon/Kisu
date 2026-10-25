// Kisu provisional semantic UI tokens（MVP-13 / INH-1154）。
//
// 契约规则（见同目录 README）：
// 1. 全部数值为 **provisional**——只保证可读/可访问/light-dark，不表达最终品牌
//    风格；Design Freedom Gate（M1/DES-03..04）前不冻结。
// 2. 产品代码只允许按语义名引用 token；禁止依赖具体 hex/px/shadow 值
//    （P2-T05 boundary test 强制）。
// 3. 替换 token 值不得改变产品语义——语义在键名，不在值。
// 4. 不把任何外部产品（Linear/Arc/Material…）的样式写成架构约束。

// 显式 provisional 标记：Design Freedom Gate 冻结正式 tokens 时移除。
export const TOKEN_STATUS = "provisional";

const lightPalette = Object.freeze({
  bg: Object.freeze({
    default: "#ffffff",
    subtle: "#f5f7f9",
    inverse: "#1f2430",
  }),
  text: Object.freeze({
    primary: "#1a2129",
    secondary: "#4a5561",
    disabled: "#8a94a0",
    inverse: "#f5f7f9",
    onAction: "#ffffff",
  }),
  border: Object.freeze({
    default: "#d4dae0",
    strong: "#7c8894",
  }),
  action: Object.freeze({
    primary: "#1a56db",
    hover: "#164bb3",
    active: "#123c91",
  }),
  status: Object.freeze({
    info: Object.freeze({ fg: "#1a4d8f", bg: "#e8f1fd" }),
    success: Object.freeze({ fg: "#1c5c34", bg: "#e6f4ea" }),
    warning: Object.freeze({ fg: "#7a4d0f", bg: "#fdf3e0" }),
    error: Object.freeze({ fg: "#a12622", bg: "#fdeceb" }),
  }),
});

const darkPalette = Object.freeze({
  bg: Object.freeze({
    default: "#14181f",
    subtle: "#1d232c",
    inverse: "#f5f7f9",
  }),
  text: Object.freeze({
    primary: "#eceff3",
    secondary: "#a8b2bd",
    disabled: "#5d6773",
    inverse: "#1a2129",
    onAction: "#0b2d6b",
  }),
  border: Object.freeze({
    default: "#333c46",
    strong: "#6b7784",
  }),
  action: Object.freeze({
    primary: "#82adff",
    hover: "#9cc0ff",
    active: "#6b9bf0",
  }),
  status: Object.freeze({
    info: Object.freeze({ fg: "#9ec2ff", bg: "#12294a" }),
    success: Object.freeze({ fg: "#8fd6a8", bg: "#10331f" }),
    warning: Object.freeze({ fg: "#f0c37e", bg: "#3a2c10" }),
    error: Object.freeze({ fg: "#ff9d99", bg: "#3d1517" }),
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
