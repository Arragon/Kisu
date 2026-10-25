// Semantic InlineStatus（MVP-14）：状态行内提示。tone 使用 tokens 的
// status fg/bg 成对 token；role="status" 提供 aria-live 语义。
import React from "react";
import { useColorPalette } from "./mode";
import { space, type, radius } from "../tokens/tokens";

const TONES = ["info", "success", "warning", "error"];

export const InlineStatus = ({ tone = "info", children, style, ...rest }) => {
  const palette = useColorPalette();
  const pair = TONES.includes(tone) ? palette.status[tone] : palette.status.info;
  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: type.fontFamily,
        fontSize: type.size.sm,
        lineHeight: type.lineHeight.normal,
        borderRadius: radius.sm,
        padding: `${space.xs}px ${space.sm}px`,
        backgroundColor: pair.bg,
        color: pair.fg,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
};
