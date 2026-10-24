import { GLOBLA_RULE } from "../../../../src/config/rules";
import { isMatch as upstreamIsMatch } from "../../../../src/libs/utils";
import {
  normalizePageState,
  readPageState,
  subscribePageState,
  PAGE_DISPLAY_ORDERS,
} from "../page";
import { isMatch, isSiteBlacklisted } from "../sites";
import * as kcl from "../index";

const RULE_ACTIVE = {
  transOpen: "true",
  transOnly: "true",
  transOrder: "translation-first",
  apiSlug: "DeepL",
  toLang: "ja",
};
const SETTING = { blacklist: "example.com" };

const flushPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

describe("isMatch parity with upstream (MVP-06)", () => {
  const cases = [
    ["https://example.com/x", "example.com"],
    ["https://a.example.com/", "example.com"],
    ["https://example.org/", "example.com"],
    ["xfoox", "foo"],
    ["foobar", "foo*"],
    ["", "x"],
    ["x", ""],
    ["abc", "xyz"],
    ["https://github.com/a/b?c=d", "github.com/a"],
  ];
  it.each(cases)("isMatch(%j, %j) matches upstream", (s, p) => {
    expect(isMatch(s, p)).toBe(upstreamIsMatch(s, p));
  });

  it("preserves the known upstream wide-match behavior (auto-wrapped '*')", () => {
    // utils.js:193 REVIEW：两端包裹 * → 包含即匹配，不做前缀锚定
    expect(isMatch("https://x-example.com.evil/", "example.com")).toBe(true);
  });
});

describe("isSiteBlacklisted (MVP-06)", () => {
  it("matches comma or newline separated lists", () => {
    expect(isSiteBlacklisted("https://a.com/", "a.com")).toBe(true);
    expect(isSiteBlacklisted("https://b.com/", "a.com,\nb.com")).toBe(true);
    expect(isSiteBlacklisted("https://c.com/", "a.com,b.com")).toBe(false);
  });

  it("treats empty/blank entries as non-matching", () => {
    expect(isSiteBlacklisted("https://a.com/", "")).toBe(false);
    expect(isSiteBlacklisted("https://a.com/", ",\n,")).toBe(false);
  });
});

describe("normalizePageState (MVP-06)", () => {
  it("projects a fully specified merged rule", () => {
    const state = normalizePageState(
      { rule: RULE_ACTIVE, setting: SETTING },
      "https://example.com/x"
    );
    expect(state).toEqual({
      translation: "active",
      displayMode: { onlyTranslation: true, order: "translation-first" },
      provider: { apiSlug: "DeepL" },
      targetLanguage: "ja",
      site: { autoTranslate: true, blacklisted: true },
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.displayMode)).toBe(true);
  });

  it("falls back to GLOBLA_RULE defaults on empty/missing payload", () => {
    const state = normalizePageState(null);
    expect(state).toEqual({
      translation: "idle",
      displayMode: {
        onlyTranslation: false,
        order: GLOBLA_RULE.transOrder,
      },
      provider: { apiSlug: GLOBLA_RULE.apiSlug },
      targetLanguage: GLOBLA_RULE.toLang,
      site: { autoTranslate: false, blacklisted: false },
    });
  });

  it("falls back on illegal values and GLOBAL_KEY inheritance markers", () => {
    const state = normalizePageState({
      rule: {
        transOpen: "garbage",
        transOnly: "*",
        transOrder: "weird",
        apiSlug: "*",
        toLang: "*",
      },
    });
    expect(state.translation).toBe("idle");
    expect(state.displayMode).toEqual({
      onlyTranslation: false,
      order: GLOBLA_RULE.transOrder,
    });
    expect(state.provider.apiSlug).toBe(GLOBLA_RULE.apiSlug);
    expect(state.targetLanguage).toBe(GLOBLA_RULE.toLang);
  });

  it("skips blacklist evaluation when href is not provided", () => {
    const state = normalizePageState({ rule: {}, setting: SETTING });
    expect(state.site.blacklisted).toBe(false);
  });
});

describe("readPageState (MVP-06)", () => {
  it("returns kclOk with the normalized state", async () => {
    const result = await readPageState(
      async () => ({ rule: RULE_ACTIVE, setting: SETTING }),
      "https://example.com/"
    );
    expect(result.ok).toBe(true);
    expect(result.value.provider.apiSlug).toBe("DeepL");
    expect(result.value.site.blacklisted).toBe(true);
  });

  it("rejects a non-function sender with UNSUPPORTED_INPUT", async () => {
    const result = await readPageState(undefined);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("UNSUPPORTED_INPUT");
  });

  it("maps missing/error responses to TRANSPORT_UNAVAILABLE", async () => {
    expect((await readPageState(async () => undefined)).error.code).toBe(
      "TRANSPORT_UNAVAILABLE"
    );
    expect(
      (await readPageState(async () => ({ error: "no tab" }))).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
    expect(
      (await readPageState(async () => ({ setting: SETTING }))).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });

  it("maps sender exceptions to TRANSPORT_UNAVAILABLE", async () => {
    const result = await readPageState(async () => {
      throw new Error("boom");
    });
    expect(result.error.code).toBe("TRANSPORT_UNAVAILABLE");
    expect(result.error.message).toContain("boom");
  });
});

describe("subscribePageState (ADR-014 pull-only polling)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("emits the initial state and only re-emits on change", async () => {
    let rule = { ...RULE_ACTIVE };
    const states = [];
    subscribePageState(
      async () => ({ rule, setting: SETTING }),
      { href: "https://example.com/", onState: (s) => states.push(s) }
    );
    await flushPromises();
    expect(states).toHaveLength(1);
    expect(states[0].translation).toBe("active");

    jest.advanceTimersByTime(2000); // unchanged → no emit
    await flushPromises();
    expect(states).toHaveLength(1);

    rule = { ...RULE_ACTIVE, transOpen: "false" }; // state change
    jest.advanceTimersByTime(2000);
    await flushPromises();
    expect(states).toHaveLength(2);
    expect(states[1].translation).toBe("idle");
  });

  it("never overlaps requests while one poll is in flight", async () => {
    let resolveSender;
    const calls = [];
    const unsubscribe = subscribePageState(
      () =>
        new Promise((resolve) => {
          calls.push(1);
          resolveSender = resolve;
        }),
      { href: "https://a.com/", onState: () => {} }
    );
    await flushPromises();
    expect(calls).toHaveLength(1);

    jest.advanceTimersByTime(6000); // three ticks while pending → still one request
    expect(calls).toHaveLength(1);

    resolveSender({ rule: RULE_ACTIVE, setting: SETTING });
    await flushPromises();
    jest.advanceTimersByTime(2000);
    await flushPromises();
    expect(calls).toHaveLength(2);
    unsubscribe();
  });

  it("reports errors via onError without stopping the loop", async () => {
    let fail = true;
    const errors = [];
    const states = [];
    subscribePageState(
      async () => (fail ? undefined : { rule: RULE_ACTIVE, setting: SETTING }),
      { href: "https://a.com/", onState: (s) => states.push(s), onError: (e) => errors.push(e) }
    );
    await flushPromises();
    expect(errors).toHaveLength(1);
    expect(errors[0].error.code).toBe("TRANSPORT_UNAVAILABLE");

    fail = false;
    jest.advanceTimersByTime(2000);
    await flushPromises();
    expect(states).toHaveLength(1); // recovered
  });

  it("honors shouldPoll gating and unsubscribe", async () => {
    const calls = [];
    const unsubscribe = subscribePageState(
      async () => {
        calls.push(1);
        return { rule: RULE_ACTIVE, setting: SETTING };
      },
      {
        href: "https://a.com/",
        onState: () => {},
        shouldPoll: () => false, // blocks even the initial poll
      }
    );
    await flushPromises();
    jest.advanceTimersByTime(6000);
    await flushPromises();
    expect(calls).toHaveLength(0);

    unsubscribe();
    jest.advanceTimersByTime(6000);
    expect(calls).toHaveLength(0);
  });

  it("throws on invalid arguments", () => {
    expect(() => subscribePageState(null, { onState: () => {} })).toThrow(
      TypeError
    );
    expect(() => subscribePageState(async () => {}, {})).toThrow(TypeError);
  });
});

describe("page surface re-exported from kcl index", () => {
  it("exposes the page read API and display order contract", () => {
    expect(typeof kcl.normalizePageState).toBe("function");
    expect(typeof kcl.readPageState).toBe("function");
    expect(typeof kcl.subscribePageState).toBe("function");
    expect(kcl.PAGE_DISPLAY_ORDERS).toEqual(["original-first", "translation-first"]);
    expect(PAGE_DISPLAY_ORDERS).toBe(kcl.PAGE_DISPLAY_ORDERS);
  });
});
