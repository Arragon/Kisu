// Semantic Select（MVP-14）：原生 select——键盘/焦点语义免费且最可靠。
// tokens 提供字体与颜色；option 由调用方传入 [{ value, label }]。
import React from "react";
import { useColorPalette } from "./mode";
import { space, type, radius } from "../tokens/tokens";

export const Select = ({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  disabled = false,
  style,
  ...rest
}) => {
  const palette = useColorPalette();
  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange && onChange(event.target.value)}
      style={{
        fontFamily: type.fontFamily,
        fontSize: type.size.md,
        lineHeight: type.lineHeight.normal,
        color: disabled ? palette.text.disabled : palette.text.primary,
        backgroundColor: palette.bg.default,
        borderRadius: radius.sm,
        border: `1px solid ${palette.border.strong}`,
        padding: `${space.xs}px ${space.sm}px`,
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
