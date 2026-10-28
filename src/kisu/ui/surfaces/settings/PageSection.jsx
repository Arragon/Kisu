// Page 设置 section（MVP-49 / INH-1190）。
// 只消费 #14 冻结的 page view-model 与动作——与 Popup 同源命令
// （setTargetLanguage/setProvider/setDisplayMode 经 PUTRULE），round-trip 一致性
// 由共享 controller 保证。provider 选项来自 view-model 的注册表投影（#20 同款）。
import React from "react";
import { Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type, radius } from "../../tokens/tokens";

const MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: "original-first", label: "Bilingual · Original first" }),
  Object.freeze({ value: "translation-first", label: "Bilingual · Translation first" }),
  Object.freeze({ value: "translated", label: "Translated only" }),
]);

const toModeValue = (displayMode) =>
  displayMode.onlyTranslation ? "translated" : displayMode.order;

const toPatch = (modeValue) =>
  modeValue === "translated"
    ? { onlyTranslation: true }
    : { onlyTranslation: false, order: modeValue };

export const PageSection = ({
  viewModel,
  actions,
  languageOptions,
}) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null; // loading/error 由 shell/调用方呈现
  }
  const { displayMode, provider, providers, targetLanguage } = viewModel.data;
  const providerOptions = providers
    .filter((p) => p.usable)
    .map((p) => ({ value: p.apiSlug, label: p.name }));
  const providerAvailable = providerOptions.some(
    (o) => o.value === provider.apiSlug
  );

  return (
    <div
      data-testid="kisu-settings-page"
      style={{ display: "flex", flexDirection: "column", gap: space.md }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
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
          aria-label="Page target language"
          options={languageOptions}
          value={targetLanguage}
          disabled={!viewModel.can.changeLanguage}
          onChange={(next) => actions.setTargetLanguage && actions.setTargetLanguage(next)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span
          style={{
            fontSize: type.size.sm,
            fontWeight: type.weight.medium,
            color: palette.text.secondary,
          }}
        >
          Translation service
        </span>
        <Select
          aria-label="Page translation service"
          options={providerOptions}
          value={providerAvailable ? provider.apiSlug : providerOptions[0] ? providerOptions[0].value : ""}
          disabled={!viewModel.can.changeProvider || providerOptions.length === 0}
          onChange={(next) => actions.setProvider && actions.setProvider(next)}
        />
        {!providerAvailable && provider.apiSlug && (
          <InlineStatus tone="warning" style={{ overflowWrap: "anywhere" }}>
            {`Service "${provider.apiSlug}" is no longer available — pick another`}
          </InlineStatus>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span
          style={{
            fontSize: type.size.sm,
            fontWeight: type.weight.medium,
            color: palette.text.secondary,
          }}
        >
          Display
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.xs }}>
          {MODE_OPTIONS.map((option) => {
            const selected = toModeValue(displayMode) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                disabled={!viewModel.can.changeDisplayMode}
                onClick={() =>
                  actions.setDisplayMode && actions.setDisplayMode(toPatch(option.value))
                }
                style={{
                  fontFamily: type.fontFamily,
                  fontSize: type.size.sm,
                  padding: `${space.xs}px ${space.sm}px`,
                  borderRadius: radius.round,
                  border: `1px solid ${selected ? palette.action.primary : palette.border.default}`,
                  backgroundColor: selected ? palette.action.primary : palette.bg.default,
                  color: selected ? palette.text.onAction : palette.text.primary,
                  cursor: viewModel.can.changeDisplayMode ? "pointer" : "default",
                }}
                data-testid={`kisu-page-mode-${option.value}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
