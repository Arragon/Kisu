// 字幕控制面（MVP-39 / INH-1180）。
// 只消费 #33 冻结的 subtitle view-model 与动作；**disabled 时照常挂载**（逃生舱
// 语义，见 youtube-lifecycle.md §3）。并行挂载原则：不触碰上游按钮/菜单，
// placement 由 entry 层（mount）决定。MVP-40..44 控件经 children slot 逐卡加入。
import React from "react";
import { Button, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const SubtitleControl = ({ viewModel, actions, children }) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    if (viewModel.error) {
      return (
        <InlineStatus tone="error" data-testid="kisu-subtitle-error">
          {`${viewModel.error.code}: ${viewModel.error.message}`}
        </InlineStatus>
      );
    }
    return (
      <InlineStatus tone="info" data-testid="kisu-subtitle-loading">
        Loading…
      </InlineStatus>
    );
  }

  const { enabled, runtime } = viewModel.data;
  const statusText = !enabled
    ? "Subtitles are disabled"
    : runtime.processing
      ? "Translating subtitles…"
      : runtime.mounted
        ? "Subtitles active"
        : "No subtitles on this video yet";
  const statusTone = !enabled
    ? "warning"
    : runtime.processing
      ? "info"
      : runtime.mounted
        ? "success"
        : "info";

  return (
    <div
      data-testid="kisu-subtitle-control"
      style={{ display: "flex", flexDirection: "column", gap: space.sm }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: type.size.md,
            fontWeight: type.weight.medium,
            color: palette.text.primary,
          }}
        >
          Subtitles
        </span>
        <Button
          variant={enabled ? "secondary" : "primary"}
          onClick={() => actions.setEnabled && actions.setEnabled(!enabled)}
          data-testid="kisu-subtitle-toggle"
        >
          {enabled ? "Disable" : "Enable"}
        </Button>
      </div>
      <InlineStatus tone={statusTone} data-testid="kisu-subtitle-status">
        {statusText}
      </InlineStatus>
      {/* slot: 显示模式（MVP-40） */}
      {/* slot: Provider（MVP-41） */}
      {/* slot: 目标语言（MVP-42） */}
      {/* slot: Context（MVP-43） */}
      {/* slot: 状态/失败（MVP-44） */}
      {children}
    </div>
  );
};
