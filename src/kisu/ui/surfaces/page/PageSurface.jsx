// Page surface（MVP-18 / INH-1159）：挂入 PopupShell children slot 的页面控件容器。
// 只消费 controller 形状的 { viewModel, actions }；后续 P3 控件（MVP-19..23）
// 在此各注册一行 slot，不改 PopupShell / controller / KCL。
import React from "react";
import { space } from "../../tokens/tokens";
import { PrimaryAction } from "./PrimaryAction";
import { PageDisplayMode } from "./PageDisplayMode";
import { PageLanguageControl } from "./PageLanguageControl";
import { PageProviderPicker } from "./PageProviderPicker";
import { SitePreferenceAction } from "./SitePreferenceAction";

export const PageSurface = ({
  viewModel,
  actions,
  languageOptions,
  languageFallback,
  siteDomain,
  sitePattern,
}) => (
  <div
    data-testid="kisu-page-surface"
    style={{ display: "flex", flexDirection: "column", gap: space.md }}
  >
    {/* slot: 主翻译动作（MVP-18） */}
    <PrimaryAction
      viewModel={viewModel}
      onTranslate={actions.translate}
      onStop={actions.stop}
    />
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
    {/* slot: 站点策略（MVP-22）；domain/pattern 由入口组合注入 */}
    <SitePreferenceAction
      viewModel={viewModel}
      domain={siteDomain}
      pattern={sitePattern}
      onSetSitePreference={actions.setSitePreference}
    />
    {/* slot: 状态/错误（MVP-23） */}
  </div>
);
