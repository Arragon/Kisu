// Simple Settings section 注册表（MVP-48 / INH-1189）。
// 九个 section 的 id/label 按 docs/architecture/settings-projection.md（PR #42）
// 冻结；content 由 entry/后续 section 卡（MVP-49..53、60）提供。
export const SETTINGS_SECTION_IDS = Object.freeze([
  "general",
  "services",
  "page",
  "selection",
  "youtube",
  "appearance",
  "sites",
  "advanced",
  "about",
]);

const LABELS = Object.freeze({
  general: "General",
  services: "Translation Services",
  page: "Page",
  selection: "Selection",
  youtube: "YouTube",
  appearance: "Appearance",
  sites: "Sites",
  advanced: "Advanced",
  about: "About",
});

export const sectionLabel = (id) => LABELS[id] || id;
