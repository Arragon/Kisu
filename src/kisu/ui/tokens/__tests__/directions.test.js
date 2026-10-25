// 方向预设测试（M1 DES-01 准备）。
// 验收：四套方向彼此显著不同、语义键集与默认完全一致（换值不改语义）、
// 每套 light/dark 全量通过同一 WCAG 对比度电池（与默认 tokens 同标准）。
import { DESIGN_DIRECTIONS } from "../directions";
import { getColorPalette } from "../tokens";

const hexToRgb = (hex) => {
  const digits = String(hex).replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(digits)) {
    throw new Error(`not a 6-digit hex: ${hex}`);
  }
  const n = parseInt(digits, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const channel = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

const semanticSignature = (obj) =>
  JSON.stringify(
    Object.entries(obj)
      .map(([k, v]) =>
        v && typeof v === "object" ? [k, semanticSignature(v)] : [k, typeof v]
      )
      .sort(([a], [b]) => (a < b ? -1 : 1))
  );

describe("design direction presets (DES-01 preparation)", () => {
  it("offers four directions with distinct ids", () => {
    expect(DESIGN_DIRECTIONS.map((d) => d.id)).toEqual([
      "aurora",
      "ember",
      "ink",
      "paper",
    ]);
  });

  it("keeps the semantic key signature identical to the default tokens", () => {
    const defaultPalette = getColorPalette("light");
    DESIGN_DIRECTIONS.forEach(({ id, tokens }) => {
      expect(semanticSignature(tokens.color.light)).toBe(
        semanticSignature(defaultPalette)
      );
      expect(semanticSignature(tokens.color.dark)).toBe(
        semanticSignature(getColorPalette("dark"))
      );
    });
  });

  it("directions are mutually distinct (a value swap, not a rename)", () => {
    const prints = DESIGN_DIRECTIONS.map(({ id, tokens }) => ({
      id,
      print: JSON.stringify(tokens.color.light),
    }));
    prints.forEach((a, i) => {
      prints.slice(i + 1).forEach((b) => {
        expect(`${a.id} vs ${b.id}`).not.toBe(null);
        expect(a.print === b.print).toBe(false);
      });
    });
  });

  it.each(
    DESIGN_DIRECTIONS.flatMap((d) =>
      ["light", "dark"].map((mode) => [d.id, mode, d.tokens.color[mode]])
    )
  )("%s (%s) passes the WCAG contrast battery", (id, _mode, p) => {
    const cases = [
      ["text.primary on bg.default", p.text.primary, p.bg.default, 4.5],
      ["text.secondary on bg.default", p.text.secondary, p.bg.default, 4.5],
      ["text.secondary on bg.subtle", p.text.secondary, p.bg.subtle, 4.5],
      ["text.inverse on bg.inverse", p.text.inverse, p.bg.inverse, 4.5],
      [
        "text.onAction on action.primary",
        p.text.onAction,
        p.action.primary,
        4.5,
      ],
      ["status.info.fg on .bg", p.status.info.fg, p.status.info.bg, 4.5],
      [
        "status.success.fg on .bg",
        p.status.success.fg,
        p.status.success.bg,
        4.5,
      ],
      [
        "status.warning.fg on .bg",
        p.status.warning.fg,
        p.status.warning.bg,
        4.5,
      ],
      ["status.error.fg on .bg", p.status.error.fg, p.status.error.bg, 4.5],
      ["border.strong is perceivable", p.border.strong, p.bg.default, 3],
    ];
    cases.forEach(([name, fg, bg, floor]) => {
      const ratio = contrast(fg, bg);
      expect({ direction: id, name, ratio, floor, pass: ratio >= floor }).toEqual(
        expect.objectContaining({ pass: true })
      );
    });
  });

  it("carries directional non-color variation (radius/motion where designed)", () => {
    const ink = DESIGN_DIRECTIONS.find((d) => d.id === "ink");
    const paper = DESIGN_DIRECTIONS.find((d) => d.id === "paper");
    expect(ink.tokens.radius.md).toBe(4);
    expect(ink.tokens.motion.durationMs.normal).toBe(0);
    expect(paper.tokens.radius.md).toBe(14);
    expect(paper.tokens.motion.durationMs.normal).toBe(300);
  });
});
