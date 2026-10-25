// 字幕 Provider 选择（MVP-41 / INH-1182）。
// 独立于页面/划词 provider（上游分离字段 subtitleSetting.apiSlug）——只消费
// view-model：data.providers（#9 白名单 descriptor 随状态下行）+ data.provider
// （registered 标记）。失效 provider 给可恢复状态；next-load 常驻明示；
// 凭据不可能出现在 descriptor（#6 白名单）。
import React from "react";
import { Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const SubtitleProviderPicker = ({ viewModel, onSetProvider }) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null;
  }
  const { providers, provider } = viewModel.data;
  const disabled = !viewModel.can.changeProvider;
  const options = providers
    .filter((p) => p.usable)
    .map((p) => ({ value: p.apiSlug, label: p.name }));
  const currentAvailable = options.some((o) => o.value === provider.apiSlug);
  const value = currentAvailable ? provider.apiSlug : options[0] ? options[0].value : "";

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      data-testid="kisu-subtitle-provider"
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Subtitle service
      </span>
      <Select
        aria-label="Subtitle service"
        options={options}
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(next) => onSetProvider && onSetProvider(next)}
      />
      {!currentAvailable && provider.apiSlug && (
        <InlineStatus tone="warning">
          {`Provider "${provider.apiSlug}" is no longer available — pick another`}
        </InlineStatus>
      )}
      <InlineStatus tone="info">Applies from the next video</InlineStatus>
    </div>
  );
};
