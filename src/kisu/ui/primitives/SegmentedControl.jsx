// Semantic SegmentedControl（MVP-14）：单选分段控件，radio 语义。
// 键盘：方向键 / Home / End 切换选项（跳过禁用项，同时更新选择与焦点）。
import React, { useRef } from "react";
import { useColorPalette, useFocusRing } from "./mode";
import { space, type, radius } from "../tokens/tokens";

const Segment = ({ palette, option, selected, onPick, registerRef }) => {
  const focus = useFocusRing(palette);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      disabled={option.disabled}
      ref={(node) => registerRef(node)}
      onClick={() => onPick(option.value)}
      style={{
        fontFamily: type.fontFamily,
        fontSize: type.size.sm,
        fontWeight: selected ? type.weight.strong : type.weight.regular,
        lineHeight: type.lineHeight.normal,
        borderRadius: radius.sm,
        border: `1px solid ${
          selected ? palette.action.primary : palette.border.default
        }`,
        backgroundColor: selected ? palette.action.primary : palette.bg.default,
        color: selected ? palette.text.onAction : palette.text.primary,
        padding: `${space.xs}px ${space.sm}px`,
        cursor: option.disabled ? "default" : "pointer",
        ...focus.style,
      }}
      {...focus.handlers}
    >
      {option.label}
    </button>
  );
};

export const SegmentedControl = ({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  style,
  ...rest
}) => {
  const palette = useColorPalette();
  const refs = useRef([]);

  const registerRef = (index) => (node) => {
    refs.current[index] = node;
  };

  const move = (from, step) => {
    let index = from;
    while (index >= 0 && index < options.length) {
      index += step;
      const option = options[index];
      if (option && !option.disabled) {
        onChange && onChange(option.value);
        const node = refs.current[index];
        if (node) {
          node.focus();
        }
        return;
      }
    }
  };

  const moveFirst = () => {
    const first = options.findIndex((o) => !o.disabled);
    if (first !== -1) {
      onChange && onChange(options[first].value);
      refs.current[first] && refs.current[first].focus();
    }
  };

  const moveLast = () => {
    for (let i = options.length - 1; i >= 0; i -= 1) {
      if (!options[i].disabled) {
        onChange && onChange(options[i].value);
        refs.current[i] && refs.current[i].focus();
        return;
      }
    }
  };

  const onKeyDown = (event) => {
    const current = options.findIndex((o) => o.value === value);
    if (
      event.key === "ArrowRight" ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      move(current === -1 ? -1 : current, 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      if (current === -1) {
        moveLast();
      } else {
        move(current, -1);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFirst();
    } else if (event.key === "End") {
      event.preventDefault();
      moveLast();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{ display: "inline-flex", gap: space.xs, ...style }}
      {...rest}
    >
      {options.map((option, index) => (
        <Segment
          key={option.value}
          palette={palette}
          option={option}
          selected={option.value === value}
          onPick={(v) => onChange && onChange(v)}
          registerRef={registerRef(index)}
        />
      ))}
    </div>
  );
};
