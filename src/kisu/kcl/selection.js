// KCL Selection 最小接口（MVP-09 / INH-1150）。
// 只包装 control-paths Path 2 冻结的事实：provider = tranboxSetting.apiSlugs
// （多选数组，独立于 page 的 rule.apiSlug）；翻译/词典执行经注入 runner 暴露——
// KCL 不静态 import src/apis/*（其依赖链含 Jest 27 无法加载的 @streamparser/json
// ESM，见 baseline BL-04），真实绑定 apiTranslate/apiDict 在 P4 surface（D5）完成。
import { kclOk, kclError } from "./result";
import { listProviders, resolveProviders } from "./providers";

// 读取划词 provider 多选投影：{ resolved: [descriptor], missing: [slug] }。
// 失效/被删除的引用在 missing 中可识别（descriptor 见 providers.js 白名单）。
export const getSelectionProviders = (setting) => {
  if (!setting || typeof setting !== "object") {
    return kclError("UNSUPPORTED_INPUT", "getSelectionProviders requires a setting object");
  }
  const tb =
    setting.tranboxSetting && typeof setting.tranboxSetting === "object"
      ? setting.tranboxSetting
      : {};
  const slugs = Array.isArray(tb.apiSlugs) ? tb.apiSlugs : [];
  return resolveProviders(setting, slugs);
};

// 设置划词 provider 多选。写入单一事实源 tranboxSetting.apiSlugs（经注入的
// setting 读写器，与上游 Popup 修改路径一致）；顺序保留（上游 UI 以数组顺序排 tab）。
// 任一 slug 未注册 → PROVIDER_NOT_FOUND（整批拒绝，不做部分写入）。
export const setSelectionProviders = async (transport, { apiSlugs } = {}) => {
  if (
    !transport ||
    typeof transport !== "object" ||
    typeof transport.readSetting !== "function" ||
    typeof transport.writeSetting !== "function"
  ) {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      "setSelectionProviders requires transport.readSetting/writeSetting"
    );
  }
  if (
    !Array.isArray(apiSlugs) ||
    apiSlugs.length === 0 ||
    apiSlugs.some((s) => typeof s !== "string" || !s)
  ) {
    return kclError(
      "UNSUPPORTED_INPUT",
      "setSelectionProviders requires a non-empty array of provider slugs"
    );
  }
  let setting;
  try {
    setting = await transport.readSetting();
  } catch (err) {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      `readSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  const registry = listProviders(setting);
  if (!registry.ok) {
    return registry;
  }
  const unknown = apiSlugs.filter(
    (s) => !registry.value.some((p) => p.apiSlug === s)
  );
  if (unknown.length > 0) {
    return kclError(
      "PROVIDER_NOT_FOUND",
      `unknown provider slugs: ${unknown.join(", ")}`
    );
  }
  try {
    await transport.writeSetting((pre) => ({
      ...pre,
      tranboxSetting: {
        ...(pre && pre.tranboxSetting ? pre.tranboxSetting : {}),
        apiSlugs: [...apiSlugs],
      },
    }));
  } catch (err) {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      `writeSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  return kclOk(Object.freeze({ apiSlugs: Object.freeze([...apiSlugs]) }));
};

// 翻译执行包装器。runner 收到 { text, fromLang, toLang, apiSetting }；
// apiSetting 由产品层从 setting.transApis 解析（KCL descriptor 不含凭据）。
// runner 抛错 → PROVIDER_REQUEST_FAILED（归一化，不向产品层泄漏裸异常）。
export const translateSelection = async (
  { text, fromLang, toLang, apiSetting } = {},
  { run } = {}
) => {
  if (typeof run !== "function") {
    return kclError("UNSUPPORTED_INPUT", "translateSelection requires a run executor");
  }
  if (typeof text !== "string" || !text.trim()) {
    return kclError("UNSUPPORTED_INPUT", "translateSelection requires non-empty text");
  }
  if (fromLang !== undefined && (typeof fromLang !== "string" || !fromLang)) {
    return kclError("UNSUPPORTED_INPUT", "fromLang must be a non-empty string when provided");
  }
  if (toLang !== undefined && (typeof toLang !== "string" || !toLang)) {
    return kclError("UNSUPPORTED_INPUT", "toLang must be a non-empty string when provided");
  }
  try {
    return kclOk(await run({ text, fromLang, toLang, apiSetting }));
  } catch (err) {
    return kclError(
      "PROVIDER_REQUEST_FAILED",
      `translate request failed: ${err && err.message ? err.message : String(err)}`
    );
  }
};

// 词典/AI 词典查询包装器，与 translateSelection 同构。
export const lookupSelection = async ({ text } = {}, { run } = {}) => {
  if (typeof run !== "function") {
    return kclError("UNSUPPORTED_INPUT", "lookupSelection requires a run executor");
  }
  if (typeof text !== "string" || !text.trim()) {
    return kclError("UNSUPPORTED_INPUT", "lookupSelection requires non-empty text");
  }
  try {
    return kclOk(await run({ text }));
  } catch (err) {
    return kclError(
      "PROVIDER_REQUEST_FAILED",
      `dictionary request failed: ${err && err.message ? err.message : String(err)}`
    );
  }
};
