// Page 主翻译动作（MVP-18 / INH-1159）。
// 只消费 #14 冻结的 view-model 形状与动作回调——不 import controller/KCL，
// 不读 raw KISS settings。语义：idle → Translate；active → Stop；
// loading / error / blocked → 禁用并给出明确原因（blocked 经 Tooltip）。
import React from "react";
import { Button, Tooltip } from "../../primitives";

const BLOCK_REASONS = {
  site: "Translation is disabled for this site",
  provider: "The configured translation provider is unavailable",
};

export const PrimaryAction = ({ viewModel, onTranslate, onStop }) => {
  const active = viewModel.status === "active";
  const loading = viewModel.status === "loading";
  const error = viewModel.status === "error";
  const blockedReason = viewModel.blockedBy
    ? BLOCK_REASONS[viewModel.blockedBy] || `Blocked (${viewModel.blockedBy})`
    : null;
  const disabled =
    loading || error || (active ? !viewModel.can.stop : !viewModel.can.translate);

  const invoke = () => {
    if (disabled) {
      return;
    }
    const action = active ? onStop : onTranslate;
    if (typeof action === "function") {
      action();
    }
  };

  // 原生 button 已有 Enter/Space 激活语义；显式处理一遍保证行为可测、可审。
  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      invoke();
    }
  };

  const button = (
    <Button
      variant={active ? "secondary" : "primary"}
      disabled={disabled}
      onClick={invoke}
      onKeyDown={onKeyDown}
      aria-busy={loading || undefined}
      // Ink 构图：每屏唯一强调元素，全宽（DESIGN-DIRECTION §6）
      style={{ width: "100%" }}
    >
      {loading ? "Translate…" : active ? "Stop" : "Translate"}
    </Button>
  );

  return blockedReason && !active ? (
    <Tooltip label={blockedReason} style={{ width: "100%" }}>
      {button}
    </Tooltip>
  ) : (
    button
  );
};
