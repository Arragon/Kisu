// Page surface（MVP-18 / INH-1159；DES-05 正式构图）。
// 只消费 controller 形状的 { viewModel, actions }；不 import controller/KCL。
// Ink 构图（DESIGN-DIRECTION §6）：主动作 / 翻译设置 / 站点策略三组，
// 组间 1px 发丝线；slot 注册顺序即行为契约（MVP-18..23），不动。
import React from "react";
import { useColorPalette } from "../../primitives";
import { space } from "../../tokens/tokens";
import { PrimaryAction } from "./PrimaryAction";
import { PageDisplayMode } from "./PageDisplayMode";
import { PageLanguageControl } from "./PageLanguageControl";
import { PageProviderPicker } from "./PageProviderPicker";
import { SitePreferenceAction } from "./SitePreferenceAction";
import { PageStatus } from "./PageStatus";

export const PageSurface = ({
  viewModel,
  actions,
  languageOptions,
  languageFallback,
  siteDomain,
  sitePattern,
}) => {
  const palette = useColorPalette();
  return (
    <div
      data-testid="kisu-page-surface"
      style={{ display: "flex", flexDirection: "column", gap: space.md }}
    >
      {/* group: 主翻译动作（MVP-18）——每屏唯一强调元素（全宽 primary） */}
      <PrimaryAction
        viewModel={viewModel}
        onTranslate={actions.translate}
        onStop={actions.stop}
      />

      <div
        role="separator"
        aria-hidden="true"
        data-testid="kisu-page-separator-0"
        style={{ height: 1, flexShrink: 0, backgroundColor: palette.border.default }}
      />

      {/* group: 翻译设置（MVP-19/20/21） */}
      <div
        data-testid="kisu-page-settings-group"
        style={{ display: "flex", flexDirection: "column", gap: space.md }}
      >
        {/* slot: 显示模式（MVP-19） */}
        <PageDisplayMode
          viewModel={viewModel}
          onSetDisplayMode={actions.setDisplayMode}
        />
        {/* slot: 目标语言（MVP-20）；options/fallback 由 product 层注入（OPT_LANGS_TO
            唯一事实源）。未提供时不渲染该 slot——入口组合负责传全量 props。 */}
        {languageOptions && (
          <PageLanguageControl
            viewModel={viewModel}
            options={languageOptions}
            fallbackValue={languageFallback}
            onSetTargetLanguage={actions.setTargetLanguage}
          />
        )}
        {/* slot: Provider picker（MVP-21）；provider 列表随 KCL page 状态下行 */}
        <PageProviderPicker
          viewModel={viewModel}
          onSetProvider={actions.setProvider}
          onManageServices={actions.manageServices}
        />
      </div>

      <div
        role="separator"
        aria-hidden="true"
        data-testid="kisu-page-separator-1"
        style={{ height: 1, flexShrink: 0, backgroundColor: palette.border.default }}
      />

      {/* group: 站点策略（MVP-22）；domain/pattern 由入口组合注入 */}
      <SitePreferenceAction
        viewModel={viewModel}
        domain={siteDomain}
        pattern={sitePattern}
        onSetSitePreference={actions.setSitePreference}
      />

      {/* slot: 状态/错误（MVP-23）——Page 错误呈现统一归宿 */}
      <PageStatus viewModel={viewModel} />
    </div>
  );
};
