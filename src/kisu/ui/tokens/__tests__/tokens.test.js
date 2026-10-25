// Tokens 契约测试（MVP-13 / INH-1154）。
// 验收：替换 token 值不改变产品语义（语义键集不变）；light/dark 全量；
// 可访问（WCAG 对比度）；provisional 标记存在。
import {
  TOKEN_STATUS,
  getColorPalette,
  resolveTokens,
  space,
  type,
  radius,
  elevation,
  motion,
  zIndex,
} from "../tokens";

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

describe("tokens contract namespaces (MVP-13)", () => {
  it("is explicitly provisional until the Design Freedom Gate", () => {
    expect(TOKEN_STATUS).toBe("provisional");
  });

  it("defines every required namespace with semantic keys", () => {
    [space, radius, elevation, zIndex].forEach((ns) => {
      expect(Object.isFrozen(ns)).toBe(true);
      expect(Object.keys(ns).length).toBeGreaterThan(0);
    });
    expect(Object.keys(type)).toEqual(
      expect.arrayContaining(["fontFamily", "size", "weight", "lineHeight"])
    );
    expect(Object.keys(motion)).toEqual(
      expect.arrayContaining(["durationMs", "easing"])
    );
  });

  it("provides both light and dark palettes with identical semantic keys", () => {
    const light = getColorPalette("light");
    const dark = getColorPalette("dark");
    [light, dark].forEach((p) => expect(Object.isFrozen(p)).toBe(true));
    expect(semanticSignature(dark)).toBe(semanticSignature(light));
    expect(() => getColorPalette("sepia")).toThrow(TypeError);
  });

  it("pairs every status token as { fg, bg }", () => {
    ["light", "dark"].forEach((mode) => {
      const { status } = getColorPalette(mode);
      Object.values(status).forEach((pair) => {
        expect(Object.keys(pair).sort()).toEqual(["bg", "fg"]);
      });
    });
  });
});

describe("tokens accessibility (WCAG contrast, both modes)", () => {
  const cases = (mode) => {
    const p = getColorPalette(mode);
    return [
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
  };

  it.each(["light", "dark"])("%s palette meets contrast floors", (mode) => {
    cases(mode).forEach(([name, fg, bg, floor]) => {
      const ratio = contrast(fg, bg);
      expect({ name, ratio, floor, pass: ratio >= floor }).toEqual(
        expect.objectContaining({ pass: true })
      );
    });
  });
});

describe("replacing token values must not change semantics (MVP-13 acceptance)", () => {
  const replacement = {
    color: {
      light: {
        bg: { default: "#101010", subtle: "#161616", inverse: "#eeeeee" },
        text: {
          primary: "#eeeeee",
          secondary: "#cccccc",
          disabled: "#888888",
          inverse: "#101010",
          onAction: "#101010",
        },
        border: { default: "#333333", strong: "#555555" },
        action: { primary: "#eeeeee", hover: "#dddddd", active: "#cccccc" },
        status: {
          info: { fg: "#eeeeee", bg: "#101010" },
          success: { fg: "#eeeeee", bg: "#101010" },
          warning: { fg: "#eeeeee", bg: "#101010" },
          error: { fg: "#eeeeee", bg: "#101010" },
        },
      },
      dark: {
        bg: { default: "#000001", subtle: "#000002", inverse: "#fffffe" },
        text: {
          primary: "#fffffe",
          secondary: "#aaaaaa",
          disabled: "#555555",
          inverse: "#000001",
          onAction: "#000001",
        },
        border: { default: "#222222", strong: "#444444" },
        action: { primary: "#fffffe", hover: "#eeeeee", active: "#dddddd" },
        status: {
          info: { fg: "#fffffe", bg: "#000001" },
          success: { fg: "#fffffe", bg: "#000001" },
          warning: { fg: "#fffffe", bg: "#000001" },
          error: { fg: "#fffffe", bg: "#000001" },
        },
      },
    },
    space: { none: 0, xs: 5, sm: 9, md: 13, lg: 20, xl: 28, xxl: 40 },
    radius: { none: 0, sm: 6, md: 12, round: 999 },
  };

  it("resolveTokens keeps the semantic key signature under replacement", () => {
    const original = resolveTokens();
    const replaced = resolveTokens(replacement);
    expect(semanticSignature(replaced)).toBe(semanticSignature(original));
    expect(semanticSignature(replaced.color.light)).toBe(
      semanticSignature(original.color.light)
    );
    expect(Object.isFrozen(replaced)).toBe(true);
    // 值确实被替换（证明这是同一语义槽位上的换值，而非被忽略）
    expect(replaced.space.xs).toBe(5);
    expect(replaced.color.dark.bg.default).toBe("#000001");
  });

  it("resolveTokens falls back to defaults for untouched namespaces", () => {
    const replaced = resolveTokens(replacement);
    expect(replaced.zIndex).toBe(zIndex);
    expect(replaced.motion).toBe(motion);
    expect(replaced.elevation).toBe(elevation);
    expect(replaced.type).toBe(type);
  });
});
