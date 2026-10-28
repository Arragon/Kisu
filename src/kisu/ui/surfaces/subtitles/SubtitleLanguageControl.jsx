// 字幕目标语言控件（MVP-42 / INH-1183）。
// options/fallback 由 entry 注入（product/subtitles/languages.js，OPT_LANGS_TO
// 唯一事实源）——surface 不 import src/config（P2-T05 规则）。未知存储码安全
// 回退并 InlineStatus 明示；next-load 常驻明示。
import React from "react";
import { Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const SubtitleLanguageControl = ({
  viewModel,
  options,
  fallbackValue,
  onSetTargetLanguage,
}) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null;
  }
  const raw = viewModel.data.targetLanguage;
  const known = options.some((option) => option.value === raw);
  const value = known ? raw : fallbackValue;
  const disabled = !viewModel.can.changeLanguage;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      data-testid="kisu-subtitle-language"
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Subtitle language
      </span>
      <Select
        aria-label="Subtitle language"
        options={options}
        value={value}
        disabled={disabled}
        onChange={(next) => onSetTargetLanguage && onSetTargetLanguage(next)}
      />
      {!known && (
        <InlineStatus tone="info" style={{ overflowWrap: "anywhere" }}>
          {`Unknown language code "${raw}" — using the default`}
        </InlineStatus>
      )}
      <InlineStatus tone="info">Applies from the next video</InlineStatus>
    </div>
  );
};
