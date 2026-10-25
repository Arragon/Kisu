import { readSubtitleRuntime } from "../subtitleRuntime";
import * as kcl from "../index";

const SNAPSHOT = Object.freeze({
  videoId: "abc",
  mounted: true,
  autoTranslate: true,
  progressed: 40,
  processing: true,
  activeTrackKey: "en:en",
  fromLang: "en",
});

describe("readSubtitleRuntime (KP-001 / INH-1228)", () => {
  it("passes a live snapshot through as kclOk", () => {
    const result = readSubtitleRuntime(() => SNAPSHOT);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(SNAPSHOT);
  });

  it("treats an unmounted runtime (null) as a legal state, not an error", () => {
    const result = readSubtitleRuntime(() => null);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ mounted: false });
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it("treats malformed accessor output as unmounted", () => {
    expect(readSubtitleRuntime(() => "garbage").value).toEqual({
      mounted: false,
    });
    expect(readSubtitleRuntime(() => undefined).value).toEqual({
      mounted: false,
    });
  });

  it("fails clearly when the accessor is not injected", () => {
    const result = readSubtitleRuntime();
    expect(result.error.code).toBe("TRANSPORT_UNAVAILABLE");
    expect(readSubtitleRuntime(null).error.code).toBe("TRANSPORT_UNAVAILABLE");
  });
});

describe("subtitleRuntime surface re-exported from kcl index", () => {
  it("exposes readSubtitleRuntime", () => {
    expect(typeof kcl.readSubtitleRuntime).toBe("function");
  });
});
