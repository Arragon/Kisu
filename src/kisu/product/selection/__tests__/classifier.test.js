// 分类器测试（MVP-27 / INH-1168，ADR-015）。
// 验收矩阵：标点/URL/代码 token/CJK/单词/多行全覆盖；解释性 reason；阈值边界。
import {
  classifySelection,
  SELECTION_KINDS,
} from "../classifier";

const kindOf = (text) => {
  const result = classifySelection(text);
  expect(result.ok).toBe(true);
  return result.value;
};

describe("classifier contract (MVP-27)", () => {
  it("exposes exactly the four kinds", () => {
    expect(SELECTION_KINDS).toEqual([
      "unsupported",
      "lexical",
      "multiline",
      "sentence",
    ]);
  });

  it("rejects non-string input via the KCL result contract", () => {
    expect(classifySelection(null).error.code).toBe("UNSUPPORTED_INPUT");
    expect(classifySelection(42).error.code).toBe("UNSUPPORTED_INPUT");
  });

  it("freezes the classification", () => {
    const { value } = classifySelection("hello");
    expect(Object.isFrozen(value)).toBe(true);
  });
});

describe("unsupported (MVP-27)", () => {
  it.each([
    ["empty string", "", "empty"],
    ["whitespace only", "   \n\t ", "empty"],
    ["pure numbers", "123,456.78", "no-letters"],
    ["pure punctuation", "!!!???…", "no-letters"],
    ["bare url", "https://example.com/a?b=c", "url-or-email"],
    ["www url", "www.example.com", "url-or-email"],
    ["bare domain", "example.com/docs", "url-or-email"],
    ["email", "someone@example.com", "url-or-email"],
    ["code braces", "const a = { b: 1 };", "code-token"],
    ["code arrow", "items.map(x => x * 2)", "code-token"],
    ["path-like code", "foo::bar::baz()", "code-token"],
  ])("%s", (_name, text, reason) => {
    expect(kindOf(text)).toEqual({ kind: "unsupported", reason });
  });

  it("caps runaway selections at MAX_LENGTH", () => {
    expect(kindOf("word ".repeat(200))).toEqual({
      kind: "unsupported",
      reason: "too-long",
    });
  });
});

describe("lexical (MVP-27)", () => {
  it.each([
    ["latin word", "serendipity", "latin-word"],
    ["hyphenated", "state-of-the-art", "latin-word"],
    ["apostrophe", "don't", "latin-word"],
    ["capitalized", "GitHub", "latin-word"],
    ["single CJK char", "翻", "cjk-short-run"],
    ["short CJK word", "翻译器", "cjk-short-run"],
    ["four CJK chars", "机器学习", "cjk-short-run"],
  ])("%s", (_name, text, reason) => {
    expect(kindOf(text)).toEqual({ kind: "lexical", reason });
  });
});

describe("sentence (MVP-27)", () => {
  it.each([
    ["english sentence", "The quick brown fox jumps over the lazy dog."],
    ["chinese sentence", "机器学习是人工智能的一个分支。"],
    ["mixed cjk-english", "使用 GitHub Actions 做 CI。"],
    ["short phrase with space", "hello world"],
    ["single token with punctuation", "well, actually"],
  ])("%s → sentence", (_name, text) => {
    expect(kindOf(text).kind).toBe("sentence");
  });
});

describe("multiline (MVP-27)", () => {
  it("classifies newline-separated text as multiline", () => {
    expect(kindOf("first line\nsecond line")).toEqual({
      kind: "multiline",
      reason: "multiline-or-long",
    });
  });

  it("classifies a single very long line as multiline", () => {
    const longLine = "word ".repeat(50); // 250 chars > 200
    expect(kindOf(longLine.trim()).kind).toBe("multiline");
  });
});

describe("threshold boundaries (provisional, ADR-015)", () => {
  it("200-char single line stays sentence; 201 goes multiline", () => {
    const ok200 = `${"a".repeat(199)}.`; // 200 chars, sentence-ish
    expect(kindOf(ok200).kind).toBe("sentence");
    const long201 = "a".repeat(201);
    expect(kindOf(long201).kind).toBe("multiline");
  });

  it("CJK runs of 5+ chars are not lexical", () => {
    expect(kindOf("机器学习理论").kind).toBe("sentence");
  });

  it("cjk with sentence punctuation is a sentence", () => {
    expect(kindOf("翻译。").kind).toBe("sentence");
  });
});
