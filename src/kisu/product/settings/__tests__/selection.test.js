// Selection 设置适配测试（MVP-50 / INH-1191）。
// 验收：默认回退、枚举校验零写入、apiSlugs 注册表校验、read-merge-write 邻近保留。
import { DEFAULT_TRANBOX_SETTING } from "../../../../config/setting";
import {
  readSelectionSetting,
  updateSelectionSetting,
  getTriggerModeOptions,
  getDictOptions,
} from "../selection";

const APIS = [
  { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
  { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
];

const makeTransport = (setting) => {
  const t = { current: setting, writes: 0 };
  t.readSetting = async () => t.current;
  t.writeSetting = async (updater) => {
    t.writes += 1;
    t.current = updater(t.current);
  };
  return t;
};

const baseSetting = (tranbox) => ({
  transApis: APIS,
  tranboxSetting: { ...DEFAULT_TRANBOX_SETTING, ...tranbox },
  futureKey: { keep: true },
});

describe("selection settings adapter (MVP-50)", () => {
  it("exposes upstream enum options", () => {
    expect(getTriggerModeOptions().map((o) => o.value)).toContain("click");
    expect(getDictOptions().map((o) => o.value)).toEqual(["Bing", "Youdao"]);
  });

  it("projects fields with defaults on missing/illegal values", () => {
    const { value } = readSelectionSetting(
      baseSetting({ triggerMode: "weird", apiSlugs: "nope", enDict: "NopeDict", toLang: "" })
    );
    expect(value.triggerMode).toBe(DEFAULT_TRANBOX_SETTING.triggerMode);
    expect(value.apiSlugs).toEqual(DEFAULT_TRANBOX_SETTING.apiSlugs);
    expect(value.enDict).toBe(DEFAULT_TRANBOX_SETTING.enDict);
    expect(value.toLang).toBe(DEFAULT_TRANBOX_SETTING.toLang);
    expect(readSelectionSetting(null).error.code).toBe("UNSUPPORTED_INPUT");
  });

  it("writes valid patches preserving neighbours and unknown keys", async () => {
    const t = makeTransport(baseSetting({}));
    const result = await updateSelectionSetting(t, {
      triggerMode: "hover",
      enDict: "Youdao",
      singleWordNoTrans: true,
      toLang: "ja",
    });
    expect(result.ok).toBe(true);
    expect(t.current.tranboxSetting.triggerMode).toBe("hover");
    expect(t.current.tranboxSetting.enDict).toBe("Youdao");
    expect(t.current.tranboxSetting.singleWordNoTrans).toBe(true);
    expect(t.current.tranboxSetting.toLang).toBe("ja");
    expect(t.current.tranboxSetting.apiSlugs).toEqual(DEFAULT_TRANBOX_SETTING.apiSlugs);
    expect(t.current.futureKey).toEqual({ keep: true });
  });

  it("apiSlugs updates validate against the registry", async () => {
    const t = makeTransport(baseSetting({}));
    const ok = await updateSelectionSetting(t, { apiSlugs: ["my-ai", "Microsoft"] });
    expect(ok.ok).toBe(true);
    expect(t.current.tranboxSetting.apiSlugs).toEqual(["my-ai", "Microsoft"]);

    const bad = await updateSelectionSetting(t, { apiSlugs: ["ghost"] });
    expect(bad.error.code).toBe("PROVIDER_NOT_FOUND");
    const empty = await updateSelectionSetting(t, { apiSlugs: [] });
    expect(empty.error.code).toBe("UNSUPPORTED_INPUT");
    expect(t.current.tranboxSetting.apiSlugs).toEqual(["my-ai", "Microsoft"]);
  });

  it("rejects illegal enums/booleans and empty patches with zero writes", async () => {
    const t = makeTransport(baseSetting({}));
    expect(
      (await updateSelectionSetting(t, { triggerMode: "nuked" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (await updateSelectionSetting(t, { enDict: "NopeDict" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect(
      (await updateSelectionSetting(t, { singleWordNoTrans: "yes" })).error.code
    ).toBe("UNSUPPORTED_INPUT");
    expect((await updateSelectionSetting(t, {})).error.code).toBe(
      "UNSUPPORTED_INPUT"
    );
    expect(t.writes).toBe(0);
  });

  it("requires setting accessors", async () => {
    expect(
      (await updateSelectionSetting({}, { triggerMode: "hover" })).error.code
    ).toBe("TRANSPORT_UNAVAILABLE");
  });
});
