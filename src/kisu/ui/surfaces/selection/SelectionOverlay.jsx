// Selection overlay 正式构图（DES-06 / INH-1207）。
// 把三个 MVP 结果面（MVP-30/31/32）组合为正式 overlay 视觉——首个 selection
// 组合根，供后续内容脚本入口消费。Ink 悬浮物规格（DESIGN-DIRECTION §4/§6）：
// Surface bordered（1px 发丝线）+ lift="low"（真悬浮物唯一投影档）+ padding md，
// 结果区在上、动作行常驻在下（ActionRow can 驱动自隐藏）。
// 零行为逻辑：仅 kind 分流 + slot 装配；geometry/lifecycle 归 product 层
// （#64/#65），trigger/KCL 不经此处。
import React from "react";
import { Surface } from "../../primitives";
import { space } from "../../tokens/tokens";
import { LexicalResult } from "./LexicalResult";
import { SentenceResult } from "./SentenceResult";
import { ActionRow } from "./ActionRow";

const isSentenceKind = (kind) => kind === "sentence" || kind === "multiline";

export const SelectionOverlay = ({ viewModel, actions = {} }) => {
  const kind =
    viewModel.data && viewModel.data.text ? viewModel.data.text.kind : null;
  if (kind !== "lexical" && !isSentenceKind(kind)) {
    return null;
  }

  return (
    <Surface
      bordered
      lift="low"
      padding="md"
      data-testid="kisu-selection-overlay"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {kind === "lexical" ? (
        <LexicalResult viewModel={viewModel} />
      ) : (
        <SentenceResult viewModel={viewModel} />
      )}
      <ActionRow
        viewModel={viewModel}
        onCopy={actions.onCopy}
        onTranslate={actions.onTranslate}
        onLookup={actions.onLookup}
        onSetProvider={actions.onSetProvider}
      />
    </Surface>
  );
};
