import { API_SPE_TYPES } from "../../../../src/config/api";
import { listProviders, getProvider, resolveProviders } from "../providers";
import * as kcl from "../index";

const SECRET = "sk-super-secret-value";

const SETTING = {
  transApis: [
    { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
    {
      apiSlug: "my-ai",
      apiName: "我的 GPT",
      apiType: "Gemini",
      apiKey: SECRET,
      model: "gemini-3-flash",
    },
    { apiSlug: "broken", apiName: "Broken", apiType: "NotAnEngine" },
    { apiName: "no-slug", apiType: "Microsoft" },
    "garbage-entry",
  ],
};

describe("listProviders (MVP-08)", () => {
  it("projects descriptors from setting.transApis as the single source", () => {
    const result = listProviders(SETTING);
    expect(result.ok).toBe(true);
    expect(result.value.map((p) => p.apiSlug)).toEqual([
      "Microsoft",
      "my-ai",
      "broken",
    ]);
    expect(Object.isFrozen(result.value)).toBe(true);
    result.value.forEach((p) => expect(Object.isFrozen(p)).toBe(true));
  });

  it("whitelists descriptor fields and leaks no credential material", () => {
    const { value } = listProviders(SETTING);
    value.forEach((p) => {
      expect(Object.keys(p).sort()).toEqual([
        "apiSlug",
        "apiType",
        "capabilities",
        "name",
        "usable",
      ]);
    });
    expect(JSON.stringify(value)).not.toContain(SECRET);
    expect(JSON.stringify(value)).not.toContain("apiKey");
    expect(JSON.stringify(value)).not.toContain("model");
  });

  it("derives capability flags from upstream API_SPE_TYPES by apiType", () => {
    const { value } = listProviders(SETTING);
    const [ms, ai] = value;
    expect(ms.capabilities.machine).toBe(API_SPE_TYPES.machine.has("Microsoft"));
    expect(ms.capabilities.ai).toBe(API_SPE_TYPES.ai.has("Microsoft"));
    expect(ms.capabilities.batch).toBe(API_SPE_TYPES.batch.has("Microsoft"));
    expect(ai.capabilities.ai).toBe(API_SPE_TYPES.ai.has("Gemini"));
    expect(ai.capabilities.context).toBe(API_SPE_TYPES.context.has("Gemini"));
  });

  it("marks unknown engine types unusable with all-false capabilities", () => {
    const { value } = listProviders(SETTING);
    const broken = value.find((p) => p.apiSlug === "broken");
    expect(broken.usable).toBe(false);
    expect(broken.apiType).toBe("NotAnEngine");
    expect(Object.values(broken.capabilities).every((v) => v === false)).toBe(
      true
    );
  });

  it("falls back name to apiSlug when apiName is missing", () => {
    const { value } = listProviders({
      transApis: [{ apiSlug: "X", apiType: "Microsoft" }],
    });
    expect(value[0].name).toBe("X");
  });

  it("tolerates missing transApis and rejects invalid setting", () => {
    expect(listProviders({}).ok).toBe(true);
    expect(listProviders({}).value).toEqual([]);
    expect(listProviders(null).error.code).toBe("UNSUPPORTED_INPUT");
  });
});

describe("getProvider (MVP-08)", () => {
  it("resolves a registered slug with first-match semantics", () => {
    const result = getProvider(SETTING, "my-ai");
    expect(result.ok).toBe(true);
    expect(result.value.name).toBe("我的 GPT");
    expect(result.value.capabilities.ai).toBe(true);
  });

  it("returns PROVIDER_NOT_FOUND for deleted/unknown slugs", () => {
    expect(getProvider(SETTING, "Deleted").error.code).toBe(
      "PROVIDER_NOT_FOUND"
    );
    expect(getProvider(SETTING, "no-slug").error.code).toBe(
      "PROVIDER_NOT_FOUND"
    );
  });

  it("rejects invalid arguments", () => {
    expect(getProvider(SETTING, "").error.code).toBe("UNSUPPORTED_INPUT");
    expect(getProvider(null, "X").error.code).toBe("UNSUPPORTED_INPUT");
  });
});

describe("resolveProviders (MVP-08)", () => {
  it("splits references into resolved and missing", () => {
    const result = resolveProviders(SETTING, [
      "Microsoft",
      "gone",
      "my-ai",
      "gone",
    ]);
    expect(result.ok).toBe(true);
    expect(result.value.resolved.map((p) => p.apiSlug)).toEqual([
      "Microsoft",
      "my-ai",
    ]);
    expect(result.value.missing).toEqual(["gone", "gone"]);
  });

  it("rejects non-array slug lists", () => {
    expect(resolveProviders(SETTING, "Microsoft").error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
  });
});

describe("providers surface re-exported from kcl index", () => {
  it("exposes the provider registry API", () => {
    expect(typeof kcl.listProviders).toBe("function");
    expect(typeof kcl.getProvider).toBe("function");
    expect(typeof kcl.resolveProviders).toBe("function");
  });
});
