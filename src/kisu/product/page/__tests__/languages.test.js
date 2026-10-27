// 语言适配测试（MVP-20 / INH-1161）。
// 唯一事实源断言：options 与上游 OPT_LANGS_TO 逐项一致；默认/回退 = GLOBLA_RULE.toLang。
import { OPT_LANGS_TO } from "../../../../config/api";
import { GLOBLA_RULE } from "../../../../config/rules";
import {
  getLanguageOptions,
  getDefaultTargetLanguage,
  resolveTargetLanguage,
} from "../languages";

describe("page language adapter (MVP-20)", () => {
  it("derives options from the upstream OPT_LANGS_TO single source", () => {
    const options = getLanguageOptions();
    expect(options).toHaveLength(OPT_LANGS_TO.length);
    options.forEach((option, index) => {
      expect(option.value).toBe(OPT_LANGS_TO[index][0]);
      expect(option.label).toBe(OPT_LANGS_TO[index][1]);
    });
    expect(options.some((o) => o.value === "zh-CN")).toBe(true);
    expect(Object.isFrozen(options)).toBe(true);
  });

  it("falls back to the global default for unknown or missing codes", () => {
    expect(getDefaultTargetLanguage()).toBe(GLOBLA_RULE.toLang);
    expect(resolveTargetLanguage("ja")).toBe("ja");
    expect(resolveTargetLanguage("zh-CN")).toBe("zh-CN");
    expect(resolveTargetLanguage("xx-NoSuchLang")).toBe(GLOBLA_RULE.toLang);
    expect(resolveTargetLanguage("")).toBe(GLOBLA_RULE.toLang);
  });
});
