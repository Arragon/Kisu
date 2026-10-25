// 字幕显示模式控件（MVP-40 / INH-1181）。
// 三档产品词汇按 docs/product/subtitle-modes.md 冻结：双语·原文优先 /
// 双语·译文优先 / 仅译文 = isBilingual × displayOrder 组合折叠（不发明枚举）。
// 写入经 controller setDisplayMode → KCL next-load（**下次字幕启动生效**，
// 控件内常驻明示）。仅显示词汇支持的模式：unsupported 档（"仅原文"）不出现。
import React from "react";
import { SegmentedControl, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

const OPTIONS = Object.freeze([
  Object.freeze({ value: "original-first", label: "Bilingual · Original first" }),
  Object.freeze({ value: "translation-first", label: "Bilingual · Translation first" }),
  Object.freeze({ value: "translated", label: "Translated only" }),
]);

const toModeValue = (displayMode) =>
  displayMode.bilingual ? displayMode.order : "translated";

const toPatch = (modeValue) =>
  modeValue === "translated"
    ? { bilingual: false }
    : { bilingual: true, order: modeValue };

export const SubtitleModeControl = ({ viewModel, onSetDisplayMode }) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null;
  }
  const disabled = !viewModel.can.changeDisplayMode;
  const options = disabled
    ? OPTIONS.map((option) => ({ ...option, disabled: true }))
    : OPTIONS;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      data-testid="kisu-subtitle-mode"
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
        aria-label="Subtitle display mode"
        options={options}
        value={toModeValue(viewModel.data.displayMode)}
        onChange={(modeValue) =>
          onSetDisplayMode && onSetDisplayMode(toPatch(modeValue))
        }
      />
      <InlineStatus tone="info">Applies from the next video</InlineStatus>
    </div>
  );
};
