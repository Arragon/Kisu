// Primitives 的模式（light/dark）与色板覆盖传播。
// 颜色一律经 useColorPalette 取自 tokens——primitives 内不出现任何 hex 字面量。
// 色板覆盖（DES-01 方向探索）：ModeProvider colorSet={dir.tokens.color}（含
// light/dark 两套）时组件取方向色板而非默认——语义键集不变，仅换值
// （gate 第 10 项机制）；dark 切换在方向内仍然生效。
import React, { createContext, useContext, useState } from "react";
import { getColorPalette } from "../tokens/tokens";

const ModeContext = createContext({ mode: "light", colorSet: null });

export const ModeProvider = ({ mode = "light", colorSet = null, children }) => (
  <ModeContext.Provider
    value={{
      mode: mode === "dark" ? "dark" : "light",
      colorSet:
        colorSet && colorSet.light && colorSet.dark ? colorSet : null,
    }}
  >
    {children}
  </ModeContext.Provider>
);

export const useMode = (modeOverride) => {
  const { mode: fromContext } = useContext(ModeContext);
  return modeOverride === "dark" || modeOverride === "light"
    ? modeOverride
    : fromContext;
};

export const useColorPalette = (modeOverride) => {
  const { mode, colorSet } = useContext(ModeContext);
  const resolvedMode =
    modeOverride === "dark" || modeOverride === "light" ? modeOverride : mode;
  return colorSet ? colorSet[resolvedMode] : getColorPalette(resolvedMode);
};

// 键盘可达性：原生元素获得焦点时显示 token 化 focus-ring。
// 返回 { handlers, style }，组件把两者并入根元素即可。
export const useFocusRing = (palette) => {
  const [focused, setFocused] = useState(false);
  return {
    handlers: {
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    style: focused
      ? {
          outline: `2px solid ${palette.action.primary}`,
          outlineOffset: 1,
        }
      : undefined,
  };
};
