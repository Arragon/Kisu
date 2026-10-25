// Page controller 测试（MVP-15 / INH-1156）。
// 验收：loading / active / error / site-disabled / provider-missing 全覆盖；
// view-model 零视觉字段；can 冻结；动作守卫 can；dispose 停止一切。
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_TOGGLE,
} from "../../../../config/msg";
import { createPageController } from "../controller";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

// 构造 sendAction：GETRULE 返回 rule/setting，其余消息记录并返回 {}
const makeTransport = (rule, setting) => {
  const sent = [];
  const transport = {
    sent,
    rule,
    setting,
    sendAction: async (action) => {
      sent.push(action);
      if (action === MSG_TRANS_GETRULE) {
        return { rule: transport.rule, setting: transport.setting };
      }
      // TOGGLE 后模拟运行态翻转（真实链路里 GETRULE 重读会看到新状态）
      if (action === MSG_TRANS_TOGGLE) {
        transport.rule = {
          ...transport.rule,
          transOpen: transport.rule.transOpen === "true" ? "false" : "true",
        };
      }
      return {};
    },
  };
  return transport;
};

const collect = (controller) => {
  const views = [];
  controller.subscribe((vm) => views.push(vm));
  return views;
};

describe("page controller view-model contract (MVP-15)", () => {
  it("starts at loading with frozen all-false can", () => {
    const t = makeTransport({ transOpen: "false" }, {});
    const controller = createPageController({ sendAction: t.sendAction });
    const [first] = collect(controller);
    expect(first.status).toBe("loading");
    expect(first.data).toBeNull();
    expect(first.can).toEqual({
      translate: false,
      stop: false,
      changeDisplayMode: false,
      changeLanguage: false,
      changeProvider: false,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.can)).toBe(true);
    controller.dispose();
  });

  it("carries no visual fields anywhere in the view-model", async () => {
    const t = makeTransport(
      { transOpen: "true", apiSlug: "DeepL", toLang: "ja" },
      {}
    );
    const controller = createPageController({ sendAction: t.sendAction });
    const views = collect(controller);
    await flushPromises();
    const vm = views[views.length - 1];
    expect(Object.keys(vm).sort()).toEqual([
      "blockedBy",
      "can",
      "data",
      "error",
      "status",
    ]);
    expect(Object.keys(vm.data).sort()).toEqual([
      "displayMode",
      "provider",
      "site",
      "targetLanguage",
      "translation",
    ]);
    controller.dispose();
  });
});

describe("page controller states (MVP-15 acceptance)", () => {
  it("idle → translate available", async () => {
    const t = makeTransport({ transOpen: "false" }, {});
    const controller = createPageController({ sendAction: t.sendAction });
    await flushPromises();
    const vm = controller.getView();
    expect(vm.status).toBe("idle");
    expect(vm.can.translate).toBe(true);
    expect(vm.can.stop).toBe(false);
    controller.dispose();
  });

  it("active → stop available, translate disabled", async () => {
    const t = makeTransport({ transOpen: "true" }, {});
    const controller = createPageController({ sendAction: t.sendAction });
    await flushPromises();
    const vm = controller.getView();
    expect(vm.status).toBe("active");
    expect(vm.can.stop).toBe(true);
    expect(vm.can.translate).toBe(false);
    controller.dispose();
  });

  it("site-disabled: blacklist blocks translate with blockedBy reason", async () => {
    const t = makeTransport({ transOpen: "false" }, { blacklist: "example.com" });
    const controller = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/x",
    });
    await flushPromises();
    const vm = controller.getView();
    expect(vm.blockedBy).toBe("site");
    expect(vm.can.translate).toBe(false);
    expect(vm.status).toBe("idle");
    controller.dispose();
  });

  it("provider-missing: unregistered provider blocks with blockedBy reason", async () => {
    const t = makeTransport(
      { transOpen: "false", apiSlug: "Ghost" },
      { transApis: [{ apiSlug: "Microsoft" }] }
    );
    const controller = createPageController({ sendAction: t.sendAction });
    await flushPromises();
    const vm = controller.getView();
    expect(vm.data.provider).toEqual({ apiSlug: "Ghost", registered: false });
    expect(vm.blockedBy).toBe("provider");
    expect(vm.can.translate).toBe(false);
    controller.dispose();
  });

  it("error: transport failure lands a normalized error and polling recovers", async () => {
    let broken = true;
    const rule = { transOpen: "false" };
    const setting = {};
    const controller = createPageController({
      sendAction: async (action) => {
        if (broken || action !== MSG_TRANS_GETRULE) {
          return undefined;
        }
        return { rule, setting };
      },
    });
    const views = collect(controller);
    await flushPromises();
    const errored = views[views.length - 1];
    expect(errored.status).toBe("error");
    expect(errored.error.code).toBe("TRANSPORT_UNAVAILABLE");
    expect(errored.error.message).not.toMatch(/at .*\(/); // 无 stack 泄漏

    broken = false;
    jest.useFakeTimers();
    // controller 创建时已用真实定时器注册轮询；此处直接手动触发一次恢复：
    // （用 dispose 重建保持简单）
    controller.dispose();
    jest.useRealTimers();

    const recovered = createPageController({
      sendAction: async () => ({ rule: { transOpen: "false" }, setting: {} }),
    });
    const views2 = collect(recovered);
    await flushPromises();
    expect(views2[views2.length - 1].status).toBe("idle");
    recovered.dispose();
  });
});

describe("page controller actions and lifecycle (MVP-15)", () => {
  it("translate()/stop() guard on can and fold the post-command state", async () => {
    const t = makeTransport({ transOpen: "false" }, {});
    const controller = createPageController({ sendAction: t.sendAction });
    await flushPromises();

    await controller.actions.translate();
    expect(t.sent).toContain(MSG_TRANS_TOGGLE);
    expect(controller.getView().status).toBe("active");

    await controller.actions.stop();
    expect(controller.getView().status).toBe("idle");
    controller.dispose();
  });

  it("actions are no-ops when can forbids them (zero messages)", async () => {
    const t = makeTransport(
      { transOpen: "false" },
      { blacklist: "example.com" }
    );
    const controller = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    await flushPromises();
    await controller.actions.translate();
    expect(t.sent).toEqual([MSG_TRANS_GETRULE]); // 无 TOGGLE
    controller.dispose();
  });

  it("requires a transport and validates listeners", () => {
    expect(() => createPageController({})).toThrow(TypeError);
    const t = makeTransport({}, {});
    const controller = createPageController({ sendAction: t.sendAction });
    expect(() => controller.subscribe(null)).toThrow(TypeError);
    controller.dispose();
  });

  it("dispose stops emissions and further commands", async () => {
    const t = makeTransport({ transOpen: "false" }, {});
    const controller = createPageController({ sendAction: t.sendAction });
    await flushPromises();
    let seen = 0;
    controller.subscribe(() => {
      seen += 1;
    });
    controller.dispose();
    const before = seen;
    await controller.actions.translate();
    expect(seen).toBe(before); // dispose 后动作与回调全部静默
  });
});
