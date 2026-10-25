import { GLOBLA_RULE } from "../../../../src/config/rules";
import { isMatch as upstreamIsMatch } from "../../../../src/libs/utils";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
  MSG_TRANS_TOGGLE,
  MSG_SAVE_RULE,
} from "../../../../src/config/msg";
import {
  normalizePageState,
  readPageState,
  subscribePageState,
  PAGE_DISPLAY_ORDERS,
  setPageTranslation,
  setPageDisplayMode,
  setPageProvider,
  setPageTargetLanguage,
  saveSiteRule,
  setSitePreference,
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
      provider: { apiSlug: "DeepL", registered: null }, // fixture 无 transApis → 无法判定
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
      provider: { apiSlug: GLOBLA_RULE.apiSlug, registered: null },
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

  it("marks unregistered providers when the registry is available", () => {
    const state = normalizePageState({
      rule: RULE_ACTIVE,
      setting: { blacklist: "", transApis: [{ apiSlug: "Microsoft" }] },
    });
    expect(state.provider).toEqual({ apiSlug: "DeepL", registered: false });

    const registered = normalizePageState({
      rule: RULE_ACTIVE,
      setting: {
        blacklist: "",
        transApis: [{ apiSlug: "DeepL" }, { apiSlug: "Microsoft" }],
      },
    });
    expect(registered.provider.registered).toBe(true);
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

// ---------------------------------------------------------------------------
// 写命令（MVP-07 / INH-1148）

const makeTransport = (rule, setting, overrides = {}) => {
  const calls = [];
  return {
    calls,
    sendTab: async (action, args) => {
      calls.push(["tab", action, args]);
      return action === MSG_TRANS_GETRULE ? { rule, setting } : {};
    },
    sendBg: async (action, args) => {
      calls.push(["bg", action, args]);
      return {};
    },
    ...overrides,
  };
};
const tabActions = (t) =>
  t.calls.filter((c) => c[0] === "tab").map((c) => c[1]);
const tabPutRulePatches = (t) =>
  t.calls
    .filter((c) => c[0] === "tab" && c[1] === MSG_TRANS_PUTRULE)
    .map((c) => c[2]);

describe("setPageTranslation (MVP-07)", () => {
  it("sends no toggle when already in the target state", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING); // transOpen "true"
    const result = await setPageTranslation(t, { active: true });
    expect(result.ok).toBe(true);
    expect(result.value.translation).toBe("active");
    expect(tabActions(t)).toEqual([MSG_TRANS_GETRULE]);
  });

  it("toggles exactly once when the state differs", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING);
    const result = await setPageTranslation(t, { active: false });
    expect(result.ok).toBe(true);
    expect(result.value.translation).toBe("idle");
    expect(tabActions(t)).toEqual([MSG_TRANS_GETRULE, MSG_TRANS_TOGGLE]);
  });

  it("accepts a bare function transport", async () => {
    const result = await setPageTranslation(
      async (action) =>
        action === MSG_TRANS_GETRULE ? { rule: RULE_ACTIVE, setting: SETTING } : {},
      { active: true }
    );
    expect(result.ok).toBe(true);
  });

  it("rejects invalid arguments and transports", async () => {
    expect((await setPageTranslation(makeTransport(), {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect((await setPageTranslation(null, { active: true })).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
  });

  it("maps transport failures to TRANSPORT_UNAVAILABLE", async () => {
    const t = {
      sendTab: async () => {
        throw new Error("tab gone");
      },
    };
    expect((await setPageTranslation(t, { active: true })).error.code).toBe(
      "TRANSPORT_UNAVAILABLE"
    );
  });
});

describe("setPageDisplayMode (MVP-07)", () => {
  it("patches transOnly / transOrder with upstream string values", async () => {
    const t = makeTransport({ ...RULE_ACTIVE, transOnly: "false" }, SETTING);
    const result = await setPageDisplayMode(t, { onlyTranslation: true });
    expect(result.ok).toBe(true);
    expect(result.value.displayMode.onlyTranslation).toBe(true);
    expect(tabPutRulePatches(t)).toEqual([{ transOnly: "true" }]);

    const t2 = makeTransport(RULE_ACTIVE, SETTING);
    await setPageDisplayMode(t2, { order: "original-first" });
    expect(tabPutRulePatches(t2)).toEqual([{ transOrder: "original-first" }]);
  });

  it("rejects empty patches and illegal values without sending", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING);
    expect((await setPageDisplayMode(t, {})).error.code).toBe("UNSUPPORTED_INPUT");
    expect(
      (await setPageDisplayMode(t, { onlyTranslation: "yes" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (await setPageDisplayMode(t, { order: "weird" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(tabActions(t)).toEqual([]);
  });
});

describe("setPageProvider (MVP-07)", () => {
  const SETTING_APIS = {
    blacklist: "",
    transApis: [
      { apiSlug: "DeepL" },
      { apiSlug: "Microsoft" },
    ],
  };

  it("applies a provider present in setting.transApis", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING_APIS);
    const result = await setPageProvider(t, { apiSlug: "DeepL" });
    expect(result.ok).toBe(true);
    expect(result.value.provider.apiSlug).toBe("DeepL");
    expect(tabPutRulePatches(t)).toEqual([{ apiSlug: "DeepL" }]);
  });

  it("fails with PROVIDER_NOT_FOUND for unknown slugs without sending", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING_APIS);
    const result = await setPageProvider(t, { apiSlug: "Nope" });
    expect(result.error.code).toBe("PROVIDER_NOT_FOUND");
    expect(tabActions(t)).toEqual([MSG_TRANS_GETRULE]);
  });

  it("allows GLOBAL_KEY inheritance and skips validation when transApis is absent", async () => {
    const t1 = makeTransport(RULE_ACTIVE, SETTING_APIS);
    expect((await setPageProvider(t1, { apiSlug: "*" })).ok).toBe(true);
    const t2 = makeTransport(RULE_ACTIVE, {});
    expect((await setPageProvider(t2, { apiSlug: "Anything" })).ok).toBe(true);
  });

  it("rejects missing slug", async () => {
    expect(
      (await setPageProvider(makeTransport(RULE_ACTIVE, SETTING), {})).error.code
    ).toBe("UNSUPPORTED_INPUT");
  });
});

describe("setPageTargetLanguage (MVP-07)", () => {
  it("patches toLang", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING);
    const result = await setPageTargetLanguage(t, { toLang: "ja" });
    expect(result.ok).toBe(true);
    expect(result.value.targetLanguage).toBe("ja");
    expect(tabPutRulePatches(t)).toEqual([{ toLang: "ja" }]);
  });

  it("rejects empty values", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING);
    expect((await setPageTargetLanguage(t, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(
      (await setPageTargetLanguage(t, { toLang: "" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(tabActions(t)).toEqual([]);
  });
});

describe("saveSiteRule (MVP-07)", () => {
  it("sends the full runtime rule with pattern and patch to background", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING);
    const result = await saveSiteRule(t, {
      pattern: "example.com",
      patch: { transOpen: "true" },
    });
    expect(result.ok).toBe(true);
    const bgCall = t.calls.find((c) => c[0] === "bg");
    expect(bgCall[1]).toBe(MSG_SAVE_RULE);
    expect(bgCall[2].pattern).toBe("example.com");
    expect(bgCall[2].transOpen).toBe("true");
    expect(bgCall[2].apiSlug).toBe(RULE_ACTIVE.apiSlug);
  });

  it("requires the background channel and a pattern", async () => {
    const noBg = makeTransport(RULE_ACTIVE, SETTING, { sendBg: undefined });
    expect(
      (await saveSiteRule(noBg, { pattern: "a.com" })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
    const t = makeTransport(RULE_ACTIVE, SETTING);
    expect((await saveSiteRule(t, {})).error.code).toBe("UNSUPPORTED_INPUT");
  });
});

describe("setSitePreference (MVP-07)", () => {
  const makeSettingTransport = (blacklist) => {
    const t = makeTransport(RULE_ACTIVE, { blacklist });
    let written = null;
    t.readSetting = async () => ({ blacklist });
    t.writeSetting = async (updater) => {
      written = updater({ blacklist });
    };
    t.written = () => written;
    return t;
  };

  it("auto persists a site rule with transOpen on", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING);
    const result = await setSitePreference(t, {
      mode: "auto",
      pattern: "example.com",
    });
    expect(result.ok).toBe(true);
    const bgCall = t.calls.find((c) => c[0] === "bg");
    expect(bgCall[1]).toBe(MSG_SAVE_RULE);
    expect(bgCall[2].pattern).toBe("example.com");
    expect(bgCall[2].transOpen).toBe("true");
  });

  it("never appends the domain to the blacklist without duplicates", async () => {
    const t = makeSettingTransport("a.com");
    const result = await setSitePreference(t, { mode: "never", domain: "b.com" });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ mode: "never", domain: "b.com", blacklisted: true });
    expect(t.written().blacklist).toBe("a.com\nb.com");

    const t2 = makeSettingTransport("a.com\nb.com");
    await setSitePreference(t2, { mode: "never", domain: "b.com" });
    expect(t2.written().blacklist).toBe("a.com\nb.com");
  });

  it("clear removes exactly the domain", async () => {
    const t = makeSettingTransport("a.com\nb.com");
    const result = await setSitePreference(t, { mode: "clear", domain: "a.com" });
    expect(result.ok).toBe(true);
    expect(result.value.blacklisted).toBe(false);
    expect(t.written().blacklist).toBe("b.com");
  });

  it("fails clearly when setting accessors are missing", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING); // no readSetting/writeSetting
    expect(
      (await setSitePreference(t, { mode: "never", domain: "a.com" })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });

  it("validates mode and required fields", async () => {
    const t = makeTransport(RULE_ACTIVE, SETTING);
    expect(
      (await setSitePreference(t, { mode: "nuked", domain: "a.com" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect((await setSitePreference(t, { mode: "auto" })).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect((await setSitePreference(t, { mode: "never" })).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
  });
});
