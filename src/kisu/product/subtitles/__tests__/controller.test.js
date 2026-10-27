// 字幕 controller 测试（MVP-38 / INH-1179）。
// 验收状态：ready / disabled / capability 不支持 / provider 失效 / 运行时快照 /
// next-load 命令 / 错误保留数据。
import {
  createSubtitleController,
} from "../controller";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

const APIS = [
  { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
  { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
];
const SNAPSHOT = Object.freeze({
  videoId: "v1",
  mounted: true,
  autoTranslate: true,
  progressed: 30,
  processing: true,
  activeTrackKey: "en",
  fromLang: "en",
});

const makeEnvironment = ({ setting, getStatus } = {}) => {
  const env = {
    setting:
      setting === undefined
        ? { transApis: APIS, subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING } }
        : setting,
    writes: 0,
    getSetting: async () => env.setting,
    writeSetting: async (updater) => {
      env.writes += 1;
      env.setting = updater(env.setting);
    },
    getStatus: getStatus === undefined ? () => SNAPSHOT : getStatus,
  };
  return env;
};

const collect = (controller) => {
  const views = [];
  controller.subscribe((vm) => views.push(vm));
  return views;
};

describe("subtitle controller states (MVP-38)", () => {
  it("ready: folds the full normalized state including the KP-001 snapshot", async () => {
    const env = makeEnvironment();
    const controller = createSubtitleController(env);
    const views = collect(controller);
    await flushPromises();
    const vm = views[views.length - 1];
    expect(vm.status).toBe("ready");
    expect(vm.data.enabled).toBe(true);
    expect(vm.data.displayMode).toEqual({
      bilingual: true,
      order: "original-first",
    });
    expect(vm.data.provider).toEqual({ apiSlug: "Microsoft", registered: true });
    expect(vm.data.targetLanguage).toBe("zh-CN");
    expect(vm.data.context.slug).toBe("-");
    expect(vm.data.context.capability.supported).toBe(false);
    expect(vm.data.runtime).toEqual(SNAPSHOT);
    expect(vm.can).toEqual({
      setEnabled: true,
      changeDisplayMode: true,
      changeLanguage: true,
      changeProvider: true,
      changeContext: true,
    });
    controller.dispose();
  });

  it("disabled and stale provider stay ready (settings surface, not blocked)", async () => {
    const env = makeEnvironment({
      setting: {
        transApis: APIS,
        subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING, enabled: false, apiSlug: "Ghost" },
      },
    });
    const controller = createSubtitleController(env);
    await flushPromises();
    const vm = controller.getView();
    expect(vm.data.enabled).toBe(false);
    expect(vm.data.provider).toEqual({ apiSlug: "Ghost", registered: false });
    expect(vm.status).toBe("ready");
    expect(vm.can.setEnabled).toBe(true);
    controller.dispose();
  });

  it("capability states flow through (context supported for AI provider)", async () => {
    const env = makeEnvironment({
      setting: {
        transApis: APIS,
        subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING, aiContextSlug: "my-ai" },
      },
    });
    const controller = createSubtitleController(env);
    await flushPromises();
    expect(controller.getView().data.context.capability.supported).toBe(true);
    controller.dispose();
  });

  it("unmounted runtime (null accessor result) is a legal state", async () => {
    const env = makeEnvironment({ getStatus: () => null });
    const controller = createSubtitleController(env);
    await flushPromises();
    expect(controller.getView().data.runtime).toEqual({ mounted: false });
    controller.dispose();
  });
});

describe("subtitle controller next-load commands (MVP-38)", () => {
  it("setEnabled persists and the refreshed view reflects it", async () => {
    const env = makeEnvironment();
    const controller = createSubtitleController(env);
    await flushPromises();
    await controller.actions.setEnabled(false);
    expect(env.writes).toBe(1);
    expect(env.setting.subtitleSetting.enabled).toBe(false);
    expect(controller.getView().data.enabled).toBe(false);
    controller.dispose();
  });

  it("setDisplayMode / setTargetLanguage / setProvider persist via next-load", async () => {
    const env = makeEnvironment();
    const controller = createSubtitleController(env);
    await flushPromises();
    await controller.actions.setDisplayMode({ bilingual: false });
    expect(env.setting.subtitleSetting.isBilingual).toBe(false);
    await controller.actions.setTargetLanguage("ja");
    expect(env.setting.subtitleSetting.toLang).toBe("ja");
    await controller.actions.setProvider("my-ai");
    expect(env.setting.subtitleSetting.apiSlug).toBe("my-ai");
    expect(controller.getView().data.provider.apiSlug).toBe("my-ai");
    controller.dispose();
  });

  it("setContextMode rejects incompatible providers without writing", async () => {
    const env = makeEnvironment();
    const controller = createSubtitleController(env);
    await flushPromises();
    await controller.actions.setContextMode("Microsoft");
    expect(env.writes).toBe(0);
    expect(env.setting.subtitleSetting.aiContextSlug).toBe("-");
    const vm = controller.getView();
    expect(vm.status).toBe("error");
    expect(vm.error.code).toBe("CONTEXT_UNSUPPORTED");
    expect(vm.data).not.toBeNull(); // 数据保留
    controller.dispose();
  });

  it("missing writeSetting fails clearly and keeps the view", async () => {
    const env = makeEnvironment();
    const controller = createSubtitleController({
      getSetting: env.getSetting,
      getStatus: env.getStatus,
      // writeSetting 缺失
    });
    await flushPromises();
    const before = controller.getView();
    await controller.actions.setEnabled(false);
    expect(controller.getView().error.code).toBe("TRANSPORT_UNAVAILABLE");
    expect(controller.getView().data).toBe(before.data);
    controller.dispose();
  });
});

describe("subtitle controller lifecycle (MVP-38)", () => {
  it("polls with dedup and reflects external setting changes", async () => {
    jest.useFakeTimers();
    const env = makeEnvironment();
    const controller = createSubtitleController({ ...env, intervalMs: 1000 });
    const views = collect(controller);
    await flushPromises();
    // subscribe 回放 loading + 首次刷新 ready（约定行为）
    expect(views).toHaveLength(2);
    expect(views[0].status).toBe("loading");
    expect(views[1].status).toBe("ready");

    env.setting = {
      ...env.setting,
      subtitleSetting: { ...env.setting.subtitleSetting, enabled: false },
    };
    jest.advanceTimersByTime(1100);
    await flushPromises();
    expect(controller.getView().data.enabled).toBe(false);
    controller.dispose();
    jest.useRealTimers();
  });

  it("dispose stops polling and emissions", async () => {
    jest.useFakeTimers();
    const env = makeEnvironment();
    const controller = createSubtitleController({ ...env, intervalMs: 1000 });
    const views = collect(controller);
    await flushPromises();
    controller.dispose();
    env.setting = {
      ...env.setting,
      subtitleSetting: { ...env.setting.subtitleSetting, enabled: false },
    };
    jest.advanceTimersByTime(3000);
    await flushPromises();
    expect(views).toHaveLength(2); // 回放 + 首次 ready，dispose 后不再增加
    jest.useRealTimers();
  });

  it("carries no visual fields", async () => {
    const env = makeEnvironment();
    const controller = createSubtitleController(env);
    await flushPromises();
    expect(Object.keys(controller.getView()).sort()).toEqual([
      "blockedBy",
      "can",
      "data",
      "error",
      "status",
    ]);
    controller.dispose();
  });
});
