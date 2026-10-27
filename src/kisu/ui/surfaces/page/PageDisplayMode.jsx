// Page 显示模式控件（MVP-19 / INH-1160）。
// 消费 view-model 的 displayMode 组合（onlyTranslation × order——上游无单一枚举，
// 控件把组合折叠为三个产品模式并映射回 KCL 补丁）；写入经 controller 动作
// → KCL setPageDisplayMode（PUTRULE 运行态，页面存活期间重开 Popup 保持）。
import React from "react";
import { SegmentedControl, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

const OPTIONS = Object.freeze([
  Object.freeze({ value: "original-first", label: "Bilingual · Original first" }),
  Object.freeze({ value: "translation-first", label: "Bilingual · Translation first" }),
  Object.freeze({ value: "translated", label: "Translated only" }),
]);

// 组合 → 产品模式值（order 在双语两档间才是区分维度）
const toModeValue = (displayMode) =>
  displayMode.onlyTranslation ? "translated" : displayMode.order;

// 产品模式值 → KCL 补丁
const toPatch = (modeValue) =>
  modeValue === "translated"
    ? { onlyTranslation: true }
    : { onlyTranslation: false, order: modeValue };

export const PageDisplayMode = ({ viewModel, onSetDisplayMode }) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null; // loading/error 由 shell 的状态占位呈现
  }
  const disabled = !viewModel.can.changeDisplayMode;
  const options = disabled
    ? OPTIONS.map((option) => ({ ...option, disabled: true }))
    : OPTIONS;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      data-testid="kisu-page-display-mode"
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Display
      </span>
      <SegmentedControl
        aria-label="Display mode"
        options={options}
        value={toModeValue(viewModel.data.displayMode)}
        onChange={(modeValue) =>
          onSetDisplayMode && onSetDisplayMode(toPatch(modeValue))
        }
      />
    </div>
  );
};
