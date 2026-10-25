import { DEFAULT_SUBTITLE_SETTING } from "../../../../src/config/setting";
import {
  normalizeSubtitleState,
  SUBTITLE_DISPLAY_ORDERS,
  setSubtitleEnabled,
  setSubtitleDisplayMode,
  setSubtitleProvider,
  setSubtitleTargetLanguage,
  setSubtitleContextMode,
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

// ---------------------------------------------------------------------------
// 写命令（MVP-11，next-load / D3 M0 回退）

const makeSettingTransport = (setting) => {
  const t = { current: setting, writes: 0 };
  t.readSetting = async () => t.current;
  t.writeSetting = async (updater) => {
    t.writes += 1;
    t.current = updater(t.current);
  };
  return t;
};

const SUB_SETTING = {
  transApis: APIS,
  subtitleSetting: {
    enabled: true,
    apiSlug: "Microsoft",
    toLang: "zh-CN",
    isBilingual: true,
    displayOrder: "original-first",
    segSlug: "-",
    aiContextSlug: "-",
  },
};

describe("setSubtitleEnabled (MVP-11, next-load)", () => {
  it("persists enabled and returns the re-read normalized state", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    const result = await setSubtitleEnabled(t, { enabled: false });
    expect(result.ok).toBe(true);
    expect(t.current.subtitleSetting.enabled).toBe(false);
    expect(result.value.enabled).toBe(false);
    expect(result.value.targetLanguage).toBe("zh-CN"); // 邻近字段保留
  });

  it("rejects non-boolean enabled without writing", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    expect((await setSubtitleEnabled(t, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(t.writes).toBe(0);
  });
});

describe("setSubtitleDisplayMode (MVP-11, next-load)", () => {
  it("persists the isBilingual × displayOrder pair", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    const result = await setSubtitleDisplayMode(t, {
      bilingual: false,
      order: "translation-first",
    });
    expect(result.ok).toBe(true);
    expect(t.current.subtitleSetting.isBilingual).toBe(false);
    expect(t.current.subtitleSetting.displayOrder).toBe("translation-first");
    expect(result.value.displayMode).toEqual({
      bilingual: false,
      order: "translation-first",
    });
  });

  it("supports partial updates and rejects illegal values without writing", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    await setSubtitleDisplayMode(t, { order: "translation-first" });
    expect(t.current.subtitleSetting.isBilingual).toBe(true);
    expect(t.current.subtitleSetting.displayOrder).toBe("translation-first");

    expect(
      (await setSubtitleDisplayMode(t, { order: "weird" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (await setSubtitleDisplayMode(t, { bilingual: "yes" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect((await setSubtitleDisplayMode(t, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(t.writes).toBe(1);
  });
});

describe("setSubtitleProvider (MVP-11, next-load)", () => {
  it("persists a registered provider", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    const result = await setSubtitleProvider(t, { apiSlug: "my-ai" });
    expect(result.ok).toBe(true);
    expect(t.current.subtitleSetting.apiSlug).toBe("my-ai");
    expect(result.value.provider).toEqual({
      apiSlug: "my-ai",
      registered: true,
    });
  });

  it("rejects unknown slugs without writing", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    expect((await setSubtitleProvider(t, { apiSlug: "ghost" })).error.code).toBe(
      "PROVIDER_NOT_FOUND"
    );
    expect((await setSubtitleProvider(t, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(t.writes).toBe(0);
  });
});

describe("setSubtitleTargetLanguage (MVP-11, next-load)", () => {
  it("persists the target language", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    const result = await setSubtitleTargetLanguage(t, { toLang: "ja" });
    expect(result.ok).toBe(true);
    expect(t.current.subtitleSetting.toLang).toBe("ja");
    expect(result.value.targetLanguage).toBe("ja");
  });

  it("rejects empty values without writing", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    expect((await setSubtitleTargetLanguage(t, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(t.writes).toBe(0);
  });
});

describe("setSubtitleContextMode (MVP-11, next-load)", () => {
  it('persists "-" as disabled and an AI slug as supported', async () => {
    const t = makeSettingTransport({
      ...SUB_SETTING,
      subtitleSetting: { ...SUB_SETTING.subtitleSetting, aiContextSlug: "my-ai" },
    });
    const result = await setSubtitleContextMode(t, { slug: "-" });
    expect(result.ok).toBe(true);
    expect(result.value.context.capability.supported).toBe(false);

    const t2 = makeSettingTransport(SUB_SETTING);
    const result2 = await setSubtitleContextMode(t2, { slug: "my-ai" });
    expect(result2.ok).toBe(true);
    expect(t2.current.subtitleSetting.aiContextSlug).toBe("my-ai");
    expect(result2.value.context.capability.supported).toBe(true);
  });

  it("explicitly rejects incompatible and unregistered context modes", async () => {
    const t = makeSettingTransport(SUB_SETTING);
    const incompatible = await setSubtitleContextMode(t, {
      slug: "Microsoft",
    });
    expect(incompatible.error.code).toBe("CONTEXT_UNSUPPORTED");
    expect(incompatible.error.message).toContain("not an AI engine");

    const ghost = await setSubtitleContextMode(t, { slug: "ghost" });
    expect(ghost.error.code).toBe("PROVIDER_NOT_FOUND");

    expect((await setSubtitleContextMode(t, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(t.writes).toBe(0); // 显式拒绝，无静默写入
  });
});

describe("subtitle command transport handling (MVP-11)", () => {
  it("requires setting accessors and maps accessor failures", async () => {
    expect(
      (await setSubtitleEnabled({}, { enabled: true })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
    const t = makeSettingTransport(SUB_SETTING);
    t.writeSetting = async () => {
      throw new Error("storage gone");
    };
    expect(
      (await setSubtitleEnabled(t, { enabled: false })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });

  it("exposes the subtitle command API from the kcl index", () => {
    expect(typeof kcl.setSubtitleEnabled).toBe("function");
    expect(typeof kcl.setSubtitleDisplayMode).toBe("function");
    expect(typeof kcl.setSubtitleProvider).toBe("function");
    expect(typeof kcl.setSubtitleTargetLanguage).toBe("function");
    expect(typeof kcl.setSubtitleContextMode).toBe("function");
  });
});
