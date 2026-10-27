// Selection trigger 适配器测试（MVP-33 / INH-1174）。
// 验收：mouseup/dblclick 路由到 controller.open、guard 抑制、destroy 解绑、
// 缺宿主拒绝。
import { act } from "react";
import {
  readSelectionSnapshot,
  createSelectionTrigger,
  bindSelectionTrigger,
} from "../trigger";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};

const makeSelection = (text, rect) => ({
  rangeCount: 1,
  toString: () => text,
  getRangeAt: () => ({
    getBoundingClientRect: () => rect || { left: 1, right: 2, top: 3, bottom: 4 },
  }),
});

const makeController = () => {
  const opened = [];
  return {
    opened,
    controller: {
      open: async (text) => {
        opened.push(text);
      },
    },
  };
};

const makeGetSelection = (text) => () => makeSelection(text);

const makeHost = () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host;
};

const fire = (host, type) =>
  act(async () => {
    host.dispatchEvent(new MouseEvent(type, { bubbles: true }));
    await flushPromises();
  });

describe("readSelectionSnapshot (MVP-33)", () => {
  it("extracts text and rect", () => {
    const snapshot = readSelectionSnapshot(makeSelection("hello world"));
    expect(snapshot.text).toBe("hello world");
    expect(snapshot.rect).toEqual({ left: 1, right: 2, top: 3, bottom: 4 });
  });

  it("returns null for empty selection or whitespace-only text", () => {
    expect(readSelectionSnapshot(null)).toBeNull();
    expect(readSelectionSnapshot({ rangeCount: 0 })).toBeNull();
    expect(readSelectionSnapshot(makeSelection("   "))).toBeNull();
  });
});

describe("createSelectionTrigger (MVP-33)", () => {
  it("routes mouseup to controller.open with the selected text", async () => {
    const { opened, controller } = makeController();
    const result = createSelectionTrigger({
      controller,
      getSelection: makeGetSelection("selected text"),
    });
    expect(result.ok).toBe(true);
    result.value.onMouseUp();
    await flushPromises();
    expect(opened).toEqual(["selected text"]);
    result.value.destroy();
  });

  it("guard suppresses without opening", async () => {
    const { opened, controller } = makeController();
    const result = createSelectionTrigger({
      controller,
      getSelection: makeGetSelection("12345"),
      guard: (text) => !/^\d+$/.test(text), // 纯数字抑制（上游语义派生）
    });
    result.value.onMouseUp();
    await flushPromises();
    expect(opened).toEqual([]);
    result.value.destroy();
  });

  it("destroy stops all further routing", async () => {
    const { opened, controller } = makeController();
    const result = createSelectionTrigger({
      controller,
      getSelection: makeGetSelection("text"),
    });
    result.value.onMouseUp();
    await flushPromises();
    const count = opened.length;
    result.value.destroy();
    result.value.onMouseUp();
    await flushPromises();
    expect(opened.length).toBe(count);
  });

  it("requires a controller with open()", () => {
    expect(() => createSelectionTrigger({ getSelection: () => null })).toThrow(
      TypeError
    );
  });
});

describe("bindSelectionTrigger (MVP-33)", () => {
  it("binds mouseup/dblclick to a host and cleans up on destroy", async () => {
    const { opened, controller } = makeController();
    const host = makeHost();
    const result = bindSelectionTrigger({
      host,
      controller,
      getSelection: makeGetSelection("bound text"),
    });
    expect(result.ok).toBe(true);

    await fire(host, "mouseup");
    expect(opened).toEqual(["bound text"]);
    result.value.destroy();

    await fire(host, "mouseup");
    expect(opened).toEqual(["bound text"]); // destroy 后不再路由
    host.remove();
  });

  it("rejects a missing host", () => {
    const { controller } = makeController();
    const result = bindSelectionTrigger({
      host: null,
      controller,
      getSelection: () => null,
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("UNSUPPORTED_INPUT");
  });
});
