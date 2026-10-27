// DES-01 方向探索预设（M1 准备 / 非决策）。
// 四套**显著不同**的方向预设经 resolveTokens 实体化——证明同一功能状态可整体
// 换肤（语义键集不变，值全换）。这些是 DG（DES-02 用户拍板）的**探索输入**，
// 不是决定；DES-03/04 收敛后由用户选中的方向转正，其余废弃。
// 每套都必须通过与默认 tokens 相同的 WCAG 对比度电池（themes.test.js 强制）。
import { resolveTokens } from "./tokens";

// 方向 A · Aurora —— 冷色蓝青、紧凑圆角、快动效
const aurora = {
  id: "aurora",
  label: "Aurora",
  note: "cool slate/cyan, compact radii, brisk motion",
  tokens: resolveTokens({
    color: {
      light: {
        bg: { default: "#f4f7fa", subtle: "#e8eef4", inverse: "#10222e" },
        text: {
          primary: "#0f1c26",
          secondary: "#3f5665",
          disabled: "#7b8b98",
          inverse: "#f4f7fa",
          onAction: "#ffffff",
        },
        border: { default: "#c9d6e0", strong: "#4a6072" },
        action: { primary: "#0e7490", hover: "#0c657e", active: "#0a566c" },
        status: {
          info: { fg: "#0c4a6e", bg: "#e0f2fe" },
          success: { fg: "#14532d", bg: "#dcfce7" },
          warning: { fg: "#713f12", bg: "#fef9c3" },
          error: { fg: "#991b1b", bg: "#fee2e2" },
        },
      },
      dark: {
        bg: { default: "#0b1220", subtle: "#131c2b", inverse: "#e6edf5" },
        text: {
          primary: "#e2e8f0",
          secondary: "#94a3b8",
          disabled: "#475569",
          inverse: "#0b1220",
          onAction: "#062a33",
        },
        border: { default: "#243244", strong: "#64748b" },
        action: { primary: "#38bdf8", hover: "#5cc2fa", active: "#1fa5e0" },
        status: {
          info: { fg: "#7dd3fc", bg: "#082f49" },
          success: { fg: "#86efac", bg: "#14532d" },
          warning: { fg: "#fde047", bg: "#422006" },
          error: { fg: "#fca5a5", bg: "#450a0a" },
        },
      },
    },
  }),
};

// 方向 B · Ember —— 暖色赭橙、中圆角
const ember = {
  id: "ember",
  label: "Ember",
  note: "warm ochre/orange, medium radii",
  tokens: resolveTokens({
    color: {
      light: {
        bg: { default: "#faf6f2", subtle: "#f3ece4", inverse: "#2a1d16" },
        text: {
          primary: "#241a12",
          secondary: "#57493d",
          disabled: "#93826f",
          inverse: "#faf6f2",
          onAction: "#fff7ed",
        },
        border: { default: "#e0d4c8", strong: "#6e5a48" },
        action: { primary: "#c2410c", hover: "#a8390a", active: "#8f3009" },
        status: {
          info: { fg: "#7c2d12", bg: "#ffedd5" },
          success: { fg: "#14532d", bg: "#dcfce7" },
          warning: { fg: "#713f12", bg: "#fef3c7" },
          error: { fg: "#991b1b", bg: "#fee2e2" },
        },
      },
      dark: {
        bg: { default: "#171009", subtle: "#221912", inverse: "#f7ede2" },
        text: {
          primary: "#f0e7de",
          secondary: "#c4b5a5",
          disabled: "#7d6c5c",
          inverse: "#171009",
          onAction: "#431407",
        },
        border: { default: "#3a2d20", strong: "#857260" },
        action: { primary: "#fb923c", hover: "#fdaa5c", active: "#e87f1f" },
        status: {
          info: { fg: "#fdba74", bg: "#431407" },
          success: { fg: "#86efac", bg: "#14532d" },
          warning: { fg: "#fde047", bg: "#422006" },
          error: { fg: "#fca5a5", bg: "#450a0a" },
        },
      },
    },
  }),
};

// 方向 C · Ink —— 单色高对比、直角、零动效
const ink = {
  id: "ink",
  label: "Ink",
  note: "monochrome high-contrast, sharp corners, zero motion",
  tokens: resolveTokens({
    color: {
      light: {
        bg: { default: "#ffffff", subtle: "#f2f2f2", inverse: "#111111" },
        text: {
          primary: "#111111",
          secondary: "#444444",
          disabled: "#999999",
          inverse: "#ffffff",
          onAction: "#ffffff",
        },
        border: { default: "#dddddd", strong: "#555555" },
        action: { primary: "#111111", hover: "#000000", active: "#000000" },
        status: {
          info: { fg: "#1f2937", bg: "#f3f4f6" },
          success: { fg: "#166534", bg: "#dcfce7" },
          warning: { fg: "#854d0e", bg: "#fef9c3" },
          error: { fg: "#991b1b", bg: "#fee2e2" },
        },
      },
      dark: {
        bg: { default: "#0a0a0a", subtle: "#151515", inverse: "#fafafa" },
        text: {
          primary: "#fafafa",
          secondary: "#bfbfbf",
          disabled: "#666666",
          inverse: "#0a0a0a",
          onAction: "#0a0a0a",
        },
        border: { default: "#2a2a2a", strong: "#8a8a8a" },
        action: { primary: "#fafafa", hover: "#ffffff", active: "#d4d4d4" },
        status: {
          info: { fg: "#d4d4d4", bg: "#1f1f1f" },
          success: { fg: "#d4d4d4", bg: "#1f1f1f" },
          warning: { fg: "#d4d4d4", bg: "#1f1f1f" },
          error: { fg: "#d4d4d4", bg: "#262626" },
        },
      },
    },
    radius: { none: 0, sm: 2, md: 4, round: 999 },
    motion: {
      durationMs: { instant: 0, fast: 0, normal: 0, slow: 0 },
      easing: { standard: "linear", decelerate: "linear" },
    },
  }),
};

// 方向 D · Paper —— 暖灰橄榄、大圆角、舒缓动效
const paper = {
  id: "paper",
  label: "Paper",
  note: "warm-gray olive, generous radii, relaxed motion",
  tokens: resolveTokens({
    color: {
      light: {
        bg: { default: "#fdfdfc", subtle: "#f6f6f4", inverse: "#26251f" },
        text: {
          primary: "#20201c",
          secondary: "#52524b",
          disabled: "#98988e",
          inverse: "#fdfdfc",
          onAction: "#ffffff",
        },
        border: { default: "#e4e4de", strong: "#6f6f64" },
        action: { primary: "#4d7c0f", hover: "#436d0d", active: "#3a5e0b" },
        status: {
          info: { fg: "#365314", bg: "#ecfccb" },
          success: { fg: "#3f6212", bg: "#ecfccb" },
          warning: { fg: "#713f12", bg: "#fefce8" },
          error: { fg: "#7f1d1d", bg: "#fef2f2" },
        },
      },
      dark: {
        bg: { default: "#101210", subtle: "#181a17", inverse: "#f4f4ef" },
        text: {
          primary: "#e8e8e2",
          secondary: "#a3a39a",
          disabled: "#5f5f57",
          inverse: "#101210",
          onAction: "#1a2e05",
        },
        border: { default: "#262822", strong: "#75756a" },
        action: { primary: "#a3e635", hover: "#b5f04f", active: "#8cc929" },
        status: {
          info: { fg: "#bef264", bg: "#1a2e05" },
          success: { fg: "#bef264", bg: "#1a2e05" },
          warning: { fg: "#fde047", bg: "#1f1d0a" },
          error: { fg: "#fca5a5", bg: "#2a0a0a" },
        },
      },
    },
    radius: { none: 0, sm: 6, md: 14, round: 999 },
    motion: {
      durationMs: { instant: 0, fast: 180, normal: 300, slow: 480 },
      easing: { standard: "cubic-bezier(0.4, 0, 0.2, 1)", decelerate: "cubic-bezier(0, 0, 0.2, 1)" },
    },
  }),
};

// 方向数组（冻结）。消费方（DES-01 探索 harness）逐套渲染同一功能状态。
export const DESIGN_DIRECTIONS = Object.freeze([aurora, ember, ink, paper]);
