// KCL Provider 安全列表与 descriptor（MVP-08 / INH-1149）。
// 单一事实源：setting.transApis（src/config/setting.js:264）；能力位按 apiType
// 派生自上游 API_SPE_TYPES（src/config/api.js:129）。不复制 Provider schema、
// 不做 per-provider「密钥已配好」判断（那需要复制上游校验逻辑）——usable 仅表示
// 结构可解析且 apiType 是已知引擎；配置完整性由 Settings/Manage Services 复用
// 上游编辑器呈现。
import { API_SPE_TYPES } from "../../config/api";
import { kclOk, kclError } from "./result";

const CAPABILITY_KEYS = Object.freeze(
  Object.keys(API_SPE_TYPES).sort()
);

const hasType = (set, apiType) =>
  set instanceof Set ? set.has(apiType) : false;

// 字段白名单：无论上游条目还带哪些字段（apiKey、secret 等），descriptor 只输出以下内容。
const projectProvider = (entry) => {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const apiSlug = typeof entry.apiSlug === "string" ? entry.apiSlug : "";
  if (!apiSlug) {
    return null; // 无 slug 的条目不可被引用，不进入列表
  }
  const apiType = typeof entry.apiType === "string" ? entry.apiType : "";
  const capabilities = {};
  CAPABILITY_KEYS.forEach((key) => {
    capabilities[key] = apiType ? hasType(API_SPE_TYPES[key], apiType) : false;
  });
  return Object.freeze({
    apiSlug,
    name:
      typeof entry.apiName === "string" && entry.apiName
        ? entry.apiName
        : apiSlug,
    apiType: apiType || null,
    usable: Boolean(apiType) && hasType(API_SPE_TYPES.builtin, apiType),
    capabilities: Object.freeze(capabilities),
  });
};

const readRegistry = (setting) => {
  if (!setting || typeof setting !== "object") {
    return kclError("UNSUPPORTED_INPUT", "providers require a setting object");
  }
  const apis = Array.isArray(setting.transApis) ? setting.transApis : [];
  return kclOk(
    Object.freeze(
      apis.map(projectProvider).filter((p) => p !== null)
    )
  );
};

// 全量 provider descriptor 列表（冻结、无凭据）。
export const listProviders = (setting) => readRegistry(setting);

// 单个 provider descriptor；未注册/已删除的 slug → PROVIDER_NOT_FOUND。
// 与上游 TranCont 的查找语义一致：取第一条 slug 匹配的条目。
export const getProvider = (setting, apiSlug) => {
  const list = readRegistry(setting);
  if (!list.ok) {
    return list;
  }
  if (typeof apiSlug !== "string" || !apiSlug) {
    return kclError("UNSUPPORTED_INPUT", "getProvider requires a non-empty apiSlug");
  }
  const found = list.value.find((p) => p.apiSlug === apiSlug);
  if (!found) {
    return kclError(
      "PROVIDER_NOT_FOUND",
      `provider "${apiSlug}" is not present in setting.transApis`
    );
  }
  return kclOk(found);
};

// 批量解析引用（如 page provider、划词多选 apiSlugs）：
// 返回 { resolved, missing }，让"删除/失效引用可识别"落在产品层可消费的形状上。
export const resolveProviders = (setting, apiSlugs) => {
  const list = readRegistry(setting);
  if (!list.ok) {
    return list;
  }
  if (!Array.isArray(apiSlugs)) {
    return kclError("UNSUPPORTED_INPUT", "resolveProviders requires an array of apiSlugs");
  }
  const resolved = [];
  const missing = [];
  apiSlugs.forEach((slug) => {
    const found =
      typeof slug === "string" && slug
        ? list.value.find((p) => p.apiSlug === slug)
        : undefined;
    if (found) {
      resolved.push(found);
    } else {
      missing.push(slug);
    }
  });
  return kclOk(
    Object.freeze({ resolved: Object.freeze(resolved), missing: Object.freeze(missing) })
  );
};
