// Existing KISS 用户配置兼容与迁移矩阵（MVP-56 / INH-1197，P6 收官）。
// 收拢已交付适配器（General #44 / Selection #46 / Onboarding #50）的兼容语义为
// 一张矩阵：fresh install / 既有 KISS settings / 多 custom provider / 失效引用 /
// dark / 非英文 / legacy 可达 / 幂等无漂移。硬规则：无 destructive migration、
// 未知键透传、stale 引用保留不删除。
import { DEFAULT_SETTING } from "../../../../config/setting";
import { DEFAULT_TRANBOX_SETTING } from "../../../../config/setting";
import {
  getUiLangOptions,
  readGeneralSetting,
  updateGeneralUiLang,
} from "../general";
import {
  readSelectionSetting,
  updateSelectionSetting,
} from "../selection";
import { needsOnboarding } from "../../onboarding/machine";
import { getProvider, listProviders } from "../../../kcl/providers";
import { LEGACY_CAPABILITIES } from "../../../ui/surfaces/settings/AdvancedSection";

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

const makeTransport = (setting) => {
  const t = { current: setting, writes: 0 };
  t.readSetting = async () => t.current;
  t.writeSetting = async (updater) => {
    t.writes += 1;
    t.current = updater(t.current);
  };
  return t;
};

// 既有 KISS 用户的真实形状：未知键 + 多 custom provider + dark + 非英文
const EXISTING_KISS_SETTING = {
  ...DEFAULT_SETTING,
  uiLang: "zh",
  darkMode: "dark",
  transApis: [
    ...DEFAULT_SETTING.transApis,
    { apiSlug: "my-custom", apiName: "My Custom", apiType: "Custom", apiKey: "sk-1" },
    { apiSlug: "second-custom", apiName: "Second", apiType: "OpenAI", apiKey: "sk-2" },
  ],
  tranboxSetting: {
    ...DEFAULT_TRANBOX_SETTING,
    apiSlugs: ["my-custom", "second-custom"],
  },
  legacyOnlyField: { nested: "keep-me" },
};

describe("migration matrix: fresh install (MVP-56)", () => {
  it("projects upstream defaults and routes fresh users to onboarding", () => {
    const fresh = { ...DEFAULT_SETTING, tranboxSetting: { ...DEFAULT_TRANBOX_SETTING } };
    expect(readGeneralSetting(fresh).value.uiLang).toBe("en");
    expect(readSelectionSetting(fresh).value.apiSlugs).toEqual(
      DEFAULT_TRANBOX_SETTING.apiSlugs
    );
    expect(needsOnboarding(fresh)).toBe(true);
  });
});

describe("migration matrix: existing KISS settings (MVP-56)", () => {
  it("reads an existing user's custom providers without loss", () => {
    const { value } = listProviders(EXISTING_KISS_SETTING);
    const slugs = value.map((p) => p.apiSlug);
    expect(slugs).toContain("my-custom");
    expect(slugs).toContain("second-custom");
    expect(getProvider(EXISTING_KISS_SETTING, "my-custom").ok).toBe(true);
    // 凭据不进 descriptor
    expect(JSON.stringify(value)).not.toContain("sk-1");
  });

  it("general write preserves dark/非英文 neighbours and unknown keys", async () => {
    const t = makeTransport(EXISTING_KISS_SETTING);
    const result = await updateGeneralUiLang(t, { uiLang: "ja" });
    await flushPromises();
    expect(result.ok).toBe(true);
    expect(t.current.uiLang).toBe("ja");
    expect(t.current.darkMode).toBe("dark");
    expect(t.current.legacyOnlyField).toEqual({ nested: "keep-me" });
    expect(t.current.transApis).toHaveLength(EXISTING_KISS_SETTING.transApis.length);
  });

  it("selection writes preserve unknown keys and non-touched tranbox fields", async () => {
    const t = makeTransport(EXISTING_KISS_SETTING);
    const result = await updateSelectionSetting(t, { triggerMode: "hover" });
    await flushPromises();
    expect(result.ok).toBe(true);
    expect(t.current.tranboxSetting.triggerMode).toBe("hover");
    expect(t.current.tranboxSetting.apiSlugs).toEqual(["my-custom", "second-custom"]);
    expect(t.current.legacyOnlyField).toEqual({ nested: "keep-me" });
  });

  it("stale provider references survive reads and are only rejected at write time", async () => {
    const withStale = {
      ...EXISTING_KISS_SETTING,
      tranboxSetting: {
        ...EXISTING_KISS_SETTING.tranboxSetting,
        apiSlugs: ["my-custom", "deleted-long-ago"],
      },
    };
    // 读：保留原样（用户数据不因读取被清洗）
    expect(readSelectionSetting(withStale).value.apiSlugs).toEqual([
      "my-custom",
      "deleted-long-ago",
    ]);
    // 写：失效引用整批拒绝（零写入），但合法批次可以修复
    const t = makeTransport(withStale);
    expect(
      (await updateSelectionSetting(t, { apiSlugs: ["my-custom", "deleted-long-ago"] }))
        .error.code
    ).toBe("PROVIDER_NOT_FOUND");
    const fix = await updateSelectionSetting(t, { apiSlugs: ["my-custom"] });
    await flushPromises();
    expect(fix.ok).toBe(true);
    expect(t.current.tranboxSetting.apiSlugs).toEqual(["my-custom"]);
  });

  it("dark + 非英文 survive a full settings round (no drift)", async () => {
    const t = makeTransport(EXISTING_KISS_SETTING);
    await updateGeneralUiLang(t, { uiLang: "ja" });
    await updateSelectionSetting(t, { singleWordNoTrans: true });
    await flushPromises();
    expect(t.current.uiLang).toBe("ja");
    expect(t.current.darkMode).toBe("dark");
    // 幂等：重复同一 patch 不产生漂移
    const snapshot = JSON.stringify(t.current);
    await updateGeneralUiLang(t, { uiLang: "ja" });
    await updateSelectionSetting(t, { singleWordNoTrans: true });
    await flushPromises();
    expect(JSON.stringify(t.current)).toBe(snapshot);
  });

  it("onboarding split: legacy user not forced; additive marker never destroys", async () => {
    // 旧用户已有 onboardingDone → 不再引导
    expect(needsOnboarding({ ...EXISTING_KISS_SETTING, kisuMeta: { onboardingDone: true } })).toBe(false);
    // additive 写入保留邻近字段
    const t = makeTransport(EXISTING_KISS_SETTING);
    await t.writeSetting((pre) => ({
      ...pre,
      kisuMeta: { ...(pre.kisuMeta || {}), onboardingDone: true },
    }));
    expect(t.current.legacyOnlyField).toEqual({ nested: "keep-me" });
    expect(t.current.kisuMeta.onboardingDone).toBe(true);
  });
});

describe("migration matrix: legacy Advanced reachability (MVP-56)", () => {
  it("every §8 capability stays listed (Advanced escape hatch contract)", () => {
    expect(LEGACY_CAPABILITIES.length).toBe(15);
    const text = LEGACY_CAPABILITIES.join("\n");
    ["minLength", "csplist", "orilist", "mouseHoverSetting", "inputRule", "prompts", "logLevel"].forEach(
      (key) => {
        expect(text).toContain(key);
      }
    );
  });

  it("uiLang options include 非英文 codes", () => {
    expect(getUiLangOptions().some((o) => o.value === "zh")).toBe(true);
  });
});
