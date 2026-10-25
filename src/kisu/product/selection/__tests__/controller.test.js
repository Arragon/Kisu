// Selection controller 测试（MVP-28 / INH-1169）。
// 验收状态：word / sentence / long / loading / error / provider-missing；
// 契约：零视觉字段（无坐标/MUI props）、动作守卫 can、错误保留 data。
import { createSelectionController } from "../controller";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

const PROVIDERS = {
  transApis: [
    { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
    { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
  ],
  tranboxSetting: { apiSlugs: ["Microsoft", "my-ai"] },
};

const makeController = ({ setting = PROVIDERS, runTranslate, runLookup } = {}) => {
  const calls = { translate: [], lookup: [] };
  const controller = createSelectionController({
    getSetting: async () => setting,
    runTranslate:
      runTranslate ||
      (async (input) => {
        calls.translate.push(input);
        return { text: "译文" };
      }),
    runLookup:
      runLookup ||
      (async (input) => {
        calls.lookup.push(input);
        return { word: input.text };
      }),
  });
  const views = [];
  const off = controller.subscribe((vm) => views.push(vm));
  return { controller, views, calls, off };
};

const last = (views) => views[views.length - 1];

describe("selection controller states (MVP-28)", () => {
  it("word: lexical auto-lookup with providers resolved", async () => {
    const { controller, views, calls } = makeController();
    await controller.open("serendipity");
    await flushPromises();
    const vm = last(views);
    expect(vm.status).toBe("ready");
    expect(vm.data.text).toEqual({
      raw: "serendipity",
      kind: "lexical",
      reason: "latin-word",
    });
    expect(vm.data.result).toEqual({
      kind: "lookup",
      status: "ready",
      payload: { word: "serendipity" },
    });
    expect(vm.can.translate).toBe(true);
    expect(vm.can.copy).toBe(true);
    expect(calls.lookup).toHaveLength(1);
    expect(calls.translate).toHaveLength(0);
    controller.dispose();
  });

  it("sentence: auto-translate with the first resolved provider", async () => {
    const { controller, calls } = makeController();
    await controller.open("The quick brown fox jumps.");
    await flushPromises();
    const vm = controller.getView();
    expect(vm.data.text.kind).toBe("sentence");
    expect(vm.data.result).toEqual({
      kind: "translate",
      status: "ready",
      payload: { text: "译文" },
    });
    expect(calls.translate[0].apiSetting.apiSlug).toBe("Microsoft");
    controller.dispose();
  });

  it("long: multiline text auto-translates", async () => {
    const { controller } = makeController();
    await controller.open("first line\nsecond line");
    await flushPromises();
    expect(controller.getView().data.text.kind).toBe("multiline");
    expect(controller.getView().data.result.status).toBe("ready");
    controller.dispose();
  });

  it("loading: runner in-flight shows loading and blocks re-entry", async () => {
    let resolveRunner;
    const { controller } = makeController({
      runTranslate: () =>
        new Promise((resolve) => {
          resolveRunner = resolve;
        }),
    });
    const opened = controller.open("hello world"); // open 内部 await runner，不直接 await
    await flushPromises();
    const loading = controller.getView();
    expect(loading.status).toBe("loading");
    expect(loading.data.result.status).toBe("loading");
    expect(loading.can.translate).toBe(false); // loading 期间不可重入

    resolveRunner({ text: "done" });
    await opened;
    await flushPromises();
    expect(controller.getView().status).toBe("ready");
    controller.dispose();
  });

  it("error: normalized error keeps data so the panel stays usable", async () => {
    const { controller } = makeController({
      runTranslate: async () => {
        throw new Error("rate limited");
      },
    });
    await controller.open("hello world");
    await flushPromises();
    const vm = controller.getView();
    expect(vm.status).toBe("error");
    expect(vm.error).toEqual({
      code: "PROVIDER_REQUEST_FAILED",
      message: "translate request failed: rate limited",
    });
    expect(vm.data.text.raw).toBe("hello world"); // 保留
    expect(vm.can.switchProvider).toBe(true);
    controller.dispose();
  });

  it("provider-missing: no usable providers blocks execution but selection still shows", async () => {
    const { controller } = makeController({
      setting: { transApis: [], tranboxSetting: { apiSlugs: [] } },
    });
    await controller.open("hello world");
    await flushPromises();
    const vm = controller.getView();
    expect(vm.blockedBy).toBe("provider");
    expect(vm.can.translate).toBe(false);
    expect(vm.data.text.kind).toBe("sentence");
    expect(vm.data.result).toBeNull();
    controller.dispose();
  });

  it("stale references surface in providers.missing without blocking", async () => {
    const { controller } = makeController({
      setting: {
        transApis: [{ apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" }],
        tranboxSetting: { apiSlugs: ["Microsoft", "ghost"] },
      },
    });
    await controller.open("hello world");
    await flushPromises();
    const vm = controller.getView();
    expect(vm.data.providers.missing).toEqual(["ghost"]);
    expect(vm.blockedBy).toBe(null);
    expect(vm.can.translate).toBe(true);
    controller.dispose();
  });

  it("unsupported: ready without execution", async () => {
    const { controller, calls } = makeController();
    await controller.open("https://example.com/a");
    await flushPromises();
    const vm = controller.getView();
    expect(vm.data.text).toEqual({
      raw: "https://example.com/a",
      kind: "unsupported",
      reason: "url-or-email",
    });
    expect(vm.data.result).toBeNull();
    expect(vm.can.translate).toBe(false);
    expect(vm.can.lookup).toBe(false);
    expect(calls.translate).toHaveLength(0);
    controller.dispose();
  });
});

describe("selection controller contract (MVP-28)", () => {
  it("carries no visual fields or overlay coordinates", async () => {
    const { controller } = makeController();
    await controller.open("hello world");
    await flushPromises();
    const vm = controller.getView();
    expect(Object.keys(vm).sort()).toEqual([
      "blockedBy",
      "can",
      "data",
      "error",
      "status",
    ]);
    expect(Object.keys(vm.data).sort()).toEqual([
      "providers",
      "result",
      "text",
    ]);
    expect(JSON.stringify(vm)).not.toMatch(/"(x|y|width|height|top|left)"\s*:/);
    controller.dispose();
  });

  it("requires a getSetting accessor and validates listeners", () => {
    expect(() => createSelectionController({})).toThrow(TypeError);
    const { controller } = makeController();
    expect(() => controller.subscribe(null)).toThrow(TypeError);
    controller.dispose();
  });

  it("requires an injected runner (clear transport error)", async () => {
    const controller = createSelectionController({
      getSetting: async () => PROVIDERS,
      runLookup: async () => ({ word: "w" }),
      // runTranslate 缺失
    });
    await controller.open("hello world");
    await flushPromises();
    expect(controller.getView().error.code).toBe("TRANSPORT_UNAVAILABLE");
    controller.dispose();
  });

  it("streaming: onChunk emits loading updates without changing status, then ready folds", async () => {
    let sendChunk;
    let finish;
    const { controller, views } = makeController({
      runTranslate: ({ onChunk }) =>
        new Promise((resolve) => {
          sendChunk = (text) => onChunk(text);
          finish = () => resolve({ output: "完整译文" });
        }),
    });
    const opened = controller.open("hello world");
    await flushPromises();
    sendChunk("你好");
    await flushPromises();
    sendChunk("你好，世界");
    await flushPromises();
    const streaming = last(views);
    expect(streaming.status).toBe("loading");
    expect(streaming.data.result.payload).toEqual({ partial: "你好，世界" });
    expect(streaming.can.translate).toBe(false); // 流式期间不可重入

    finish();
    await opened;
    await flushPromises();
    const ready = last(views);
    expect(ready.status).toBe("ready");
    expect(ready.data.result).toEqual({
      kind: "translate",
      status: "ready",
      payload: { output: "完整译文" },
    });
    controller.dispose();
  });

  it("setProviders without a storage transport fails clearly", async () => {
    const { controller } = makeController();
    await controller.open("hello world");
    await flushPromises();
    await controller.actions.setProviders(["Microsoft"], undefined);
    expect(controller.getView().error.code).toBe("TRANSPORT_UNAVAILABLE");
    controller.dispose();
  });

  it("dispose stops emissions", async () => {
    const { controller, views } = makeController();
    await controller.open("hello world");
    await flushPromises();
    controller.dispose();
    const count = views.length;
    await controller.open("another");
    await flushPromises();
    expect(views.length).toBe(count);
  });
});
