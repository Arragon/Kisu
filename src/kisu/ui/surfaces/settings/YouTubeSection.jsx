// YouTube 设置 section（MVP-51 / INH-1192）。
// 复用 #33 字幕 controller 的 next-load 命令做设置面 round-trip（与播放器面板
// 同源）；子控件全部来自 ui/surfaces/subtitles（同层组合）：显示模式三档词汇
//（#32）、provider 注册表 picker（#41）、目标语言（OPT_LANGS_TO 注入）、
// Context capability 门控（#43）。next-load 明示由各子控件自带。
import React from "react";
import { Button } from "../../primitives";
import { SubtitleModeControl } from "../subtitles/SubtitleModeControl";
import { SubtitleProviderPicker } from "../subtitles/SubtitleProviderPicker";
import { SubtitleLanguageControl } from "../subtitles/SubtitleLanguageControl";
import { SubtitleContextControl } from "../subtitles/SubtitleContextControl";
import { space } from "../../tokens/tokens";

export const YouTubeSection = ({
  viewModel,
  actions,
  languageOptions,
  languageFallback,
}) => (
  <div
    data-testid="kisu-settings-youtube"
    style={{ display: "flex", flexDirection: "column", gap: space.md }}
  >
    <Button
      variant={viewModel.data && viewModel.data.enabled ? "secondary" : "primary"}
      disabled={!viewModel.data}
      onClick={() =>
        actions.setEnabled && actions.setEnabled(!(viewModel.data && viewModel.data.enabled))
      }
      data-testid="kisu-settings-youtube-toggle"
    >
      {viewModel.data && viewModel.data.enabled ? "Disable subtitles" : "Enable subtitles"}
    </Button>
    <SubtitleModeControl
      viewModel={viewModel}
      onSetDisplayMode={actions.setDisplayMode}
    />
    <SubtitleProviderPicker
      viewModel={viewModel}
      onSetProvider={actions.setProvider}
    />
    <SubtitleLanguageControl
      viewModel={viewModel}
      options={languageOptions}
      fallbackValue={languageFallback}
      onSetTargetLanguage={actions.setTargetLanguage}
    />
    <SubtitleContextControl
      viewModel={viewModel}
      onSetContextMode={actions.setContextMode}
    />
  </div>
);
