// Context 模式控件（MVP-43 / INH-1184）。
// capability 四态门控（#9）：仅 supported 可交互；absent/unregistered/incompatible
// 时禁用并呈现 capability.reason（不猜测）。选项 = Off（"-"）+ 可用 AI provider
// （data.providers 过滤 capabilities.ai）。写入经 setContextMode next-load；
// 词汇按 docs/product/subtitle-modes.md：仅承诺"视频摘要参与翻译提示词"，
// <200 字符 transcript 运行时静默跳过（呈现归 MVP-44）。
import React from "react";
import { Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

const OFF = "-";

export const SubtitleContextControl = ({ viewModel, onSetContextMode }) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null;
  }
  const { context, providers } = viewModel.data;
  const supported = context.capability.supported === true;
  // 门控语义（MVP-43 修正，MVP-51 设置面要求可配置）：absent（"-"）可交互——
  // 配置它正是本控件的目的；broken（slug 已设但未注册/不兼容）才禁用并呈现原因。
  const broken = !supported && context.slug !== OFF;
  const disabled = !viewModel.can.changeContext || broken;
  const aiOptions = providers
    .filter((p) => p.usable && p.capabilities.ai === true)
    .map((p) => ({ value: p.apiSlug, label: p.name }));
  const options = [{ value: OFF, label: "Off" }, ...aiOptions];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      data-testid="kisu-subtitle-context"
    >
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Context (video summary)
      </span>
      <Select
        aria-label="Context mode"
        options={options}
        value={context.slug || OFF}
        disabled={disabled}
        onChange={(next) => {
          // disabled 属性之外的双保险：非 supported/can 拒绝时零回调
          if (disabled) {
            return;
          }
          onSetContextMode && onSetContextMode(next);
        }}
      />
      {!supported && (
        <InlineStatus
          tone={broken ? "warning" : "info"}
          data-testid="kisu-subtitle-context-reason"
          // capability 原因 verbatim 呈现（真实性不变），长文案可换行
          style={{ overflowWrap: "anywhere" }}
        >
          {context.capability.reason || "Not available"}
        </InlineStatus>
      )}
      <InlineStatus tone="info">Applies from the next video</InlineStatus>
    </div>
  );
};
