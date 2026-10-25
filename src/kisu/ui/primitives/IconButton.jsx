// Semantic IconButton（MVP-14）。要求 aria-label（可访问名称）——缺失时
// 开发环境直接报错，不静默渲染无名按钮。
import React from "react";
import { useColorPalette, useFocusRing } from "./mode";
import { space, type, radius } from "../tokens/tokens";

const sizeStyle = (size) =>
  size === "sm"
    ? { width: 24 + 2 * space.xs, height: 24 + 2 * space.xs }
    : { width: 24 + 2 * space.sm, height: 24 + 2 * space.sm };

export const IconButton = ({
  label,
  size = "md",
  disabled = false,
  style,
  ...rest
}) => {
  if (process.env.NODE_ENV !== "production" && !label) {
    throw new TypeError("IconButton requires an aria-label (label prop)");
  }
  const palette = useColorPalette();
  const focus = useFocusRing(palette);
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: type.fontFamily,
        fontSize: type.size.md,
        borderRadius: radius.sm,
        padding: space.xs,
        border: `1px solid ${palette.border.default}`,
        backgroundColor: palette.bg.default,
        color: disabled ? palette.text.disabled : palette.text.primary,
        cursor: disabled ? "default" : "pointer",
        ...sizeStyle(size),
        ...focus.style,
        ...style,
      }}
      {...focus.handlers}
      {...rest}
    />
  );
};
