// Advanced / Legacy 设置 escape hatch（MVP-53 / INH-1194）。
// projection map §8 点名的全部未产品化能力在此保持可达：唯一入口 = 打开上游
// legacy Options（onOpenLegacy 导航契约，真实导航归 entry——上游 options 页本身
// 是 TRACK 面不复制）。清单冻结导出，作为可达性契约（漏一个即测试失败）。
import React from "react";
import { Button, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

export const LEGACY_CAPABILITIES = Object.freeze([
  "minLength / maxLength / newlineLength (段落长度)",
  "httpTimeout / transInterval (请求节奏)",
  "clearCache / autoTranslateClipboard",
  "injectRules / preInit / transAllnow",
  "csplist / orilist (CSP 与 Origin 改写)",
  "skipLangs / translateVariants",
  "langDetector",
  "mouseHoverSetting (悬停翻译)",
  "inputRule (输入框翻译)",
  "touchModes (触屏翻译)",
  "contextMenuType / fabClickAction",
  "rootMargin / customStyles",
  "subrulesList (订阅规则源)",
  "prompts (自定义提示词)",
  "logLevel (调试日志)",
]);

export const AdvancedSection = ({ onOpenLegacy }) => {
  const palette = useColorPalette();
  return (
    <div
      data-testid="kisu-settings-advanced"
      style={{ display: "flex", flexDirection: "column", gap: space.md }}
    >
      <InlineStatus tone="info" style={{ overflowWrap: "anywhere" }}>
        Everything below lives in the legacy settings — Kisu does not hide or
        duplicate it.
      </InlineStatus>
      {/* escape hatch 是本 section 唯一强调动作（Ink §6：每屏一个强调元素） */}
      <Button
        variant="primary"
        onClick={onOpenLegacy}
        disabled={typeof onOpenLegacy !== "function"}
        data-testid="kisu-advanced-open-legacy"
      >
        Open legacy settings
      </Button>
      <span
        style={{
          fontSize: type.size.sm,
          fontWeight: type.weight.medium,
          color: palette.text.secondary,
        }}
      >
        Capabilities reachable only here
      </span>
      <ul
        style={{
          margin: 0,
          paddingLeft: space.lg,
          display: "flex",
          flexDirection: "column",
          gap: space.xs,
        }}
        data-testid="kisu-advanced-capabilities"
      >
        {LEGACY_CAPABILITIES.map((item) => (
          <li
            key={item}
            style={{
              fontSize: type.size.sm,
              lineHeight: type.lineHeight.normal,
              color: palette.text.secondary,
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};
