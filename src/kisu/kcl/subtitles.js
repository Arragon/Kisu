// KCL Subtitle 只读状态与 capability detection（MVP-10 / INH-1151）。
// 只读投影：enabled、显示模式、provider、目标语言、AI 断句/上下文 capability 与
// 运行时状态（KP-001 快照）。
//
// 语义依据 control-paths Path 3：
// - 显示模式无单一上游字段，由 isBilingual × displayOrder 组合表达——**不发明枚举**
// - aiContextSlug 的上游硬约束（YouTubeCaptionProvider.js:822-829）：非 "-"、在
//   transApis 可解析、apiType ∈ API_SPE_TYPES.ai
// - segSlug 上游**不做**硬校验（机器翻译 slug 会运行时抛错后静默回退）；按
//   control-paths 要求，KCL capability 校验把上游没做的验证补上
// - 回退默认取自 DEFAULT_SUBTITLE_SETTING（src/config/setting.js:171，单一事实源）
import { DEFAULT_SUBTITLE_SETTING } from "../../config/setting";
import { kclOk, kclError } from "./result";
import { kclCapability } from "./capabilities";
import { listProviders } from "./providers";
import { readSubtitleRuntime } from "./subtitleRuntime";

export const SUBTITLE_DISPLAY_ORDERS = Object.freeze([
  "original-first",
  "translation-first",
]);

const REMAIN_KEY = "-";

const asString = (v) => (typeof v === "string" ? v : "");

// 按上游 AI 能力约束分类一个 AI slug：
// absent（"-" 未配置）/ unregistered（transApis 无此引用）/ incompatible（非 AI 引擎）/ supported。
const projectAiCapability = (id, slug, apis) => {
  if (!slug || slug === REMAIN_KEY) {
    return kclCapability(id, {
      supported: false,
      reason: 'not configured ("-")',
    });
  }
  const found = apis.find((p) => p.apiSlug === slug);
  if (!found) {
    return kclCapability(id, {
      supported: false,
      reason: `provider "${slug}" is not registered in setting.transApis`,
    });
  }
  if (found.capabilities.ai !== true) {
    return kclCapability(id, {
      supported: false,
      reason: `provider "${slug}" (${found.apiType}) is not an AI engine`,
    });
  }
  return kclCapability(id, { supported: true });
};

// 投影 setting（含 subtitleSetting）为归一化只读字幕状态。
// getStatus 可选注入 KP-001 访问器；未注入时 runtime 为 { mounted: false }。
export const normalizeSubtitleState = (setting, { getStatus } = {}) => {
  if (!setting || typeof setting !== "object") {
    return kclError(
      "UNSUPPORTED_INPUT",
      "normalizeSubtitleState requires a setting object"
    );
  }
  const sub =
    setting.subtitleSetting && typeof setting.subtitleSetting === "object"
      ? setting.subtitleSetting
      : {};
  const D = DEFAULT_SUBTITLE_SETTING;
  const orderRaw = asString(sub.displayOrder);
  const apiSlugRaw = asString(sub.apiSlug);
  const apiSlug = apiSlugRaw || D.apiSlug;
  const segSlug = asString(sub.segSlug) || D.segSlug;
  const aiContextSlug = asString(sub.aiContextSlug) || D.aiContextSlug;

  const registry = listProviders(setting);
  const apis = registry.ok ? registry.value : [];

  const runtimeResult =
    typeof getStatus === "function"
      ? readSubtitleRuntime(getStatus)
      : kclOk(Object.freeze({ mounted: false }));
  if (!runtimeResult.ok) {
    return runtimeResult;
  }

  return kclOk(
    Object.freeze({
      enabled: typeof sub.enabled === "boolean" ? sub.enabled : D.enabled,
      displayMode: Object.freeze({
        bilingual:
          typeof sub.isBilingual === "boolean" ? sub.isBilingual : D.isBilingual,
        order: SUBTITLE_DISPLAY_ORDERS.includes(orderRaw)
          ? orderRaw
          : D.displayOrder,
      }),
      provider: Object.freeze({
        apiSlug,
        registered: apis.some((p) => p.apiSlug === apiSlug),
      }),
      targetLanguage: asString(sub.toLang) || D.toLang,
      autoTranslate:
        typeof sub.autoTranslate === "boolean"
          ? sub.autoTranslate
          : D.autoTranslate,
      segmentation: Object.freeze({
        slug: segSlug,
        capability: projectAiCapability("subtitle.segmentation", segSlug, apis),
      }),
      context: Object.freeze({
        slug: aiContextSlug,
        capability: projectAiCapability("subtitle.context", aiContextSlug, apis),
      }),
      runtime: runtimeResult.value,
    })
  );
};
