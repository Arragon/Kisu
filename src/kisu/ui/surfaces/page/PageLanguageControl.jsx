// Page 目标语言控件（MVP-20 / INH-1161）。
// 语言 options 与 fallback 值由 product 层注入（product/page/languages.js，
// 唯一事实源 OPT_LANGS_TO）——surface 不 import src/config（P2-T05 规则）。
// 未知存储码安全回退到 fallback 并用 InlineStatus 明示。
import React from "react";
import { Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const PageLanguageControl = ({
  viewModel,
  options,
  fallbackValue,
  onSetTargetLanguage,
}) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null; // loading/error 由 shell 占位呈现
  }
  const raw = viewModel.data.targetLanguage;
  const known = options.some((option) => option.value === raw);
  const value = known ? raw : fallbackValue;
  const disabled = !viewModel.can.changeLanguage;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      data-testid="kisu-page-language"
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Target language
      </span>
      <Select
        aria-label="Target language"
        options={options}
        value={value}
        disabled={disabled}
        onChange={(next) => onSetTargetLanguage && onSetTargetLanguage(next)}
      />
      {!known && (
        <InlineStatus tone="info">
          {`Unknown language code "${raw}" — using the default`}
        </InlineStatus>
      )}
    </div>
  );
};
