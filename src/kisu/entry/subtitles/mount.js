// 字幕控制挂载入口（MVP-39 / INH-1180）——entry 层：装配 product controller 与
// ui surface 的宿主胶水。独立成层的原因：product 层禁 import ui（P2-T05 gate）、
// surface 层禁 import product（层内隔离），装配只能发生在边界之上。
// 并行挂载契约（youtube-lifecycle.md §3/§4）：只向调用方提供的 host 追加自有
// 容器，不改写上游按钮/菜单；subtitle disabled 时照常挂载；SPA 清理 = destroy()
// 一次性完成退订 + unmount + 控制器 dispose（停轮询定时器）。
import React from "react";
import { createRoot } from "react-dom/client";
import { createSubtitleController } from "../../product/subtitles/controller";
import { SubtitleControl } from "../../ui/surfaces/subtitles/SubtitleControl";
import { SubtitleModeControl } from "../../ui/surfaces/subtitles/SubtitleModeControl";
import { SubtitleProviderPicker } from "../../ui/surfaces/subtitles/SubtitleProviderPicker";
import { SubtitleLanguageControl } from "../../ui/surfaces/subtitles/SubtitleLanguageControl";
import { SubtitleContextControl } from "../../ui/surfaces/subtitles/SubtitleContextControl";
import { SubtitleStatus } from "../../ui/surfaces/subtitles/SubtitleStatus";
import { ModeProvider } from "../../ui/primitives";
import {
  getSubtitleLanguageOptions,
  getSubtitleLanguageFallback,
} from "../../product/subtitles/languages";

export const mountSubtitleControl = ({
  getSetting,
  getStatus,
  writeSetting,
  host,
  mode = "dark",
  intervalMs,
  shouldPoll,
} = {}) => {
  if (!host || typeof host.appendChild !== "function") {
    throw new TypeError("mountSubtitleControl requires a host element");
  }
  const controller = createSubtitleController({
    getSetting,
    getStatus,
    writeSetting,
    intervalMs,
    shouldPoll,
  });
  const frame = document.createElement("div");
  frame.setAttribute("data-kisu-subtitle-control", "");
  host.appendChild(frame);
  const root = createRoot(frame);
  const renderView = (view) => {
    root.render(
      <ModeProvider mode={mode}>
        <SubtitleControl viewModel={view} actions={controller.actions}>
          {/* MVP-40 slot：显示模式（后续卡逐个填充 MVP-41..44） */}
          <SubtitleModeControl
            viewModel={view}
            onSetDisplayMode={controller.actions.setDisplayMode}
          />
          {/* MVP-41 slot：字幕服务 */}
          <SubtitleProviderPicker
            viewModel={view}
            onSetProvider={controller.actions.setProvider}
          />
          {/* MVP-42 slot：目标语言（OPT_LANGS_TO 唯一事实源经 entry 注入） */}
          <SubtitleLanguageControl
            viewModel={view}
            options={getSubtitleLanguageOptions()}
            fallbackValue={getSubtitleLanguageFallback()}
            onSetTargetLanguage={controller.actions.setTargetLanguage}
          />
          {/* MVP-43 slot：Context 模式（capability 四态门控） */}
          <SubtitleContextControl
            viewModel={view}
            onSetContextMode={controller.actions.setContextMode}
          />
          {/* MVP-44 slot：状态/失败（被动行，不阻塞播放） */}
          <SubtitleStatus viewModel={view} />
        </SubtitleControl>
      </ModeProvider>
    );
  };
  const unsubscribe = controller.subscribe(renderView); // 立即回放当前视图
  let destroyed = false;

  return {
    element: frame,
    controller,
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      unsubscribe();
      root.unmount();
      if (frame.parentNode) {
        frame.parentNode.removeChild(frame);
      }
      controller.dispose(); // 停轮询定时器
    },
  };
};
