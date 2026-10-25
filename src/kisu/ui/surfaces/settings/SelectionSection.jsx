// Selection 设置 section（MVP-50 / INH-1191）。
// projection map §3 五字段；provider 多选用 chips（aria-pressed，非空守卫在
// product 层）；写入经 onUpdate(patch) → product 层 read-merge-write。
import React from "react";
import { Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

const TRIGGER_LABELS = Object.freeze({
  mk_pagescroll: "Smart scroll",
  mk_pageopen: "On page open",
  mk_mouseover: "Hover",
  mk_ctrlKey: "Ctrl + hover",
  mk_shiftKey: "Shift + hover",
  mk_altKey: "Alt + hover",
  click: "Click",
  hover: "Hover",
  select: "On select",
  dblclick: "Double click",
});

export const SelectionSection = ({
  setting,
  triggerOptions,
  dictOptions,
  languageOptions,
  providerOptions,
  onUpdate,
}) => {
  const palette = useColorPalette();
  if (!setting) {
    return null;
  }
  const { triggerMode, apiSlugs, toLang, enDict, singleWordNoTrans } = setting;
  const label = (map, value, fallback) => map[value] || fallback;

  const toggleProvider = (slug) => {
    const next = apiSlugs.includes(slug)
      ? apiSlugs.filter((s) => s !== slug)
      : [...apiSlugs, slug];
    if (next.length === 0) {
      return; // 至少保留一个 provider（product 层亦有非空校验）
    }
    onUpdate && onUpdate({ apiSlugs: next });
  };

  return (
    <div
      data-testid="kisu-settings-selection"
      style={{ display: "flex", flexDirection: "column", gap: space.md }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span style={{ fontSize: type.size.sm, fontWeight: type.weight.medium, color: palette.text.secondary }}>
          Trigger
        </span>
        <Select
          aria-label="Selection trigger"
          options={triggerOptions}
          value={triggerMode}
          onChange={(next) => onUpdate && onUpdate({ triggerMode: next })}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span style={{ fontSize: type.size.sm, fontWeight: type.weight.medium, color: palette.text.secondary }}>
          Providers (multi-select)
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.xs }}>
          {providerOptions.map((p) => {
            const selected = apiSlugs.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleProvider(p.value)}
                style={{
                  fontFamily: type.fontFamily,
                  fontSize: type.size.sm,
                  padding: `${space.xs}px ${space.sm}px`,
                  borderRadius: 999,
                  border: `1px solid ${selected ? palette.action.primary : palette.border.default}`,
                  backgroundColor: selected ? palette.action.primary : palette.bg.default,
                  color: selected ? palette.text.onAction : palette.text.primary,
                  cursor: "pointer",
                }}
                data-testid={`kisu-selection-provider-${p.value}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span style={{ fontSize: type.size.sm, fontWeight: type.weight.medium, color: palette.text.secondary }}>
          Target language
        </span>
        <Select
          aria-label="Selection target language"
          options={languageOptions}
          value={toLang}
          onChange={(next) => onUpdate && onUpdate({ toLang: next })}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span style={{ fontSize: type.size.sm, fontWeight: type.weight.medium, color: palette.text.secondary }}>
          Dictionary
        </span>
        <Select
          aria-label="Selection dictionary"
          options={dictOptions}
          value={enDict}
          onChange={(next) => onUpdate && onUpdate({ enDict: next })}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
        <span style={{ fontSize: type.size.sm, fontWeight: type.weight.medium, color: palette.text.secondary }}>
          Single word
        </span>
        <button
          type="button"
          aria-pressed={singleWordNoTrans}
          onClick={() => onUpdate && onUpdate({ singleWordNoTrans: !singleWordNoTrans })}
          style={{
            alignSelf: "flex-start",
            fontFamily: type.fontFamily,
            fontSize: type.size.sm,
            padding: `${space.xs}px ${space.sm}px`,
            borderRadius: 999,
            border: `1px solid ${singleWordNoTrans ? palette.action.primary : palette.border.default}`,
            backgroundColor: singleWordNoTrans ? palette.action.primary : palette.bg.default,
            color: singleWordNoTrans ? palette.text.onAction : palette.text.primary,
            cursor: "pointer",
          }}
          data-testid="kisu-selection-single-word"
        >
          {singleWordNoTrans ? "Dictionary only" : "Translate and look up"}
        </button>
      </div>

      <InlineStatus tone="info">Applies from the next selection</InlineStatus>
    </div>
  );
};
