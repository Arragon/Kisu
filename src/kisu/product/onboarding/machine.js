// Onboarding 首次配置状态机（MVP-54 / INH-1195）。
// 纯 JS（无 React/DOM），遵循 view-model 订阅约定。三步：language → service →
// behavior → done；步进/跳过/后退/重入；**收集只在内存，commit() 一次性写入
// EXISTING 事实源（无部分提交——中断即重入，projection map §9）**。
// 写入目标：SETTING（subtitleSetting.toLang/apiSlug + 唯一 ADDITIVE
// kisuMeta.onboardingDone）+ rules 全局条目（"*"：toLang/apiSlug/transOpen，
// 需注入 readRules/writeRules，缺省跳过并在结果明示）。
import { OPT_LANGS_TO } from "../../../config/api";
import { GLOBAL_KEY } from "../../../config/rules";
import { kclOk, kclError } from "../../kcl/result";
import { listProviders } from "../../kcl/providers";

export const ONBOARDING_STEPS = Object.freeze([
  "language",
  "service",
  "behavior",
]);

export const needsOnboarding = (setting) => {
  if (!setting || typeof setting !== "object") {
    return true;
  }
  return !(setting.kisuMeta && setting.kisuMeta.onboardingDone === true);
};

const knownLanguage = (code) => OPT_LANGS_TO.some(([c]) => c === code);

export const createOnboardingMachine = ({ transport } = {}) => {
  if (
    !transport ||
    typeof transport.readSetting !== "function" ||
    typeof transport.writeSetting !== "function"
  ) {
    throw new TypeError(
      "createOnboardingMachine requires transport.readSetting/writeSetting"
    );
  }
  let state = Object.freeze({ step: "language", collected: Object.freeze({}) });
  const listeners = new Set();
  let disposed = false;

  const emit = () => {
    listeners.forEach((listener) => {
      listener(state);
    });
  };

  const stepIndex = () => ONBOARDING_STEPS.indexOf(state.step);

  const advance = (collected) => {
    const next = stepIndex() + 1;
    state = Object.freeze({
      step: next >= ONBOARDING_STEPS.length ? "done" : ONBOARDING_STEPS[next],
      collected: Object.freeze({ ...state.collected, ...collected }),
    });
    emit();
  };

  return {
    getView: () => state,
    subscribe: (listener) => {
      if (typeof listener !== "function") {
        throw new TypeError("subscribe requires a listener function");
      }
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    // 步 1：目标语言（翻译目标码，OPT_LANGS_TO 校验）
    selectLanguage: (toLang) => {
      if (state.step !== "language") {
        return kclError("UNSUPPORTED_INPUT", `expected step "language", got "${state.step}"`);
      }
      if (typeof toLang !== "string" || !knownLanguage(toLang)) {
        return kclError("UNSUPPORTED_INPUT", `unknown language code "${toLang}"`);
      }
      advance({ toLang });
      return kclOk(state);
    },
    // 步 2：翻译服务（注册表校验，#6）
    selectService: async (apiSlug) => {
      if (state.step !== "service") {
        return kclError("UNSUPPORTED_INPUT", `expected step "service", got "${state.step}"`);
      }
      const setting = await transport.readSetting();
      const registry = listProviders(setting);
      const apis = registry.ok ? registry.value : [];
      if (!apis.some((p) => p.apiSlug === apiSlug)) {
        return kclError("PROVIDER_NOT_FOUND", `unknown provider slug "${apiSlug}"`);
      }
      advance({ apiSlug });
      return kclOk(state);
    },
    // 步 3：页面自动开翻译偏好（默认行为；YouTube/Selection 保持上游默认）
    setPageAutoOpen: (autoOpen) => {
      if (state.step !== "behavior") {
        return kclError("UNSUPPORTED_INPUT", `expected step "behavior", got "${state.step}"`);
      }
      if (typeof autoOpen !== "boolean") {
        return kclError("UNSUPPORTED_INPUT", "setPageAutoOpen requires a boolean");
      }
      advance({ pageAutoOpen: autoOpen });
      return kclOk(state);
    },
    // 跳过当前步（收集留空，直接前进）
    skip: () => {
      if (state.step === "done") {
        return kclOk(state);
      }
      advance({});
      return kclOk(state);
    },
    // 后退一步（已收集的后续步数据作废，重入语义）
    back: () => {
      const index = stepIndex();
      if (state.step === "done") {
        state = Object.freeze({
          step: ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1],
          collected: Object.freeze({}),
        });
      } else if (index > 0) {
        state = Object.freeze({
          step: ONBOARDING_STEPS[index - 1],
          collected: Object.freeze({}),
        });
      }
      emit();
      return kclOk(state);
    },
    // 统一提交：SETTING（含唯一 ADDITIVE 标记）+ rules 全局条目（可选注入）
    commit: async () => {
      if (disposed) {
        return kclError("UNSUPPORTED_INPUT", "machine disposed");
      }
      const collected = state.collected;
      let setting;
      try {
        setting = await transport.readSetting();
      } catch (err) {
        return kclError(
          "TRANSPORT_UNAVAILABLE",
          `readSetting failed: ${err && err.message ? err.message : String(err)}`
        );
      }
      let rulesApplied = false;
      if (typeof transport.readRules === "function" && typeof transport.writeRules === "function") {
        let rules;
        try {
          rules = await transport.readRules();
        } catch (err) {
          return kclError(
            "TRANSPORT_UNAVAILABLE",
            `readRules failed: ${err && err.message ? err.message : String(err)}`
          );
        }
        const list = Array.isArray(rules) ? rules : [];
        const globalIndex = list.findIndex((item) => item && item.pattern === GLOBAL_KEY);
        const globalRule = globalIndex >= 0 ? { ...list[globalIndex] } : { pattern: GLOBAL_KEY };
        if (collected.toLang !== undefined) {
          globalRule.toLang = collected.toLang;
        }
        if (collected.apiSlug !== undefined) {
          globalRule.apiSlug = collected.apiSlug;
        }
        if (collected.pageAutoOpen !== undefined) {
          globalRule.transOpen = collected.pageAutoOpen ? "true" : "false";
        }
        const nextRules =
          globalIndex >= 0
            ? list.map((item, i) => (i === globalIndex ? globalRule : item))
            : [...list, globalRule];
        try {
          await transport.writeRules(() => nextRules);
          rulesApplied = true;
        } catch (err) {
          return kclError(
            "TRANSPORT_UNAVAILABLE",
            `writeRules failed: ${err && err.message ? err.message : String(err)}`
          );
        }
      }
      try {
        await transport.writeSetting((pre) => ({
          ...pre,
          subtitleSetting: {
            ...(pre && pre.subtitleSetting ? pre.subtitleSetting : {}),
            ...(collected.toLang !== undefined ? { toLang: collected.toLang } : {}),
            ...(collected.apiSlug !== undefined ? { apiSlug: collected.apiSlug } : {}),
          },
          kisuMeta: {
            ...(pre && pre.kisuMeta ? pre.kisuMeta : {}),
            onboardingDone: true,
          },
        }));
      } catch (err) {
        return kclError(
          "TRANSPORT_UNAVAILABLE",
          `writeSetting failed: ${err && err.message ? err.message : String(err)}`
        );
      }
      state = Object.freeze({ step: "done", collected: Object.freeze({ ...collected }) });
      emit();
      return kclOk(Object.freeze({ rulesApplied, collected: { ...collected } }));
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
    },
  };
};
