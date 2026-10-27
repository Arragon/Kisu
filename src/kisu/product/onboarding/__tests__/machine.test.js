// Onboarding 状态机测试（MVP-54 / INH-1195）。
// 验收：三步步进/跳过/后退/重入、注册表校验、统一提交（SETTING + rules 全局条目
// + 唯一 ADDITIVE 标记）、needsOnboarding 分流、中断重入。
import {
  createOnboardingMachine,
  needsOnboarding,
  ONBOARDING_STEPS,
} from "../machine";
import { DEFAULT_SETTING } from "../../../../config/setting";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

const APIS = [
  { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
  { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
];

const makeWorld = ({ setting, rules, withRules = true } = {}) => {
  const env = {
    setting:
      setting === undefined
        ? { transApis: APIS, subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING } }
        : setting,
    rules:
      rules === undefined
        ? [{ pattern: "*", toLang: "zh-CN", apiSlug: "Microsoft", transOpen: "false" }]
        : rules,
    writes: { setting: 0, rules: 0 },
  };
  env.transport = {
    readSetting: async () => env.setting,
    writeSetting: async (updater) => {
      env.writes.setting += 1;
      env.setting = updater(env.setting);
    },
  };
  if (withRules) {
    env.transport.readRules = async () => env.rules;
    env.transport.writeRules = async (updater) => {
      env.writes.rules += 1;
      env.rules = updater(env.rules);
    };
  }
  return env;
};

const completeThrough = async (machine, { toLang = "ja", apiSlug = "my-ai", pageAutoOpen = true } = {}) => {
  machine.selectLanguage(toLang);
  await machine.selectService(apiSlug);
  machine.setPageAutoOpen(pageAutoOpen);
};

describe("onboarding machine steps (MVP-54)", () => {
  it("walks language → service → behavior → done", async () => {
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    expect(machine.getView().step).toBe("language");
    machine.selectLanguage("ja");
    expect(machine.getView().step).toBe("service");
    await machine.selectService("my-ai");
    expect(machine.getView().step).toBe("behavior");
    machine.setPageAutoOpen(true);
    expect(machine.getView().step).toBe("done");
    expect(ONBOARDING_STEPS).toEqual(["language", "service", "behavior"]);
    machine.dispose();
  });

  it("validates language and provider without advancing", async () => {
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    expect(machine.selectLanguage("xx-Nope").error.code).toBe("UNSUPPORTED_INPUT");
    expect(machine.getView().step).toBe("language");
    machine.selectLanguage("ja");
    expect(
      (await machine.selectService("ghost")).error.code
    ).toBe("PROVIDER_NOT_FOUND");
    expect(machine.getView().step).toBe("service");
    machine.dispose();
  });

  it("skip advances with empty collection; back discards later data (re-entry)", async () => {
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    machine.selectLanguage("ja");
    machine.skip(); // service skipped
    expect(machine.getView().step).toBe("behavior");
    machine.back();
    expect(machine.getView().step).toBe("service");
    expect(machine.getView().collected).toEqual({}); // 后退作废后续收集
    machine.dispose();
  });

  it("guards step order", async () => {
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    expect((await machine.selectService("my-ai")).error.code).toBe("UNSUPPORTED_INPUT");
    expect((await machine.setPageAutoOpen(true)).error.code).toBe("UNSUPPORTED_INPUT");
    machine.dispose();
  });
});

describe("onboarding commit (MVP-54)", () => {
  it("writes SETTING + rules global entry + the additive marker in one commit", async () => {
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    await completeThrough(machine);
    const result = await machine.commit();
    await flushPromises();
    expect(result.ok).toBe(true);
    expect(result.value.rulesApplied).toBe(true);
    // rules 全局条目更新
    expect(env.rules[0]).toEqual({
      pattern: "*",
      toLang: "ja",
      apiSlug: "my-ai",
      transOpen: "true",
    });
    // SETTING：subtitle 默认 + 唯一 ADDITIVE 标记
    expect(env.setting.subtitleSetting.toLang).toBe("ja");
    expect(env.setting.subtitleSetting.apiSlug).toBe("my-ai");
    expect(env.setting.kisuMeta.onboardingDone).toBe(true);
    expect(machine.getView().step).toBe("done");
    machine.dispose();
  });

  it("skipped steps leave the stored defaults untouched", async () => {
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    machine.selectLanguage("ja");
    machine.skip();
    machine.skip();
    await machine.commit();
    expect(env.setting.subtitleSetting.toLang).toBe("ja");
    expect(env.setting.subtitleSetting.apiSlug).toBe(DEFAULT_SUBTITLE_SETTING.apiSlug);
    expect(env.rules[0].transOpen).toBe("false"); // 未收集不改
    machine.dispose();
  });

  it("without rules accessors commits SETTING only and flags rulesApplied=false", async () => {
    const env = makeWorld({ withRules: false });
    const machine = createOnboardingMachine({ transport: env.transport });
    await completeThrough(machine, { pageAutoOpen: undefined });
    const result = await machine.commit();
    expect(result.ok).toBe(true);
    expect(result.value.rulesApplied).toBe(false);
    expect(env.setting.kisuMeta.onboardingDone).toBe(true);
    machine.dispose();
  });
});

describe("onboarding entry conditions (MVP-54)", () => {
  it("needsOnboarding: fresh install yes; completed no", () => {
    expect(needsOnboarding(undefined)).toBe(true);
    expect(needsOnboarding({ transApis: APIS })).toBe(true);
    expect(needsOnboarding({ kisuMeta: { onboardingDone: true } })).toBe(false);
  });

  it("collecting is in-memory only: no write before commit (interrupt = re-entry)", async () => {
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    machine.selectLanguage("ja");
    await machine.selectService("my-ai");
    machine.setPageAutoOpen(false);
    expect(env.writes).toEqual({ setting: 0, rules: 0 });
    expect(env.setting.kisuMeta).toBeUndefined();
    // 中断 = 丢弃重建，回到第一步
    machine.dispose();
    const again = createOnboardingMachine({ transport: env.transport });
    expect(again.getView().step).toBe("language");
    again.dispose();
  });

  it("requires a setting transport and stops after dispose", () => {
    expect(() => createOnboardingMachine({})).toThrow(TypeError);
    const env = makeWorld();
    const machine = createOnboardingMachine({ transport: env.transport });
    machine.dispose();
    expect(machine.commit()).resolves.toMatchObject({ ok: false });
  });
});
