// Selection 内容分类器（MVP-27 / INH-1168，ADR-015）。
// 纯函数、可解释：每条规则命中都返回 reason（规则 id），阈值全部 provisional。
// 禁止：NLP 依赖、外部分类 API（卡片红线）；上游 TranForm 决策逻辑不复刻
// （EU-004 已动过该文件，见 selection-capability-map.md §3）。
//
// 四类（消费侧：MVP-30 词条结果面 / MVP-31 句子与长文本结果面）：
//   unsupported — 空/纯符号/纯数字/URL/邮箱/代码 token/超长，无翻译价值或不可译
//   lexical     — 词条查询候选：单个拉丁词（含连字符/撇号）或短 CJK 串
//   multiline   — 含换行或超过单行长度阈值
//   sentence    — 其余（短语/句子，走翻译而非词典）
import { kclOk, kclError } from "../../kcl/result";

export const SELECTION_KINDS = Object.freeze([
  "unsupported",
  "lexical",
  "multiline",
  "sentence",
]);

// provisional 阈值（ADR-015）：替换值属纯值变更，不改变分类契约。
const MAX_LENGTH = 600; // 超长视为 unsupported（防误触整页选中）
const LONG_LINE = 200; // 单行超此长度归 multiline
const CJK_WORD_MAX = 4; // 无标点 CJK 连续 ≤4 字视为词条候选

const hasLetterOrCJK = (text) => /[\p{L}]/u.test(text);
const isMostlyNumbers = (text) =>
  text.replace(/[\s.,:/-]/g, "").length > 0 &&
  !/[\p{L}]/u.test(text.replace(/[\s.,:/-]/g, ""));
const looksLikeUrlOrEmail = (text) =>
  /^(https?:\/\/|www\.)\S+$/i.test(text.trim()) ||
  /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(text.trim()) ||
  /^\S+\.(com|org|net|io|dev|cn|jp)\b(\/\S*)?$/i.test(text.trim());
const hasCodeToken = (text) =>
  /[{};=<>]|=>|::|\bfunction\b|\bconst\b|\breturn\b|\bif\s*\(/.test(text);
const isSingleLatinWord = (text) =>
  /^[A-Za-z][A-Za-z'’-]*$/.test(text);
const cjkRuns = (text) => text.match(/[\u3400-\u9fff\uf900-\ufaff]/gu) || [];
const hasSentencePunctuation = (text) => /[.!?。！？，,;；:：]/.test(text);
const hasWhitespace = (text) => /\s/.test(text.trim());

// 单一入口：text → { kind, reason }（冻结）。
// 返回 KCL Result——产品层统一消费形状；输入非法走 UNSUPPORTED_INPUT。
export const classifySelection = (text) => {
  if (typeof text !== "string") {
    return kclError("UNSUPPORTED_INPUT", "classifySelection requires a string");
  }
  const raw = text;
  const trimmed = text.trim();

  const decide = () => {
    if (!trimmed) {
      return { kind: "unsupported", reason: "empty" };
    }
    if (trimmed.length > MAX_LENGTH) {
      return { kind: "unsupported", reason: "too-long" };
    }
    if (looksLikeUrlOrEmail(trimmed)) {
      return { kind: "unsupported", reason: "url-or-email" };
    }
    if (hasCodeToken(trimmed)) {
      return { kind: "unsupported", reason: "code-token" };
    }
    if (!hasLetterOrCJK(trimmed) || isMostlyNumbers(trimmed)) {
      return { kind: "unsupported", reason: "no-letters" };
    }
    // 分类顺序（ADR-015）：unsupported → CJK 短串词条 → 长度/换行 → 拉丁词条
    // → 拉丁单 token 兜底 → sentence。长度检查先于词条兜底：超长选中按长文本
    // 处理（选择意图优先于 token 形态）；单 token 兜底限拉丁 token，CJK 长串
    // 自然落 sentence。
    const runs = cjkRuns(trimmed);
    if (
      runs.length > 0 &&
      runs.join("").length === trimmed.length &&
      trimmed.length <= CJK_WORD_MAX
    ) {
      return { kind: "lexical", reason: "cjk-short-run" };
    }
    if (raw.includes("\n") || trimmed.length > LONG_LINE) {
      return { kind: "multiline", reason: "multiline-or-long" };
    }
    if (isSingleLatinWord(trimmed)) {
      return { kind: "lexical", reason: "latin-word" };
    }
    if (
      !hasWhitespace(trimmed) &&
      !hasSentencePunctuation(trimmed) &&
      /^[\w'’-]+$/.test(trimmed) // 兜底限拉丁 token：CJK 长串落 sentence
    ) {
      return { kind: "lexical", reason: "single-token" };
    }
    return { kind: "sentence", reason: "default" };
  };

  const { kind, reason } = decide();
  return kclOk(Object.freeze({ kind, reason }));
};
