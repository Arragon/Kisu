import {
  getSelectionProviders,
  setSelectionProviders,
  translateSelection,
  lookupSelection,
} from "../selection";
import * as kcl from "../index";

const SETTING = {
  transApis: [
    { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
    { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
  ],
  tranboxSetting: {
    apiSlugs: ["Microsoft", "gone", "my-ai"],
  },
};

describe("getSelectionProviders (MVP-09)", () => {
  it("projects the multi-select with stale references identified", () => {
    const result = getSelectionProviders(SETTING);
    expect(result.ok).toBe(true);
    expect(result.value.resolved.map((p) => p.apiSlug)).toEqual([
      "Microsoft",
      "my-ai",
    ]);
    expect(result.value.missing).toEqual(["gone"]);
  });

  it("tolerates missing tranboxSetting and rejects invalid setting", () => {
    const result = getSelectionProviders({ transApis: [] });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ resolved: [], missing: [] });
    expect(getSelectionProviders(null).error.code).toBe("UNSUPPORTED_INPUT");
  });
});

describe("setSelectionProviders (MVP-09)", () => {
  const makeTransport = (setting) => {
    const t = { written: null };
    t.readSetting = async () => setting;
    t.writeSetting = async (updater) => {
      t.written = updater(setting);
    };
    return t;
  };

  it("writes the slug array preserving order and neighbouring tranbox fields", async () => {
    const t = makeTransport({
      ...SETTING,
      tranboxSetting: { ...SETTING.tranboxSetting, transOpen: true },
    });
    const result = await setSelectionProviders(t, {
      apiSlugs: ["my-ai", "Microsoft"],
    });
    expect(result.ok).toBe(true);
    expect(result.value.apiSlugs).toEqual(["my-ai", "Microsoft"]);
    expect(t.written.tranboxSetting.apiSlugs).toEqual(["my-ai", "Microsoft"]);
    expect(t.written.tranboxSetting.transOpen).toBe(true);
  });

  it("rejects unknown slugs as a batch without writing", async () => {
    const t = makeTransport(SETTING);
    const result = await setSelectionProviders(t, {
      apiSlugs: ["Microsoft", "nope"],
    });
    expect(result.error.code).toBe("PROVIDER_NOT_FOUND");
    expect(result.error.message).toContain("nope");
    expect(t.written).toBeNull();
  });

  it("validates arguments and transport shape", async () => {
    expect(
      (await setSelectionProviders(makeTransport(SETTING), {})).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (await setSelectionProviders(makeTransport(SETTING), { apiSlugs: [] }))
        .error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (await setSelectionProviders(makeTransport(SETTING), { apiSlugs: [""] }))
        .error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (await setSelectionProviders({}, { apiSlugs: ["Microsoft"] })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });

  it("maps accessor failures to TRANSPORT_UNAVAILABLE", async () => {
    const t = {
      readSetting: async () => {
        throw new Error("storage gone");
      },
      writeSetting: async () => {},
    };
    expect(
      (await setSelectionProviders(t, { apiSlugs: ["Microsoft"] })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });
});

describe("translateSelection (MVP-09)", () => {
  it("passes a normalized call through the injected runner", async () => {
    const seen = [];
    const result = await translateSelection(
      { text: " hello ", fromLang: "auto", toLang: "zh-CN", apiSetting: { apiSlug: "my-ai" } },
      {
        run: async (input) => {
          seen.push(input);
          return { translation: "你好" };
        },
      }
    );
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ translation: "你好" });
    expect(seen[0].text).toBe(" hello ");
    expect(seen[0].apiSetting).toEqual({ apiSlug: "my-ai" });
  });

  it("normalizes runner exceptions", async () => {
    const result = await translateSelection(
      { text: "hi" },
      {
        run: async () => {
          throw new Error("rate limited");
        },
      }
    );
    expect(result.error.code).toBe("PROVIDER_REQUEST_FAILED");
    expect(result.error.message).toContain("rate limited");
  });

  it("validates text, languages and runner", async () => {
    expect((await translateSelection({ text: "hi" }, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(
      (await translateSelection({ text: "  " }, { run: async () => {} })).error
        .code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (
        await translateSelection(
          { text: "hi", fromLang: "" },
          { run: async () => {} }
        )
      ).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (
        await translateSelection(
          { text: "hi", toLang: 42 },
          { run: async () => {} }
        )
      ).error.code
    ).toBe("UNSUPPORTED_INPUT");
  });
});

describe("lookupSelection (MVP-09)", () => {
  it("wraps dictionary execution", async () => {
    const result = await lookupSelection(
      { text: "word" },
      { run: async ({ text }) => ({ word: text }) }
    );
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ word: "word" });
  });

  it("normalizes failures and validates input", async () => {
    expect(
      (await lookupSelection({ text: "x" }, { run: async () => { throw new Error("boom"); } })).error
        .code
    ).toBe("PROVIDER_REQUEST_FAILED");
    expect((await lookupSelection({ text: "" }, { run: async () => {} })).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect((await lookupSelection({}, { run: async () => {} })).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
  });
});

describe("selection surface re-exported from kcl index", () => {
  it("exposes the selection API", () => {
    expect(typeof kcl.getSelectionProviders).toBe("function");
    expect(typeof kcl.setSelectionProviders).toBe("function");
    expect(typeof kcl.translateSelection).toBe("function");
    expect(typeof kcl.lookupSelection).toBe("function");
  });
});
