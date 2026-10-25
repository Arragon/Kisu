// 词条/查词结果面（MVP-30 / INH-1171）。
// 只消费 #27 冻结的 selection view-model：data.text.kind === "lexical" 时渲染。
// 词典 payload 形状契约归 runner（入口组合把上游 apiMicrosoftDict/apiYoudaoDict
// 输出映射为 { term?, pronunciation?, definitions?[{pos?,meaning}], detail? }）；
// surface 只渲染，不做上游解释。缺 pronunciation/definitions/detail 自然降级；
// 长释义折叠展开（MVP-31 同法）。风格全部 token 语义名，不写死最终视觉。
import React, { useState } from "react";
import { InlineStatus, Button, useColorPalette } from "../../primitives";
import { describeError } from "../errorHints";
import { space, type, radius } from "../../tokens/tokens";

const DEFINITION_PREVIEW_COUNT = 3;

export const LexicalResult = ({ viewModel }) => {
  const palette = useColorPalette();
  const [detailOpen, setDetailOpen] = useState(false);

  if (!viewModel.data || viewModel.data.text.kind !== "lexical") {
    return null;
  }

  if (viewModel.error) {
    return (
      <InlineStatus tone="error" data-testid="kisu-lexical-error">
        {describeError(viewModel.error)}
      </InlineStatus>
    );
  }

  const result = viewModel.data.result;
  if (!result) {
    return null; // 未执行（unsupported 分支不会到达此处）
  }
  if (result.status === "loading") {
    return (
      <InlineStatus tone="info" data-testid="kisu-lexical-loading">
        Looking up…
      </InlineStatus>
    );
  }
  if (result.status !== "ready") {
    return null;
  }

  const payload = result.payload || {};
  const term = payload.term || viewModel.data.text.raw;
  const definitions = Array.isArray(payload.definitions) ? payload.definitions : [];
  const visible = detailOpen ? definitions : definitions.slice(0, DEFINITION_PREVIEW_COUNT);

  return (
    <div
      data-testid="kisu-lexical-result"
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
    >
      <span
        style={{
          fontSize: type.size.lg,
          fontWeight: type.weight.strong,
          color: palette.text.primary,
        }}
      >
        {term}
      </span>
      {payload.pronunciation && (
        <span
          style={{
            fontSize: type.size.sm,
            color: palette.text.secondary,
          }}
          data-testid="kisu-lexical-pronunciation"
        >
          {payload.pronunciation}
        </span>
      )}
      {visible.length > 0 && (
        <ol
          style={{
            margin: 0,
            paddingLeft: space.lg,
            display: "flex",
            flexDirection: "column",
            gap: space.xs,
            maxHeight: detailOpen ? "none" : 160,
            overflowY: detailOpen ? "visible" : "auto",
            borderRadius: radius.sm,
          }}
          data-testid="kisu-lexical-definitions"
        >
          {visible.map((entry, index) => (
            <li
              key={index}
              style={{
                fontSize: type.size.md,
                lineHeight: type.lineHeight.normal,
                color: palette.text.primary,
              }}
            >
              {entry.pos ? `${entry.pos} ` : ""}
              {entry.meaning}
            </li>
          ))}
        </ol>
      )}
      {definitions.length > DEFINITION_PREVIEW_COUNT && (
        <Button onClick={() => setDetailOpen((open) => !open)}>
          {detailOpen ? "Collapse" : `Expand (${definitions.length})`}
        </Button>
      )}
      {typeof payload.detail === "string" && payload.detail && (
        <span
          style={{
            fontSize: type.size.sm,
            lineHeight: type.lineHeight.relaxed,
            color: palette.text.secondary,
            maxHeight: 160,
            overflowY: "auto",
          }}
          data-testid="kisu-lexical-detail"
        >
          {payload.detail}
        </span>
      )}
    </div>
  );
};
