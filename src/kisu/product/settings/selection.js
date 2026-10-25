// Selection 设置的产品层适配（MVP-50 / INH-1191）。
// projection map §3：全部 EXISTING（tranboxSetting 直写，read-merge-write、
// 未知键透传）。校验：triggerMode/enDict 限上游枚举；apiSlugs 经 Provider 注册表
// （#6）校验且非空；枚举/默认单一事实源 = DEFAULT_TRANBOX_SETTING（setting.js:124）。
import { OPT_TRANBOX_TRIGGER_ALL, DEFAULT_TRANBOX_SETTING } from "../../../config/setting";
import { OPT_DICT_ALL } from "../../../config/api";
import { kclOk, kclError } from "../../kcl/result";
import { listProviders } from "../../kcl/providers";

export const getTriggerModeOptions = () =>
  Object.freeze(
    OPT_TRANBOX_TRIGGER_ALL.map((value) =>
      Object.freeze({ value, label: value.replace(/^mk_/, "") })
    )
  );

export const getDictOptions = () =>
  Object.freeze(OPT_DICT_ALL.map((value) => Object.freeze({ value, label: value })));

// 只读投影：缺失/非法值回退 DEFAULT_TRANBOX_SETTING（单一事实源）
export const readSelectionSetting = (setting) => {
  if (!setting || typeof setting !== "object") {
    return kclError("UNSUPPORTED_INPUT", "readSelectionSetting requires a setting object");
  }
  const tb =
    setting.tranboxSetting && typeof setting.tranboxSetting === "object"
      ? setting.tranboxSetting
      : {};
  const D = DEFAULT_TRANBOX_SETTING;
  const triggerMode = OPT_TRANBOX_TRIGGER_ALL.includes(tb.triggerMode)
    ? tb.triggerMode
    : D.triggerMode;
  const apiSlugs = Array.isArray(tb.apiSlugs) ? [...tb.apiSlugs] : [...D.apiSlugs];
  const enDict = OPT_DICT_ALL.includes(tb.enDict) ? tb.enDict : D.enDict;
  return kclOk(
    Object.freeze({
      triggerMode,
      apiSlugs: Object.freeze(apiSlugs),
      toLang: typeof tb.toLang === "string" && tb.toLang ? tb.toLang : D.toLang,
      enDict,
      singleWordNoTrans: tb.singleWordNoTrans === true,
    })
  );
};

// 批量 patch 写入（一次 read-merge-write）：triggerMode/enDict 枚举校验、
// apiSlugs 注册表校验（非空、全部已注册）、singleWordNoTrans 布尔校验；
// 任一非法 → 整批拒绝零写入。
export const updateSelectionSetting = async (transport, patch = {}) => {
  if (
    !transport ||
    typeof transport.readSetting !== "function" ||
    typeof transport.writeSetting !== "function"
  ) {
    return kclError("TRANSPORT_UNAVAILABLE", "updateSelectionSetting requires setting accessors");
  }
  const validated = {};
  if (patch.triggerMode !== undefined) {
    if (!OPT_TRANBOX_TRIGGER_ALL.includes(patch.triggerMode)) {
      return kclError("UNSUPPORTED_INPUT", `unknown triggerMode "${patch.triggerMode}"`);
    }
    validated.triggerMode = patch.triggerMode;
  }
  if (patch.enDict !== undefined) {
    if (!OPT_DICT_ALL.includes(patch.enDict)) {
      return kclError("UNSUPPORTED_INPUT", `unknown enDict "${patch.enDict}"`);
    }
    validated.enDict = patch.enDict;
  }
  if (patch.singleWordNoTrans !== undefined) {
    if (typeof patch.singleWordNoTrans !== "boolean") {
      return kclError("UNSUPPORTED_INPUT", "singleWordNoTrans must be boolean");
    }
    validated.singleWordNoTrans = patch.singleWordNoTrans;
  }
  if (patch.toLang !== undefined) {
    if (typeof patch.toLang !== "string" || !patch.toLang) {
      return kclError("UNSUPPORTED_INPUT", "toLang must be a non-empty string");
    }
    validated.toLang = patch.toLang;
  }
  if (patch.apiSlugs !== undefined) {
    if (
      !Array.isArray(patch.apiSlugs) ||
      patch.apiSlugs.length === 0 ||
      patch.apiSlugs.some((s) => typeof s !== "string" || !s)
    ) {
      return kclError("UNSUPPORTED_INPUT", "apiSlugs must be a non-empty string array");
    }
    const setting = await transport.readSetting();
    const registry = listProviders(setting);
    const apis = registry.ok ? registry.value : [];
    const unknown = patch.apiSlugs.filter(
      (s) => !apis.some((p) => p.apiSlug === s)
    );
    if (unknown.length > 0) {
      return kclError(
        "PROVIDER_NOT_FOUND",
        `unknown provider slugs: ${unknown.join(", ")}`
      );
    }
    validated.apiSlugs = [...patch.apiSlugs];
  }
  if (Object.keys(validated).length === 0) {
    return kclError("UNSUPPORTED_INPUT", "updateSelectionSetting requires a non-empty patch");
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
  try {
    await transport.writeSetting((pre) => ({
      ...pre,
      tranboxSetting: {
        ...(pre && pre.tranboxSetting ? pre.tranboxSetting : {}),
        ...validated,
      },
    }));
  } catch (err) {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      `writeSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  const next = await transport.readSetting();
  return readSelectionSetting(next);
};
