// Selection 动作行（MVP-32 / INH-1173）。
// 只按 #27 view-model 的 can 渲染真实可用动作（零占位——can 为假即不渲染）：
// copy（结果就绪）/ retry（= 按呈现类型重跑 translate|lookup）/ provider 切换
// （Select 发 slug，重排序与写盘经 KCL setSelectionProviders，凭据不经过 surface）。
// pronunciation/favorite 无 KCL 支撑，can 未定义即不出现在 V0.1（can 驱动的直接后果）。
import React from "react";
import { Select, useColorPalette, useFocusRing } from "../../primitives";
import { space, type, radius } from "../../tokens/tokens";

const copyableText = (data) => {
  const result = data.result;
  if (!result || result.status !== "ready") {
    return "";
  }
  if (result.kind === "translate") {
    return (result.payload && result.payload.output) || "";
  }
  const payload = result.payload || {};
  const lines = [payload.term || data.text.raw];
  (payload.definitions || []).forEach((entry) => {
    lines.push(entry.pos ? `${entry.pos} ${entry.meaning}` : entry.meaning);
  });
  if (payload.detail) {
    lines.push(payload.detail);
  }
  return lines.join("\n");
};

// 静默文字动作（Ink：内容是强调元素，动作保持安静档）。独立组件持有
// focus ring——每个实例自己的焦点态。
const QuietAction = ({ onClick, testId, palette, children }) => {
  const focus = useFocusRing(palette);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: type.fontFamily,
        fontSize: type.size.sm,
        color: palette.text.secondary,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: space.xs,
        borderRadius: radius.sm,
        ...focus.style,
      }}
      {...focus.handlers}
      data-testid={testId}
    >
      {children}
    </button>
  );
};

export const ActionRow = ({
  viewModel,
  onCopy,
  onTranslate,
  onLookup,
  onSetProvider,
}) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null;
  }
  const { can, data } = viewModel;
  const items = [];

  if (can.copy) {
    items.push({
      key: "copy",
      label: "Copy",
      run: () => onCopy && onCopy(copyableText(data)),
    });
  }
  if (can.translate && data.result) {
    items.push({
      key: "retry",
      label: "Retry",
      run: () => onTranslate && onTranslate(),
    });
  } else if (can.lookup && data.result) {
    items.push({
      key: "retry",
      label: "Retry",
      run: () => onLookup && onLookup(),
    });
  }

  const providers = data.providers.resolved;
  const showProvider = can.switchProvider && providers.length > 0;
  const currentProvider = data.providers.resolved[0] || null;

  return (
    <div
      data-testid="kisu-action-row"
      style={{ display: "flex", gap: space.sm, alignItems: "center" }}
    >
      {items.map((item) => (
        <QuietAction key={item.key} onClick={item.run} testId={`kisu-action-${item.key}`} palette={palette}>
          {item.label}
        </QuietAction>
      ))}
      {showProvider && (
        <Select
          aria-label="Result provider"
          options={providers.map((p) => ({ value: p.apiSlug, label: p.name }))}
          value={currentProvider ? currentProvider.apiSlug : ""}
          onChange={(slug) => onSetProvider && onSetProvider(slug)}
          // 长 provider 名称安全：select 可收缩、不顶开动作行（DESIGN-DIRECTION §6）
          style={{ fontSize: type.size.sm, minWidth: 0, maxWidth: "100%" }}
        />
      )}
    </div>
  );
};
