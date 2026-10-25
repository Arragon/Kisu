// General 设置的产品层适配（MVP-60 / INH-1226）。
// 语言选项单一事实源 = 上游 UI_LANGS（config/i18n.js:6）；写入 SETTING 单一
// 事实源（read-merge-write，未知键透传——settings-projection.md §10 硬规则）。
import { UI_LANGS } from "../../../config/i18n";
import { DEFAULT_SETTING } from "../../../config/setting";
import { kclOk, kclError } from "../../kcl/result";

export const getUiLangOptions = () =>
  Object.freeze(UI_LANGS.map(([value, label]) => Object.freeze({ value, label })));

// General 字段只读投影（含回退默认）
export const readGeneralSetting = (setting) => {
  if (!setting || typeof setting !== "object") {
    return kclError("UNSUPPORTED_INPUT", "readGeneralSetting requires a setting object");
  }
  const options = getUiLangOptions();
  const raw = typeof setting.uiLang === "string" ? setting.uiLang : "";
  return kclOk(
    Object.freeze({
      uiLang: options.some((option) => option.value === raw)
        ? raw
        : DEFAULT_SETTING.uiLang,
      uiLangRaw: raw, // 回退时保留原始码供 UI 明示
      darkMode: typeof setting.darkMode === "string" ? setting.darkMode : DEFAULT_SETTING.darkMode,
      shortcuts: setting.shortcuts && typeof setting.shortcuts === "object"
        ? Object.freeze({ ...setting.shortcuts })
        : Object.freeze({}),
    })
  );
};

// 写入 uiLang：read-merge-write，未知码拒绝且零写入（SETTING 单一事实源）。
export const updateGeneralUiLang = async (transport, { uiLang } = {}) => {
  if (
    !transport ||
    typeof transport.readSetting !== "function" ||
    typeof transport.writeSetting !== "function"
  ) {
    return kclError("TRANSPORT_UNAVAILABLE", "updateGeneralUiLang requires setting accessors");
  }
  if (typeof uiLang !== "string" || !uiLang) {
    return kclError("UNSUPPORTED_INPUT", "updateGeneralUiLang requires a non-empty uiLang");
  }
  const known = getUiLangOptions().some((option) => option.value === uiLang);
  if (!known) {
    return kclError("UNSUPPORTED_INPUT", `unknown uiLang "${uiLang}"`);
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
    await transport.writeSetting((pre) => ({ ...pre, uiLang }));
  } catch (err) {
    return kclError(
      "TRANSPORT_UNAVAILABLE",
      `writeSetting failed: ${err && err.message ? err.message : String(err)}`
    );
  }
  const next = await transport.readSetting();
  return readGeneralSetting(next);
};
