// General 设置 section（MVP-60 / INH-1226）。
// projection map §1：uiLang Select（EXISTING 直写）、darkMode 说明（主题由
// ModeProvider 消费，此处不做第二字段）、shortcuts 只读展示。
// options 由 entry 注入（UI_LANGS 唯一事实源）；写入经 onUpdate（product 层
// updateGeneralUiLang 的 read-merge-write）。
import React from "react";
import { Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

const formatShortcut = (keys) =>
  Array.isArray(keys) ? keys.join(" + ") : String(keys);

export const GeneralSection = ({ setting, uiLangOptions, onUpdate }) => {
  const palette = useColorPalette();
  if (!setting) {
    return null;
  }
  const { uiLang, uiLangRaw, darkMode, shortcuts } = setting;
  const shortcutEntries = Object.entries(shortcuts);

  return (
    <div
      data-testid="kisu-settings-general"
      style={{ display: "flex", flexDirection: "column", gap: space.md }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span
          style={{
            fontSize: type.size.sm,
            fontWeight: type.weight.medium,
            color: palette.text.secondary,
          }}
        >
          Interface language
        </span>
        <Select
          aria-label="Interface language"
          options={uiLangOptions}
          value={uiLang}
          onChange={(next) => onUpdate && onUpdate({ uiLang: next })}
        />
                {uiLangRaw && uiLangRaw !== uiLang && (
          <InlineStatus tone="info" style={{ overflowWrap: "anywhere" }}>
            {`Unknown language code "${uiLangRaw}" — using the default`}
          </InlineStatus>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span
          style={{
            fontSize: type.size.sm,
            fontWeight: type.weight.medium,
            color: palette.text.secondary,
          }}
        >
          Appearance
        </span>
        <InlineStatus tone="info" style={{ overflowWrap: "anywhere" }}>
          {`Theme follows "${darkMode}" (light / dark / auto) — colors come from the design tokens`}
        </InlineStatus>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span
          style={{
            fontSize: type.size.sm,
            fontWeight: type.weight.medium,
            color: palette.text.secondary,
          }}
        >
          Keyboard shortcuts
        </span>
        {shortcutEntries.length === 0 ? (
          <InlineStatus tone="info">No shortcuts registered.</InlineStatus>
        ) : (
          <ul
            style={{
              margin: 0,
              paddingLeft: space.lg,
              display: "flex",
              flexDirection: "column",
              gap: space.xs,
            }}
            data-testid="kisu-settings-shortcuts"
          >
            {shortcutEntries.map(([name, keys]) => (
              <li
                key={name}
                style={{
                  fontSize: type.size.sm,
                  color: palette.text.secondary,
                }}
              >
                {`${name}: ${formatShortcut(keys)}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
