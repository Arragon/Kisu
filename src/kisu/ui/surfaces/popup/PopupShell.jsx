// Neutral Popup shell（MVP-16 / INH-1157）。
// 仅用于功能开发的容器：只依赖 primitives 与 tokens，消费 #14 冻结的 view-model
// 约定。不做品牌级 polish；最终视觉被推翻时只改本文件（tokens/primitives 层），
// 不触碰 controller/KCL。
import React, { useEffect, useRef } from "react";
import {
  ModeProvider,
  useColorPalette,
  Surface,
  IconButton,
  InlineStatus,
} from "../../primitives";
import { describeError } from "../errorHints";
import { space, type } from "../../tokens/tokens";

// 典型扩展 Popup 宽度（与上游 Popup 同宽）。视觉值允许存在于 surface 层；
// 正式 tokens 化留给 Design Freedom Gate。
const POPUP_WIDTH_PX = 360;

const ShellFrame = ({ title, viewModel, onClose, children }) => {
  const palette = useColorPalette();
  const rootRef = useRef(null);

  // 键盘可达：挂载即把焦点移入 shell（tabIndex=-1 不打断 Tab 序，
  // 首个可交互元素紧随其后）
  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.focus();
    }
  }, []);

  const status = viewModel ? viewModel.status : "loading";

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="group"
      aria-label={title}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        padding: space.md,
        fontFamily: type.fontFamily,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: type.size.lg,
            fontWeight: type.weight.strong,
            color: palette.text.primary,
          }}
        >
          {title}
        </span>
        {typeof onClose === "function" && (
          <IconButton label="Close" size="sm" onClick={onClose} />
        )}
      </header>

      {status === "loading" && (
        <div
          data-testid="kisu-popup-loading"
          style={{
            padding: space.xl,
            fontSize: type.size.md,
            color: palette.text.secondary,
          }}
        >
          Loading…
        </div>
      )}
      {status === "error" && viewModel.error && (
        <InlineStatus tone="error">{describeError(viewModel.error)}</InlineStatus>
      )}
      {(status === "idle" || status === "active") && children}
    </div>
  );
};

export const PopupShell = ({
  mode = "light",
  title,
  viewModel,
  onClose,
  children,
}) => (
  <ModeProvider mode={mode}>
    <Surface padding="none" data-testid="kisu-popup-shell" style={{ width: `${POPUP_WIDTH_PX}px` }}>
      <ShellFrame
        title={title}
        viewModel={viewModel}
        onClose={onClose}
        children={children}
      />
    </Surface>
  </ModeProvider>
);
