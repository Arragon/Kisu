// 字幕语言适配测试（MVP-42 / INH-1183）。
// 唯一事实源断言：options ≡ OPT_LANGS_TO（经 page/languages 同一适配）；
// 回退 = DEFAULT_SUBTITLE_SETTING.toLang。
import { OPT_LANGS_TO } from "../../../../config/api";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";
import {
  getSubtitleLanguageOptions,
  getSubtitleLanguageFallback,
  resolveSubtitleTargetLanguage,
} from "../languages";

describe("subtitle language adapter (MVP-42)", () => {
  it("derives options from the upstream OPT_LANGS_TO single source", () => {
    const options = getSubtitleLanguageOptions();
    expect(options).toHaveLength(OPT_LANGS_TO.length);
    options.forEach((option, index) => {
      expect(option.value).toBe(OPT_LANGS_TO[index][0]);
      expect(option.label).toBe(OPT_LANGS_TO[index][1]);
    });
  });

  it("falls back to the subtitle default for unknown or missing codes", () => {
    expect(getSubtitleLanguageFallback()).toBe(DEFAULT_SUBTITLE_SETTING.toLang);
    expect(resolveSubtitleTargetLanguage("ja")).toBe("ja");
    expect(resolveSubtitleTargetLanguage("xx-Nope")).toBe(
      DEFAULT_SUBTITLE_SETTING.toLang
    );
    expect(resolveSubtitleTargetLanguage("")).toBe(
      DEFAULT_SUBTITLE_SETTING.toLang
    );
  });
});
