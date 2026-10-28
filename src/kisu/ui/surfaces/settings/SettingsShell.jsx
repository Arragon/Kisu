// Simple Settings 导航骨架（MVP-48 / INH-1189）。
// 只依赖 primitives/tokens（P2-T05 同款约束）；九 section 词汇来自 sections.js
//（PR #42 projection map）。键盘可达：roving tabindex + 方向键在导航项间移动
//（选择与焦点同步）。Advanced section 挂 legacy 入口占位（真实导航归 entry）。
// 各 section 内容（MVP-49..53/60）由调用方以 {id, content} 注入。
import React, { useRef, useState } from "react";
import {
  ModeProvider,
  useColorPalette,
  useFocusRing,
  Surface,
  Button,
} from "../../primitives";
import { sectionLabel, SETTINGS_SECTION_IDS } from "./sections";
import { space, type, radius } from "../../tokens/tokens";

const NavItem = ({ palette, section, active, onSelect, registerRef }) => {
  const focus = useFocusRing(palette);
  return (
    <button
      type="button"
      tabIndex={active ? 0 : -1}
      aria-current={active ? "true" : undefined}
      ref={(node) => registerRef(node)}
      onClick={() => onSelect(section.id)}
      style={{
        fontFamily: type.fontFamily,
        fontSize: type.size.md,
        textAlign: "left",
        padding: `${space.sm}px ${space.md}px`,
        borderRadius: radius.sm,
        border: "none",
        background: active ? palette.bg.subtle : "transparent",
        color: active ? palette.text.primary : palette.text.secondary,
        fontWeight: active ? type.weight.medium : type.weight.regular,
        cursor: "pointer",
        ...focus.style,
      }}
      {...focus.handlers}
    >
      {sectionLabel(section.id)}
    </button>
  );
};

export const SettingsShell = ({
  sections,
  initialId = "general",
  onOpenLegacy,
  mode = "light",
  colorSet = null,
}) => {
  const palette = useColorPalette();
  const refs = useRef([]);
  const [activeId, setActiveId] = useState(initialId);

  const known = sections.filter((s) => SETTINGS_SECTION_IDS.includes(s.id));
  const active = known.find((s) => s.id === activeId) || known[0];

  const move = (step) => {
    const index = known.findIndex((s) => s.id === activeId);
    const next = known[(index + step + known.length) % known.length];
    if (next) {
      setActiveId(next.id);
      const node = refs.current[known.indexOf(next)];
      if (node) {
        node.focus();
      }
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <ModeProvider mode={mode} colorSet={colorSet}>
      <div
        data-testid="kisu-settings-shell"
        style={{ display: "flex", gap: space.lg }}
      >
        <nav
          aria-label="Settings sections"
          onKeyDown={onKeyDown}
          style={{ display: "flex", flexDirection: "column", gap: space.xs }}
        >
          {known.map((section, index) => (
            <NavItem
              key={section.id}
              palette={palette}
              section={section}
              active={section.id === active.id}
              onSelect={setActiveId}
              registerRef={(node) => {
                refs.current[index] = node;
              }}
            />
          ))}
        </nav>
        {/* Ink 构图：内容区是有界容器（1px 发丝线），与左列导航线条分层 */}
        <Surface
          padding="lg"
          bordered
          style={{ flex: 1, minWidth: 0 }}
          data-testid="kisu-settings-content"
        >
          {active ? active.content : null}
          {active && active.id === "advanced" && typeof onOpenLegacy === "function" && (
            <div style={{ marginTop: space.md }}>
              <Button onClick={onOpenLegacy}>Open legacy settings</Button>
            </div>
          )}
        </Surface>
      </div>
    </ModeProvider>
  );
};
