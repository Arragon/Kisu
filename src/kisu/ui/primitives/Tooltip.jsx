// Semantic Tooltip（MVP-14）：焦点/悬停显示的说明标签。
// aria-describedby 关联；键盘可达——当子元素可聚焦时 focus 即显示。
import React, { useId, useState } from "react";
import { useColorPalette } from "./mode";
import { space, type, radius, zIndex } from "../tokens/tokens";

export const Tooltip = ({ label, children, style, ...rest }) => {
  const palette = useColorPalette();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      aria-describedby={open ? tooltipId : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{ position: "relative", display: "inline-flex", ...style }}
      {...rest}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: space.xs,
            fontFamily: type.fontFamily,
            fontSize: type.size.sm,
            lineHeight: type.lineHeight.normal,
            whiteSpace: "nowrap",
            backgroundColor: palette.bg.inverse,
            color: palette.text.inverse,
            borderRadius: radius.sm,
            padding: `${space.xs}px ${space.sm}px`,
            zIndex: zIndex.overlay,
            pointerEvents: "none",
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
};
