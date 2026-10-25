// Page 站点策略（MVP-22 / INH-1163）。
// 三态：Auto（持久化站点规则并自动开）/ Never（加入黑名单）/ Clear（清除：
// 黑名单移除 + 精确 pattern 的站点规则移除，见 KCL setSitePreference）。
// domain/pattern 由入口组合注入（popup 侧经 getCurTab/getDomainOptions 解析）；
// 只消费 view-model 的 site 状态与动作回调。
import React from "react";
import { Button, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const SitePreferenceAction = ({
  viewModel,
  domain,
  pattern,
  onSetSitePreference,
}) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null; // loading/error 由 shell 占位呈现
  }
  const { autoTranslate, blacklisted } = viewModel.data.site;
  const disabled = !viewModel.can.changeSitePreference;

  const run = (mode) => {
    if (disabled || typeof onSetSitePreference !== "function") {
      return;
    }
    onSetSitePreference(
      mode === "auto" ? { mode, pattern } : { mode, domain }
    );
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      data-testid="kisu-page-site"
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        This site
      </span>
      <div style={{ display: "flex", gap: space.sm }}>
        <Button disabled={disabled} onClick={() => run("auto")}>
          Always translate
        </Button>
        <Button disabled={disabled} onClick={() => run("never")}>
          Never
        </Button>
        <Button disabled={disabled} onClick={() => run("clear")}>
          Reset
        </Button>
      </div>
      {blacklisted && (
        <InlineStatus tone="warning">Translation is off for this site</InlineStatus>
      )}
      {!blacklisted && autoTranslate && (
        <InlineStatus tone="success">Auto-translate is on for this site</InlineStatus>
      )}
    </div>
  );
};
