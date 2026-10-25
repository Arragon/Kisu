// General 设置适配测试（MVP-60 / INH-1226）。
// 唯一事实源断言：options ≡ UI_LANGS；read-merge-write 未知键透传；
// 未知 uiLang 拒绝零写入。
import { UI_LANGS } from "../../../../config/i18n";
import { DEFAULT_SETTING } from "../../../../config/setting";
import {
  getUiLangOptions,
  readGeneralSetting,
  updateGeneralUiLang,
} from "../general";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const makeTransport = (setting) => {
  const t = { current: setting, writes: 0 };
  t.readSetting = async () => t.current;
  t.writeSetting = async (updater) => {
    t.writes += 1;
    t.current = updater(t.current);
  };
  return t;
};

describe("general settings adapter (MVP-60)", () => {
  it("derives uiLang options from the upstream UI_LANGS single source", () => {
    const options = getUiLangOptions();
    expect(options).toHaveLength(UI_LANGS.length);
    options.forEach((option, index) => {
      expect(option.value).toBe(UI_LANGS[index][0]);
      expect(option.label).toBe(UI_LANGS[index][1]);
    });
  });

  it("projects general fields with defaults on unknown/missing values", () => {
    const { value } = readGeneralSetting({ uiLang: "ja", darkMode: "dark" });
    expect(value.uiLang).toBe("ja");
    expect(value.darkMode).toBe("dark");
    expect(value.shortcuts).toEqual({});

    const fallback = readGeneralSetting({ uiLang: "xx-Nope", shortcuts: { cmd: ["AltLeft"] } });
    expect(fallback.value.uiLang).toBe(DEFAULT_SETTING.uiLang);
    expect(fallback.value.uiLangRaw).toBe("xx-Nope");
    expect(fallback.value.shortcuts).toEqual({ cmd: ["AltLeft"] });

    expect(readGeneralSetting({}).value.uiLang).toBe(DEFAULT_SETTING.uiLang);
    expect(readGeneralSetting(null).error.code).toBe("UNSUPPORTED_INPUT");
  });

  it("writes uiLang via read-merge-write preserving unknown keys", async () => {
    const t = makeTransport({ uiLang: "en", darkMode: "auto", futureKey: { keep: true } });
    const result = await updateGeneralUiLang(t, { uiLang: "zh" });
    expect(result.ok).toBe(true);
    expect(t.current.uiLang).toBe("zh");
    expect(t.current.darkMode).toBe("auto"); // 邻近字段保留
    expect(t.current.futureKey).toEqual({ keep: true }); // 未知键透传
    expect(result.value.uiLang).toBe("zh");
  });

  it("rejects unknown uiLang without writing", async () => {
    const t = makeTransport({ uiLang: "en" });
    expect((await updateGeneralUiLang(t, { uiLang: "xx" })).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(t.writes).toBe(0);
  });

  it("requires setting accessors and maps failures", async () => {
    expect(
      (await updateGeneralUiLang({}, { uiLang: "en" })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
    const t = makeTransport({ uiLang: "en" });
    t.writeSetting = async () => {
      throw new Error("storage gone");
    };
    expect(
      (await updateGeneralUiLang(t, { uiLang: "zh" })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });
});
