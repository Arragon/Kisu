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
      // Provider 注册表投影（MVP-41）：白名单 descriptor 随状态下行（Page 同款，PR #20）
      providers: apis,
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

// ---------------------------------------------------------------------------
// 写命令（MVP-11 / INH-1152）——D3 的 M0 回退语义：next-load。
//
// 所有命令只经注入的 setting 读写器持久化 `subtitleSetting`，下次字幕系统启动
// （新视频/页面刷新）生效；M0 不做实时切换——上游 `updateSetting` 的实时通道
// （isBilingual/displayOrder/segSlug/aiContextSlug/autoTranslate 六字段）不向 KCL
// 开放（KP-001 只读），实时化需 KP-002 扩展，留待 D3 正式拍板。产品层 UI 必须
// 向用户明示"下次加载生效"。
// 每条命令写后重读 setting 并返回归一化投影，验证真实持久状态而非乐观值。

const asTransport = (transport) =>
  transport &&
  typeof transport === "object" &&
  typeof transport.readSetting === "function" &&
  typeof transport.writeSetting === "function"
    ? transport
    : null;

const transportError = (detail) => kclError("TRANSPORT_UNAVAILABLE", detail);

const persistSubtitlePatch = async (transport, patch) => {
  const t = asTransport(transport);
  if (!t) {
    return transportError(
      "subtitle commands require transport.readSetting/writeSetting"
    );
  }
  let setting;
  try {
    setting = await t.readSetting();
  } catch (err) {
    return transportError(
      `readSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  try {
    await t.writeSetting((pre) => ({
      ...pre,
      subtitleSetting: {
        ...(pre && pre.subtitleSetting ? pre.subtitleSetting : {}),
        ...patch,
      },
    }));
  } catch (err) {
    return transportError(
      `writeSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  let next;
  try {
    next = await t.readSetting();
  } catch (err) {
    return transportError(
      `readSetting (verify) failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  return normalizeSubtitleState(next);
};

// 启用/停用字幕翻译（持久化，next-load 生效）。
export const setSubtitleEnabled = (transport, { enabled } = {}) => {
  if (typeof enabled !== "boolean") {
    return Promise.resolve(
      kclError("UNSUPPORTED_INPUT", "setSubtitleEnabled requires { enabled: boolean }")
    );
  }
  return persistSubtitlePatch(transport, { enabled });
};

// 设置显示模式（isBilingual × displayOrder，持久化，next-load 生效）。
export const setSubtitleDisplayMode = (
  transport,
  { bilingual, order } = {}
) => {
  if (bilingual === undefined && order === undefined) {
    return Promise.resolve(
      kclError(
        "UNSUPPORTED_INPUT",
        "setSubtitleDisplayMode requires bilingual and/or order"
      )
    );
  }
  if (bilingual !== undefined && typeof bilingual !== "boolean") {
    return Promise.resolve(
      kclError("UNSUPPORTED_INPUT", "bilingual must be boolean")
    );
  }
  if (order !== undefined && !SUBTITLE_DISPLAY_ORDERS.includes(order)) {
    return Promise.resolve(
      kclError(
        "UNSUPPORTED_INPUT",
        `order must be one of ${SUBTITLE_DISPLAY_ORDERS.join(", ")}`
      )
    );
  }
  const patch = {};
  if (bilingual !== undefined) {
    patch.isBilingual = bilingual;
  }
  if (order !== undefined) {
    patch.displayOrder = order;
  }
  return persistSubtitlePatch(transport, patch);
};

// 设置字幕 Provider（持久化，next-load 生效）。经 transApis 注册表校验，
// 未知引用整批拒绝。
export const setSubtitleProvider = async (transport, { apiSlug } = {}) => {
  if (typeof apiSlug !== "string" || !apiSlug) {
    return kclError(
      "UNSUPPORTED_INPUT",
      "setSubtitleProvider requires { apiSlug: non-empty string }"
    );
  }
  const t = asTransport(transport);
  if (!t) {
    return transportError(
      "subtitle commands require transport.readSetting/writeSetting"
    );
  }
  let setting;
  try {
    setting = await t.readSetting();
  } catch (err) {
    return transportError(
      `readSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  const registry = listProviders(setting);
  const apis = registry.ok ? registry.value : [];
  if (!apis.some((p) => p.apiSlug === apiSlug)) {
    return kclError(
      "PROVIDER_NOT_FOUND",
      `provider "${apiSlug}" is not registered in setting.transApis`
    );
  }
  return persistSubtitlePatch(t, { apiSlug });
};

// 设置字幕目标语言（持久化，next-load 生效）。
export const setSubtitleTargetLanguage = (transport, { toLang } = {}) => {
  if (typeof toLang !== "string" || !toLang) {
    return Promise.resolve(
      kclError(
        "UNSUPPORTED_INPUT",
        "setSubtitleTargetLanguage requires { toLang: non-empty string }"
      )
    );
  }
  return persistSubtitlePatch(transport, { toLang });
};

// 设置上下文模式（aiContextSlug，持久化，next-load 生效）。
// "-" 关闭；否则必须解析到注册的 **AI** provider——不支持/不兼容时显式拒绝
// （CONTEXT_UNSUPPORTED / PROVIDER_NOT_FOUND），绝不静默假成功。
export const setSubtitleContextMode = async (transport, { slug } = {}) => {
  if (typeof slug !== "string" || !slug) {
    return kclError(
      "UNSUPPORTED_INPUT",
      'setSubtitleContextMode requires { slug: non-empty string or "-" }'
    );
  }
  if (slug === REMAIN_KEY) {
    return persistSubtitlePatch(transport, { aiContextSlug: REMAIN_KEY });
  }
  const t = asTransport(transport);
  if (!t) {
    return transportError(
      "subtitle commands require transport.readSetting/writeSetting"
    );
  }
  let setting;
  try {
    setting = await t.readSetting();
  } catch (err) {
    return transportError(
      `readSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  const registry = listProviders(setting);
  const apis = registry.ok ? registry.value : [];
  const found = apis.find((p) => p.apiSlug === slug);
  if (!found) {
    return kclError(
      "PROVIDER_NOT_FOUND",
      `provider "${slug}" is not registered in setting.transApis`
    );
  }
  if (found.capabilities.ai !== true) {
    return kclError(
      "CONTEXT_UNSUPPORTED",
      `provider "${slug}" (${found.apiType}) is not an AI engine; context mode requires an AI provider`
    );
  }
  return persistSubtitlePatch(t, { aiContextSlug: slug });
};
