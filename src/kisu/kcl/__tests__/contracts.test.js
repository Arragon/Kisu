// KCL semantic contract suite（MVP-12 / INH-1153，P1-D）。
//
// 每个 describe 是一份具名契约，覆盖计划要求的 7 项：Page Provider、Page display
// mode、site preference、Selection Provider、Subtitle display mode、Subtitle
// Provider、context mode capability/映射。
//
// 与普通单测的区别：本套件的固定物（fixture）**全部取自上游真实结构**
// （GLOBLA_RULE / DEFAULT_API_LIST / DEFAULT_SETTING / API_SPE_TYPES），
// 不使用手造 schema。上游字段改名、类型改变或值域变化时，schema 断言或
// 一致性断言必须显式失败——失败即"语义漂移"信号：先核 upstream changelog，
// 再决定改 KCL 还是登记 carried patch。本套件不依赖任何 UI 形态。

import { GLOBLA_RULE, GLOBAL_KEY } from "../../../../src/config/rules";
import {
  DEFAULT_API_LIST,
  API_SPE_TYPES,
  OPT_ALL_TRANS_TYPES,
} from "../../../../src/config/api";
import {
  DEFAULT_SETTING,
  DEFAULT_TRANBOX_SETTING,
  DEFAULT_SUBTITLE_SETTING,
} from "../../../../src/config/setting";
import { isInBlacklist } from "../../../../src/libs/blacklist";
import {
  PAGE_DISPLAY_ORDERS,
  SUBTITLE_DISPLAY_ORDERS,
  normalizePageState,
  setPageDisplayMode,
  setPageProvider,
  setSitePreference,
  getProvider,
  getSelectionProviders,
  normalizeSubtitleState,
  setSubtitleDisplayMode,
  setSubtitleProvider,
  setSubtitleContextMode,
  isSiteBlacklisted,
} from "../index";

const makeSettingTransport = (setting) => {
  const t = { current: setting, writes: 0 };
  // sendTab 仅为满足 page 命令 transport 形状检查；本套件不触发页面消息路径
  t.sendTab = async () => ({});
  t.readSetting = async () => t.current;
  t.writeSetting = async (updater) => {
    t.writes += 1;
    t.current = updater(t.current);
  };
  return t;
};

const API_SLUGS = DEFAULT_API_LIST.map((a) => a.apiSlug);

// ---------------------------------------------------------------------------
// 契约 1 · Page display mode：上游无单一字段，由 transOnly × transOrder 组合

describe("contract: page display mode composes transOnly × transOrder", () => {
  it("schema: the three upstream rule fields exist with string semantics", () => {
    ["transOpen", "transOnly", "transOrder"].forEach((key) => {
      expect(typeof GLOBLA_RULE[key]).toBe("string");
    });
    expect(PAGE_DISPLAY_ORDERS).toContain(GLOBLA_RULE.transOrder);
  });

  it("positive: global defaults project to the documented pair", () => {
    const state = normalizePageState(
      { rule: GLOBLA_RULE, setting: DEFAULT_SETTING },
      "https://example.com/"
    );
    expect(state.displayMode).toEqual({
      onlyTranslation: GLOBLA_RULE.transOnly === "true",
      order: GLOBLA_RULE.transOrder,
    });
  });

  it("positive: the write command speaks upstream's string vocabulary", async () => {
    const t = {
      sendTab: async (action, args) =>
        action === "trans_getrule"
          ? { rule: { ...GLOBLA_RULE }, setting: DEFAULT_SETTING }
          : { ...(args ? { got: args } : {}) },
    };
    const result = await setPageDisplayMode(t, {
      onlyTranslation: true,
      order: "translation-first",
    });
    expect(result.ok).toBe(true);
    expect(result.value.displayMode).toEqual({
      onlyTranslation: true,
      order: "translation-first",
    });
  });

  it("illegal: inheritance marker and unknown orders fall back to global defaults", () => {
    const state = normalizePageState({
      rule: { transOnly: GLOBAL_KEY, transOrder: "diagonal-first" },
    });
    expect(state.displayMode).toEqual({
      onlyTranslation: false,
      order: GLOBLA_RULE.transOrder,
    });
  });
});

// ---------------------------------------------------------------------------
// 契约 2 · Page Provider：rule.apiSlug + GLOBAL_KEY 继承 + transApis 注册表

describe("contract: page provider resolves through setting.transApis", () => {
  it("schema: the global default provider is a registered upstream default", () => {
    expect(API_SLUGS).toContain(GLOBLA_RULE.apiSlug);
    expect(DEFAULT_SETTING.transApis).toBe(DEFAULT_API_LIST);
  });

  it("positive: default rule projects a registered provider", () => {
    const state = normalizePageState(
      { rule: GLOBLA_RULE, setting: DEFAULT_SETTING },
      "https://example.com/"
    );
    expect(state.provider.apiSlug).toBe(GLOBLA_RULE.apiSlug);
    expect(getProvider(DEFAULT_SETTING, GLOBLA_RULE.apiSlug).ok).toBe(true);
  });

  it("positive: GLOBAL_KEY inherits the global default provider", () => {
    const state = normalizePageState({
      rule: { ...GLOBLA_RULE, apiSlug: GLOBAL_KEY },
      setting: DEFAULT_SETTING,
    });
    expect(state.provider.apiSlug).toBe(GLOBLA_RULE.apiSlug);
  });

  it("illegal: unknown slugs are rejected, never silently accepted", () => {
    expect(getProvider(DEFAULT_SETTING, "__nope__").error.code).toBe(
      "PROVIDER_NOT_FOUND"
    );
  });
});

// ---------------------------------------------------------------------------
// 契约 3 · site preference：黑名单字符串格式 + isMatch 语义一致

describe("contract: site preference keeps upstream blacklist semantics", () => {
  const parityCases = [
    ["https://example.com/x", "example.com"],
    ["https://a.example.com/", "example.com\nother.com"],
    ["https://safe.org/", "example.com,other.com"],
    ["https://example.com/", ""],
  ];

  it("schema: the setting default stores the blacklist as a joined string", () => {
    expect(typeof DEFAULT_SETTING.blacklist).toBe("string");
  });

  it.each(parityCases)(
    "parity: Kisu matches upstream isInBlacklist for %j / %j",
    (href, list) => {
      expect(isSiteBlacklisted(href, list)).toBe(isInBlacklist(href, list));
    }
  );

  it("positive/illegal: never/clear round-trip the joined string format", async () => {
    const t = makeSettingTransport({
      ...DEFAULT_SETTING,
      blacklist: "example.com",
    });
    const never = await setSitePreference(t, { mode: "never", domain: "a.com" });
    expect(never.ok).toBe(true);
    expect(t.current.blacklist).toBe("example.com\na.com");
    await setSitePreference(t, { mode: "clear", domain: "a.com" });
    expect(t.current.blacklist).toBe("example.com");
  });
});

// ---------------------------------------------------------------------------
// 契约 4 · Selection Provider：tranboxSetting.apiSlugs 是多选数组

describe("contract: selection providers are a multi-select array", () => {
  it("schema: the upstream default is a non-empty array of registered slugs", () => {
    expect(Array.isArray(DEFAULT_TRANBOX_SETTING.apiSlugs)).toBe(true);
    expect(DEFAULT_TRANBOX_SETTING.apiSlugs.length).toBeGreaterThan(0);
    DEFAULT_TRANBOX_SETTING.apiSlugs.forEach((slug) => {
      expect(API_SLUGS).toContain(slug);
    });
  });

  it("positive: the default selection resolves fully with no stale references", () => {
    const { value } = getSelectionProviders(DEFAULT_SETTING);
    expect(value.resolved.length).toBeGreaterThan(0);
    expect(value.missing).toEqual([]);
  });

  it("illegal: stale references are reported, not dropped silently", () => {
    const { value } = getSelectionProviders({
      ...DEFAULT_SETTING,
      tranboxSetting: {
        ...DEFAULT_TRANBOX_SETTING,
        apiSlugs: [GLOBLA_RULE.apiSlug, "__deleted__"],
      },
    });
    expect(value.missing).toEqual(["__deleted__"]);
  });
});

// ---------------------------------------------------------------------------
// 契约 5 · Subtitle display mode：isBilingual × displayOrder 组合

describe("contract: subtitle display mode composes isBilingual × displayOrder", () => {
  it("schema: both upstream fields keep their documented types and values", () => {
    expect(typeof DEFAULT_SUBTITLE_SETTING.isBilingual).toBe("boolean");
    expect(SUBTITLE_DISPLAY_ORDERS).toContain(
      DEFAULT_SUBTITLE_SETTING.displayOrder
    );
  });

  it("positive: defaults project as a pair and the command round-trips", async () => {
    const { value } = normalizeSubtitleState(DEFAULT_SETTING);
    expect(value.displayMode).toEqual({
      bilingual: DEFAULT_SUBTITLE_SETTING.isBilingual,
      order: DEFAULT_SUBTITLE_SETTING.displayOrder,
    });

    const t = makeSettingTransport(DEFAULT_SETTING);
    const result = await setSubtitleDisplayMode(t, {
      bilingual: false,
      order: "translation-first",
    });
    expect(result.ok).toBe(true);
    expect(t.current.subtitleSetting.isBilingual).toBe(false);
    expect(t.current.subtitleSetting.displayOrder).toBe("translation-first");
  });

  it("illegal: unknown orders fall back to the upstream default", () => {
    const { value } = normalizeSubtitleState({
      ...DEFAULT_SETTING,
      subtitleSetting: {
        ...DEFAULT_SUBTITLE_SETTING,
        displayOrder: "diagonal-first",
        isBilingual: "yes",
      },
    });
    expect(value.displayMode).toEqual({
      bilingual: DEFAULT_SUBTITLE_SETTING.isBilingual,
      order: DEFAULT_SUBTITLE_SETTING.displayOrder,
    });
  });
});

// ---------------------------------------------------------------------------
// 契约 6 · Subtitle Provider：subtitleSetting.apiSlug 走同一注册表

describe("contract: subtitle provider resolves through setting.transApis", () => {
  it("schema: the subtitle default provider is a registered upstream default", () => {
    expect(API_SLUGS).toContain(DEFAULT_SUBTITLE_SETTING.apiSlug);
  });

  it("positive: defaults project a registered provider and persist round-trip", async () => {
    const { value } = normalizeSubtitleState(DEFAULT_SETTING);
    expect(value.provider).toEqual({
      apiSlug: DEFAULT_SUBTITLE_SETTING.apiSlug,
      registered: true,
    });

    const t = makeSettingTransport(DEFAULT_SETTING);
    const target = API_SLUGS.find((s) => s !== DEFAULT_SUBTITLE_SETTING.apiSlug);
    const result = await setSubtitleProvider(t, { apiSlug: target });
    expect(result.ok).toBe(true);
    expect(t.current.subtitleSetting.apiSlug).toBe(target);
  });

  it("illegal: unknown slugs rejected without writing", async () => {
    const t = makeSettingTransport(DEFAULT_SETTING);
    expect(
      (await setSubtitleProvider(t, { apiSlug: "__nope__" })).error.code
    ).toBe("PROVIDER_NOT_FOUND");
    expect(t.writes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 契约 7 · context mode capability/映射：AI 资格与 API_SPE_TYPES.ai 全矩阵一致

describe("contract: context-mode capability mirrors API_SPE_TYPES.ai exactly", () => {
  it("positive/illegal: full engine matrix — capability equals ai-set membership", () => {
    OPT_ALL_TRANS_TYPES.forEach((apiType) => {
      const setting = {
        ...DEFAULT_SETTING,
        transApis: [{ apiSlug: apiType, apiName: apiType, apiType }],
        subtitleSetting: {
          ...DEFAULT_SUBTITLE_SETTING,
          aiContextSlug: apiType,
        },
      };
      const expected = API_SPE_TYPES.ai.has(apiType);
      const { value } = normalizeSubtitleState(setting);
      expect(value.context.capability.supported).toBe(expected);
    });
  });

  it("illegal: non-AI engines are explicitly rejected as CONTEXT_UNSUPPORTED", async () => {
    const machine = OPT_ALL_TRANS_TYPES.find(
      (t) => !API_SPE_TYPES.ai.has(t) && API_SPE_TYPES.machine.has(t)
    );
    const t = makeSettingTransport(DEFAULT_SETTING);
    const result = await setSubtitleContextMode(t, { slug: machine });
    expect(result.error.code).toBe("CONTEXT_UNSUPPORTED");
    expect(t.writes).toBe(0);
  });

  it("positive: disabling via '-' and unregistered slugs stay explicit", async () => {
    const t = makeSettingTransport(DEFAULT_SETTING);
    const off = await setSubtitleContextMode(t, { slug: "-" });
    expect(off.ok).toBe(true);
    expect(off.value.context.capability.supported).toBe(false);
    expect(
      (await setSubtitleContextMode(t, { slug: "__nope__" })).error.code
    ).toBe("PROVIDER_NOT_FOUND");
  });
});
