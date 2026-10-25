// Primitives 的模式（light/dark）传播与共享 focus-ring。
// 颜色一律经 useColorPalette 取自 tokens——primitives 内不出现任何 hex 字面量。
import React, { createContext, useContext, useState } from "react";
import { getColorPalette } from "../tokens/tokens";

const ModeContext = createContext("light");

export const ModeProvider = ({ mode = "light", children }) => (
  <ModeContext.Provider value={mode === "dark" ? "dark" : "light"}>
    {children}
  </ModeContext.Provider>
);

export const useMode = (modeOverride) => {
  const fromContext = useContext(ModeContext);
  return modeOverride === "dark" || modeOverride === "light"
    ? modeOverride
    : fromContext;
};

export const useColorPalette = (modeOverride) =>
  getColorPalette(useMode(modeOverride));

// 键盘可达性：原生元素获得焦点时显示 token 化 focus ring。
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
