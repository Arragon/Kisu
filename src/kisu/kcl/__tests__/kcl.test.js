import baseline from "../../../../docs/upstream/baseline.json";
import { KISU_VERSION } from "../version";
import {
  KCL_ERROR_CODES,
  kclOk,
  kclError,
  isKclResult,
} from "../result";
import { kclCapability, isCapabilitySupported } from "../capabilities";
import * as kcl from "../index";

describe("KCL version (MVP-05)", () => {
  it("derives from docs/upstream/baseline.json kisuVersion", () => {
    expect(KISU_VERSION).toBe(baseline.kisuVersion);
  });

  it("is the M0 dev version until the first Kisu release", () => {
    expect(KISU_VERSION).toBe("0.0.0-dev");
  });
});

describe("KCL result contract (MVP-05)", () => {
  it("kclOk returns a frozen { ok, value, error } shape", () => {
    const r = kclOk({ a: 1 });
    expect(r).toEqual({ ok: true, value: { a: 1 }, error: null });
    expect(Object.isFrozen(r)).toBe(true);
  });

  it("kclOk defaults value to null", () => {
    expect(kclOk()).toEqual({ ok: true, value: null, error: null });
  });

  it("kclError maps a contract code and stringifies the message", () => {
    const r = kclError("PROVIDER_NOT_FOUND", "nope");
    expect(r).toEqual({
      ok: false,
      value: null,
      error: { code: "PROVIDER_NOT_FOUND", message: "nope" },
    });
    expect(Object.isFrozen(r.error)).toBe(true);
  });

  it("kclError rejects codes outside the contract", () => {
    expect(() => kclError("NOT_A_CODE", "x")).toThrow(TypeError);
  });

  it("error codes cover the contract codes exactly", () => {
    expect(Object.keys(KCL_ERROR_CODES).sort()).toEqual([
      "CAPTION_UNAVAILABLE",
      "CONTEXT_UNSUPPORTED",
      "PROVIDER_DISABLED",
      "PROVIDER_NOT_FOUND",
      "TRANSPORT_UNAVAILABLE",
      "UNSUPPORTED_INPUT",
    ]);
    expect(Object.isFrozen(KCL_ERROR_CODES)).toBe(true);
  });

  it("isKclResult validates the shape", () => {
    expect(isKclResult(kclOk(1))).toBe(true);
    expect(isKclResult(kclError("UNSUPPORTED_INPUT", "x"))).toBe(true);
    expect(isKclResult(null)).toBe(false);
    expect(isKclResult({ ok: "yes" })).toBe(false);
    expect(isKclResult({ ok: false, value: null, error: { code: 42 } })).toBe(
      false
    );
  });
});

describe("KCL capabilities (MVP-05)", () => {
  it("declares a frozen capability with explicit supported flag", () => {
    const cap = kclCapability("page.translate", { supported: true });
    expect(cap).toEqual({ id: "page.translate", supported: true, reason: null });
    expect(Object.isFrozen(cap)).toBe(true);
  });

  it("coerces reason to string", () => {
    const cap = kclCapability("x", { supported: false, reason: 42 });
    expect(cap.reason).toBe("42");
  });

  it("rejects empty/non-string ids", () => {
    expect(() => kclCapability("", { supported: true })).toThrow(TypeError);
    expect(() => kclCapability(null, { supported: true })).toThrow(TypeError);
  });

  it("rejects implicit supported values", () => {
    expect(() => kclCapability("x", {})).toThrow(TypeError);
    expect(() => kclCapability("x", { supported: 1 })).toThrow(TypeError);
  });

  it("isCapabilitySupported only accepts explicit true", () => {
    expect(isCapabilitySupported(kclCapability("x", { supported: true }))).toBe(
      true
    );
    expect(
      isCapabilitySupported(kclCapability("x", { supported: false }))
    ).toBe(false);
    expect(isCapabilitySupported(null)).toBe(false);
  });
});

describe("KCL skeleton export surface (MVP-05)", () => {
  it("re-exports exactly the documented surface", () => {
    expect(Object.keys(kcl).sort()).toEqual([
      "KCL_ERROR_CODES",
      "KISU_VERSION",
      "PAGE_DISPLAY_ORDERS",
      "isCapabilitySupported",
      "isKclResult",
      "isMatch",
      "isSiteBlacklisted",
      "kclCapability",
      "kclError",
      "kclOk",
      "normalizePageState",
      "readPageState",
      "saveSiteRule",
      "setPageDisplayMode",
      "setPageProvider",
      "setPageTargetLanguage",
      "setPageTranslation",
      "setSitePreference",
      "subscribePageState",
    ]);
    expect(kcl.KISU_VERSION).toBe(KISU_VERSION);
  });
});
