// 方向切换演示（DES-01 执行 / M1）。
// 同一功能切片（按钮/状态/表面/焦点）在四套方向预设下渲染，switcher 实时切换
// 并支持 dark 切换——证明方向预设端到端流进 primitives（mode 层 colorSet 覆盖）。
// 这是探索 harness，不是决定；DG（DES-02）权力在用户。
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ModeProvider, Button, InlineStatus, Surface } from "../../ui/primitives";
import { DESIGN_DIRECTIONS } from "../../ui/tokens/directions";
import { space, type } from "../../ui/tokens/tokens";

export const DirectionDemo = ({ initialDirectionId = DESIGN_DIRECTIONS[0].id, initialMode = "light" }) => {
  const [directionId, setDirectionId] = useState(initialDirectionId);
  const [mode, setMode] = useState(initialMode);
  const direction =
    DESIGN_DIRECTIONS.find((d) => d.id === directionId) || DESIGN_DIRECTIONS[0];

  return (
    <ModeProvider mode={mode} colorSet={direction.tokens.color}>
      <div data-testid="kisu-direction-demo" style={{ display: "flex", flexDirection: "column", gap: space.md }}>
        <div style={{ display: "flex", gap: space.sm, flexWrap: "wrap" }}>
          {DESIGN_DIRECTIONS.map((d) => (
            <Button
              key={d.id}
              variant={d.id === direction.id ? "primary" : "secondary"}
              aria-pressed={d.id === direction.id}
              onClick={() => setDirectionId(d.id)}
              data-testid={`kisu-direction-${d.id}`}
            >
              {d.label}
            </Button>
          ))}
          <Button
            variant="secondary"
            aria-pressed={mode === "dark"}
            onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            data-testid="kisu-direction-dark-toggle"
          >
            {mode === "dark" ? "Dark" : "Light"}
          </Button>
        </div>
        <Surface padding="lg" bordered data-testid={`kisu-direction-surface-${direction.id}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: space.sm, maxWidth: 360 }}>
            <span style={{ fontSize: type.size.lg, fontWeight: type.weight.strong }}>
              {direction.label}
            </span>
            <span style={{ fontSize: type.size.sm }}>
              {direction.note}
            </span>
            <div style={{ display: "flex", gap: space.sm }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
            </div>
            <div style={{ display: "flex", gap: space.sm }}>
              <InlineStatus tone="info">info</InlineStatus>
              <InlineStatus tone="success">success</InlineStatus>
              <InlineStatus tone="warning">warning</InlineStatus>
              <InlineStatus tone="error">error</InlineStatus>
            </div>
          </div>
        </Surface>
      </div>
    </ModeProvider>
  );
};

export const mountDirectionDemo = ({ host, directionId, mode } = {}) => {
  if (!host || typeof host.appendChild !== "function") {
    throw new TypeError("mountDirectionDemo requires a host element");
  }
  const root = createRoot(host);
  root.render(<DirectionDemo initialDirectionId={directionId} initialMode={mode} />);
  return {
    destroy: () => {
      root.unmount();
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
    },
  };
};
