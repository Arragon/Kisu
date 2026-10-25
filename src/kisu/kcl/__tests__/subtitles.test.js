import { DEFAULT_SUBTITLE_SETTING } from "../../../../src/config/setting";
import {
  normalizeSubtitleState,
  SUBTITLE_DISPLAY_ORDERS,
} from "../subtitles";
import { readSubtitleRuntime } from "../subtitleRuntime";
import * as kcl from "../index";

const APIS = [
  { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
  { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
];
const base = (subtitleSetting) =>
  subtitleSetting ? { transApis: APIS, subtitleSetting } : { transApis: APIS };

const SNAPSHOT = Object.freeze({
  videoId: "v1",
  mounted: true,
  autoTranslate: true,
  progressed: 10,
  processing: false,
  activeTrackKey: null,
  fromLang: "auto",
});

describe("normalizeSubtitleState defaults (MVP-10)", () => {
  it("projects DEFAULT_SUBTITLE_SETTING when subtitleSetting is absent", () => {
    const { value } = normalizeSubtitleState(base());
    expect(value.enabled).toBe(DEFAULT_SUBTITLE_SETTING.enabled);
    expect(value.displayMode).toEqual({
      bilingual: DEFAULT_SUBTITLE_SETTING.isBilingual,
      order: DEFAULT_SUBTITLE_SETTING.displayOrder,
    });
    expect(value.provider).toEqual({ apiSlug: "Microsoft", registered: true });
    expect(value.targetLanguage).toBe(DEFAULT_SUBTITLE_SETTING.toLang);
    expect(value.autoTranslate).toBe(DEFAULT_SUBTITLE_SETTING.autoTranslate);
    expect(value.segmentation.slug).toBe("-");
    expect(value.context.slug).toBe("-");
    expect(value.runtime).toEqual({ mounted: false });
    expect(Object.isFrozen(value)).toBe(true);
  });

  it("rejects invalid setting objects", () => {
    expect(normalizeSubtitleState(null).error.code).toBe("UNSUPPORTED_INPUT");
  });
});

describe("subtitle display mode composition (MVP-10)", () => {
  it("projects isBilingual × displayOrder as a pair, never an invented enum", () => {
    const { value } = normalizeSubtitleState(
      base({ isBilingual: false, displayOrder: "translation-first" })
    );
    expect(value.displayMode).toEqual({
      bilingual: false,
      order: "translation-first",
    });
    expect(SUBTITLE_DISPLAY_ORDERS).toEqual([
      "original-first",
      "translation-first",
    ]);
  });

  it("falls back to defaults on illegal values", () => {
    const { value } = normalizeSubtitleState(
      base({ isBilingual: "yes", displayOrder: "weird" })
    );
    expect(value.displayMode.bilingual).toBe(DEFAULT_SUBTITLE_SETTING.isBilingual);
    expect(value.displayMode.order).toBe(DEFAULT_SUBTITLE_SETTING.displayOrder);
  });

  it("preserves explicit enabled=false and normalizes non-boolean enabled", () => {
    expect(normalizeSubtitleState(base({ enabled: false })).value.enabled).toBe(
      false
    );
    expect(
      normalizeSubtitleState(base({ enabled: "yes" })).value.enabled
    ).toBe(DEFAULT_SUBTITLE_SETTING.enabled);
  });
});

describe("subtitle provider projection (MVP-10)", () => {
  it("marks unregistered provider references", () => {
    const { value } = normalizeSubtitleState(base({ apiSlug: "ghost" }));
    expect(value.provider).toEqual({ apiSlug: "ghost", registered: false });
  });
});

describe("AI capability detection: present / absent / incompatible (MVP-10)", () => {
  const field = (slug) => {
    const { value } = normalizeSubtitleState(
      base(slug === undefined ? {} : { segSlug: slug })
    );
    return value.segmentation.capability;
  };

  it.each([
    ["absent when unconfigured", "-", false, "not configured"],
    ["present for a registered AI provider", "my-ai", true, null],
    ["incompatible for a machine-translation provider", "Microsoft", false, "not an AI engine"],
    ["unregistered references are not capabilities", "ghost", false, "not registered"],
  ])("%s", (_name, slug, supported, reasonPart) => {
    const cap = field(slug);
    expect(cap.supported).toBe(supported);
    if (reasonPart) {
      expect(cap.reason).toContain(reasonPart);
    }
  });

  it("applies the same classification to aiContextSlug", () => {
    const make = (aiContextSlug) =>
      normalizeSubtitleState(
        base(aiContextSlug === undefined ? {} : { aiContextSlug })
      ).value.context.capability;
    expect(make("-").supported).toBe(false);
    expect(make("my-ai").supported).toBe(true);
    expect(make("Microsoft").reason).toContain("not an AI engine");
    expect(make("ghost").reason).toContain("not registered");
  });
});

describe("subtitle runtime integration (KP-001)", () => {
  it("embeds the KP-001 snapshot when an accessor is injected", () => {
    const { value } = normalizeSubtitleState(base(), {
      getStatus: () => SNAPSHOT,
    });
    expect(value.runtime).toBe(SNAPSHOT);
  });

  it("treats an unmounted runtime as { mounted: false }", () => {
    expect(
      normalizeSubtitleState(base(), { getStatus: () => null }).value.runtime
    ).toEqual({ mounted: false });
  });

  it("surfaces a broken accessor as TRANSPORT_UNAVAILABLE", () => {
    const result = normalizeSubtitleState(base(), {
      getStatus: () => {
        throw new Error("boom");
      },
    });
    expect(result.error.code).toBe("TRANSPORT_UNAVAILABLE");
    expect(
      readSubtitleRuntime(() => {
        throw new Error("x");
      }).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });
});

describe("subtitles surface re-exported from kcl index", () => {
  it("exposes the subtitle read API", () => {
    expect(typeof kcl.normalizeSubtitleState).toBe("function");
    expect(kcl.SUBTITLE_DISPLAY_ORDERS).toBe(SUBTITLE_DISPLAY_ORDERS);
  });
});
