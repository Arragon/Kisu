// Semantic Button（MVP-14）。variant：primary / secondary；颜色、字号、圆角、
// 间距全部来自 tokens；原生 button 键盘/焦点语义。
import React from "react";
import { useColorPalette, useFocusRing } from "./mode";
import { space, type, radius } from "../tokens/tokens";

const baseStyle = (palette, disabled) => ({
  fontFamily: type.fontFamily,
  fontSize: type.size.md,
  fontWeight: type.weight.medium,
  lineHeight: type.lineHeight.normal,
  borderRadius: radius.sm,
  padding: `${space.sm}px ${space.lg}px`,
  border: `1px solid transparent`,
  cursor: disabled ? "default" : "pointer",
});

const variantStyle = (palette, variant, disabled) => {
  if (disabled) {
    return {
      backgroundColor: palette.bg.subtle,
      color: palette.text.disabled,
      borderColor: palette.border.default,
    };
  }
  if (variant === "primary") {
    return {
      backgroundColor: palette.action.primary,
      color: palette.text.onAction,
      borderColor: palette.action.primary,
    };
  }
  return {
    backgroundColor: palette.bg.default,
    color: palette.text.primary,
    borderColor: palette.border.strong,
  };
};

export const Button = ({
  variant = "secondary",
  disabled = false,
  style,
  ...rest
}) => {
  const palette = useColorPalette();
  const focus = useFocusRing(palette);
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        ...baseStyle(palette, disabled),
        ...variantStyle(palette, variant, disabled),
        ...focus.style,
        ...style,
      }}
      {...focus.handlers}
      {...rest}
    />
  );
};
