// Page 状态/错误呈现（MVP-23 / INH-1164）——Page 错误呈现的统一归宿。
// 只消费 view-model 的 error（归一化 {code, message}，无 stack）与 blockedBy。
// 优先级：error > blockedBy > active 进行中提示；idle 静默（主按钮已表达——
// 上游无独立 "user stopped" 状态，页面状态只有 rule.transOpen，不发明语义）。
import React from "react";
import { InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

// 归一化错误码 → 可行动信息（KCL 错误码单一来源：kcl/result.js）
const ERROR_HINTS = {
  TRANSPORT_UNAVAILABLE:
    "Cannot reach the page. Reopen the popup or refresh the page.",
  PROVIDER_NOT_FOUND: "The selected service is gone — pick another below.",
  PROVIDER_REQUEST_FAILED:
    "The service request failed (credentials, rate limit or network). Check the service or try again.",
  UNSUPPORTED_INPUT: "This action is not available here.",
};

const BLOCK_HINTS = {
  site: "Translation is disabled for this site — use Reset below to re-enable.",
  provider: "The configured service is unavailable — pick another below.",
};

export const PageStatus = ({ viewModel }) => {
  const palette = useColorPalette();
  if (!viewModel.data && !viewModel.error) {
    return null; // loading 由 shell 占位呈现
  }

  let tone = null;
  let text = null;
  if (viewModel.error) {
    tone = "error";
    const hint = ERROR_HINTS[viewModel.error.code];
    // code + message 均来自归一化契约；不渲染任何调用栈形状的内容
    text = hint
      ? `${hint}${viewModel.error.message ? ` (${viewModel.error.message})` : ""}`
      : `${viewModel.error.code}: ${viewModel.error.message}`;
  } else if (viewModel.blockedBy) {
    tone = "warning";
    text = BLOCK_HINTS[viewModel.blockedBy] || `Blocked (${viewModel.blockedBy}).`;
  } else if (viewModel.status === "active") {
    tone = "info";
    text = "Translating this page…";
  }

  if (!tone) {
    return null;
  }
  return (
    <div data-testid="kisu-page-status" style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
      <InlineStatus tone={tone}>{text}</InlineStatus>
      {viewModel.error && process.env.NODE_ENV !== "production" && (
        <span
          style={{
            fontSize: type.size.sm,
            color: palette.text.disabled,
          }}
        >
          {`debug: ${viewModel.error.code}`}
        </span>
      )}
    </div>
  );
};
