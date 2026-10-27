// 字幕状态与失败反馈（MVP-44 / INH-1185）。
// 失败/细节行的统一归宿（基线状态行在 SubtitleControl，此处不重复）：
//   命令失败（归一化 {code,message}）→ internal/provider failure
//   provider 失效（registered=false）→ provider failure
//   无字幕轨（enabled 且 runtime.mounted=false）→ no captions
//   翻译中且已有进度 → translating + 进度细节
// 播放不受错误 UI 阻塞（纯被动 InlineStatus 行，无遮罩无交互要求）；
// 无 raw stack（message 来自归一化契约）；未知错误码经共享 describeError 兜底。
// <200 字符跳过 enrichment 的"本视频未生效"粒度不在快照中——不呈现（不过度承诺）。
import React from "react";
import { InlineStatus, useColorPalette } from "../../primitives";
import { describeError } from "../errorHints";
import { space } from "../../tokens/tokens";

const SUBTITLE_ERROR_LINES = {
  TRANSPORT_UNAVAILABLE: "Subtitle settings are unreachable — the panel will retry.",
  PROVIDER_REQUEST_FAILED: "The subtitle command failed — try again.",
  PROVIDER_NOT_FOUND: "The subtitle service is no longer available.",
};

const subtitleErrorLine = (error) =>
  SUBTITLE_ERROR_LINES[error.code] || describeError(error);

export const SubtitleStatus = ({ viewModel }) => {
  const palette = useColorPalette();
  if (!viewModel.data) {
    return null;
  }
  const { error, data } = viewModel;
  const { provider, runtime, enabled } = data;
  const rows = [];

  if (error) {
    rows.push({
      key: "error",
      tone: "error",
      text: subtitleErrorLine(error),
    });
  }
  if (provider.registered === false) {
    rows.push({
      key: "provider",
      tone: "warning",
      text: `The subtitle service "${provider.apiSlug}" is no longer available — pick another below.`,
    });
  }
  if (enabled && runtime.mounted === false) {
    rows.push({
      key: "no-captions",
      tone: "info",
      text: "No subtitles found on this video yet.",
    });
  }
  if (runtime.processing && runtime.progressed > 0) {
    rows.push({
      key: "progress",
      tone: "info",
      text: `Translating subtitles… ${runtime.progressed}%`,
    });
  }

  if (rows.length === 0) {
    return null;
  }
  return (
    <div
      data-testid="kisu-subtitle-status-detail"
      style={{ display: "flex", flexDirection: "column", gap: space.xs }}
    >
      {rows.map((row) => (
        <InlineStatus key={row.key} tone={row.tone} data-testid={`kisu-subtitle-row-${row.key}`}>
          {row.text}
        </InlineStatus>
      ))}
      {process.env.NODE_ENV !== "production" && error && (
        <span style={{ fontSize: 12, color: palette.text.disabled }}>
          {`debug: ${error.code}`}
        </span>
      )}
    </div>
  );
};
