// Semantic Surface（MVP-14）：中性容器。背景层级、边框、圆角、投影、内边距
// 全部 token 语义名。
import React from "react";
import { useColorPalette } from "./mode";
import { space, radius, elevation } from "../tokens/tokens";

const paddingValue = (padding) => {
  const map = {
    none: space.none,
    sm: space.sm,
    md: space.md,
    lg: space.lg,
    xl: space.xl,
  };
  const value = map[padding] === undefined ? space.md : map[padding];
  return value;
};

export const Surface = ({
  level = "default",
  padding = "md",
  bordered = false,
  lift = "none",
  style,
  ...rest
}) => {
  const palette = useColorPalette();
  return (
    <div
      style={{
        backgroundColor: level === "subtle" ? palette.bg.subtle : palette.bg.default,
        borderRadius: radius.md,
        border: bordered
          ? `1px solid ${palette.border.default}`
          : "1px solid transparent",
        boxShadow: elevation[lift] === undefined ? elevation.none : elevation[lift],
        padding: paddingValue(padding),
        ...style,
      }}
      {...rest}
    />
  );
};
