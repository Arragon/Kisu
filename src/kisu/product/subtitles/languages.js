// 字幕目标语言的产品层适配（MVP-42 / INH-1183）。
// 语言表单一事实源 = 上游 OPT_LANGS_TO（经 page/languages.js 同一适配，不建第二份）；
// 回退默认取字幕自己的 DEFAULT_SUBTITLE_SETTING.toLang（与页面兜底同值但语义独立）。
import { DEFAULT_SUBTITLE_SETTING } from "../../../config/setting";
import { getLanguageOptions } from "../page/languages";

export const getSubtitleLanguageOptions = getLanguageOptions;

export const getSubtitleLanguageFallback = () => DEFAULT_SUBTITLE_SETTING.toLang;

export const resolveSubtitleTargetLanguage = (raw) =>
  getSubtitleLanguageOptions().some((option) => option.value === raw)
    ? raw
    : getSubtitleLanguageFallback();
