// Page Provider picker（MVP-21 / INH-1162）。
// 消费 view-model 里的 Provider KCL 白名单 descriptor（#6）：名称来自注册表、
// 当前 provider 失效时给出可恢复状态（警告 + 原始 slug + 可切换），
// 附 Manage Services 跳转入口（真实导航属 P6 Settings，此处为回调占位）。
import React from "react";
import { Select, InlineStatus, Button, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const PageProviderPicker = ({
  viewModel,
  onSetProvider,
  onManageServices,
}) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null; // loading/error 由 shell 占位呈现
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
      data-testid="kisu-page-provider"
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Translation service
      </span>
      <div style={{ display: "flex", gap: space.sm, alignItems: "center" }}>
        <Select
          aria-label="Translation service"
          options={options}
          value={value}
          disabled={disabled || options.length === 0}
          onChange={(next) => onSetProvider && onSetProvider(next)}
          // Ink 构图：Select 与伴随按钮同行时 Select 吃满剩余宽度（长名称安全，
          // DESIGN-DIRECTION §6）
          style={{ flex: 1, minWidth: 0 }}
        />
        <Button disabled={disabled} onClick={onManageServices}>
          Manage…
        </Button>
      </div>
      {!currentAvailable && provider.apiSlug && (
        <InlineStatus tone="warning" style={{ overflowWrap: "anywhere" }}>
          {`Provider "${provider.apiSlug}" is no longer available — pick another or manage services`}
        </InlineStatus>
      )}
    </div>
  );
};
