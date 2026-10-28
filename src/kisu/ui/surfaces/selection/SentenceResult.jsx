// 句子/长文本翻译结果面（MVP-31 / INH-1172）。
// 只消费 #27 冻结的 selection view-model：kind sentence/multiline 时渲染。
// 译文优先、原文次级；streaming 经 result.payload.partial 进入**有界滚动区域**
// （内容在框内增长，禁止每 token 顶开整个 overlay——MVP-31 验收）。
// copy/retry/provider 等动作归 MVP-32 动作行；payload 契约归 runner
// （ready: {output}；loading 流式: {partial}）。
import React from "react";
import { InlineStatus, useColorPalette } from "../../primitives";
import { describeError } from "../errorHints";
import { space, type } from "../../tokens/tokens";

// provisional：有界区域高度；替换属纯值变更。
const BOUNDED_HEIGHT_PX = 220;

export const SentenceResult = ({ viewModel }) => {
  const palette = useColorPalette();
  if (
    !viewModel.data ||
    (viewModel.data.text.kind !== "sentence" &&
      viewModel.data.text.kind !== "multiline")
  ) {
    return null;
  }

  if (viewModel.error) {
    return (
      <InlineStatus
        tone="error"
        data-testid="kisu-sentence-error"
        // 长错误文案安全：可换行、不横向溢出 overlay（DESIGN-DIRECTION §6）
        style={{ overflowWrap: "anywhere" }}
      >
        {describeError(viewModel.error)}
      </InlineStatus>
    );
  }

  const result = viewModel.data.result;
  if (!result) {
    return null;
  }

  const originalText = viewModel.data.text.raw;
  if (result.status === "loading") {
    const partial = result.payload && result.payload.partial;
    return (
      <div
        data-testid="kisu-sentence-loading"
        style={{ display: "flex", flexDirection: "column", gap: space.xs }}
      >
        <div
          style={{
            maxHeight: BOUNDED_HEIGHT_PX,
            overflowY: "auto",
            fontSize: type.size.md,
            lineHeight: type.lineHeight.normal,
            color: palette.text.secondary,
          }}
        >
          {partial || ""}
        </div>
        <InlineStatus tone="info">Translating…</InlineStatus>
      </div>
    );
  }
  if (result.status !== "ready") {
    return null;
  }

  const payload = result.payload || {};
  return (
    <div
      data-testid="kisu-sentence-result"
      style={{ display: "flex", flexDirection: "column", gap: space.sm }}
    >
      {/* 译文优先 */}
      <div
        style={{
          maxHeight: BOUNDED_HEIGHT_PX,
          overflowY: "auto",
          fontSize: type.size.md,
          lineHeight: type.lineHeight.normal,
          color: palette.text.primary,
        }}
        data-testid="kisu-sentence-output"
      >
        {payload.output || ""}
      </div>
      {/* 原文次级 */}
      <div
        style={{
          maxHeight: 120,
          overflowY: "auto",
          fontSize: type.size.sm,
          lineHeight: type.lineHeight.normal,
          color: palette.text.secondary,
        }}
        data-testid="kisu-sentence-original"
      >
        {originalText}
      </div>
    </div>
  );
};
