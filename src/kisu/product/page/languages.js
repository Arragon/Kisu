// Page 目标语言的产品层适配（MVP-20 / INH-1161）。
// 语言表唯一事实源 = 上游 OPT_LANGS_TO（config/api.js:905）；Kisu 不建第二份
// registry（#7 已冻结该边界）。surface 层按 P2-T05 规则不能 import src/config，
// 故由本模块构建后以 props 注入控件；非法存储码的产品级 fallback 也归此处。
import { OPT_LANGS_TO } from "../../../config/api";
import { GLOBLA_RULE } from "../../../config/rules";

// [{ value: code, label }]，冻结——供 Select 直接消费
export const getLanguageOptions = () =>
  Object.freeze(
    OPT_LANGS_TO.map(([value, label]) => Object.freeze({ value, label }))
  );

// 目标语言的默认值 = 上游全局兜底规则的 toLang
export const getDefaultTargetLanguage = () => GLOBLA_RULE.toLang;

// 存储值解析：未知/缺失代码安全回退到默认语言
export const resolveTargetLanguage = (raw) =>
  OPT_LANGS_TO.some(([code]) => code === raw) ? raw : getDefaultTargetLanguage();
