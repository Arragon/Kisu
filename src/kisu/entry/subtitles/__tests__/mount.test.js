// mount 入口测试（MVP-39 / INH-1180）。
// 验收：并行挂载（自有容器追加进 host，不触碰其他 DOM）、disabled 也挂载、
// destroy 一次性清理（退订 + unmount + 控制器 dispose 停轮询）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { mountSubtitleControl } from "../mount";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
};
const flushInAct = async () => {
  await act(async () => {
    await flushPromises();
  });
};

const APIS = [
  { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
];

const makeEnv = ({ enabled = true } = {}) => {
  const env = {
    setting: {
      transApis: APIS,
      subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING, enabled },
    },
    writes: 0,
    getSetting: async () => env.setting,
    writeSetting: async (updater) => {
      env.writes += 1;
      env.setting = updater(env.setting);
    },
    getStatus: () => ({
      videoId: "v1",
      mounted: true,
      processing: false,
      progressed: 0,
      autoTranslate: true,
      activeTrackKey: null,
      fromLang: "auto",
    }),
  };
  return env;
};

describe("mountSubtitleControl (MVP-39)", () => {
  it("appends its own container into the host and renders the control", async () => {
    const env = makeEnv();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mounted = mountSubtitleControl({ ...env, host });
    expect(host.querySelector("[data-kisu-subtitle-control]")).toBe(mounted.element);

    await flushInAct();
    expect(mounted.element.textContent).toContain("Subtitles active");
    expect(mounted.element.textContent).toContain("Disable");

    mounted.destroy();
    expect(host.querySelector("[data-kisu-subtitle-control]")).toBeNull();
    host.remove();
  });

  it("mounts while subtitles are disabled", async () => {
    const env = makeEnv({ enabled: false });
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mounted = mountSubtitleControl({ ...env, host });
    await flushInAct();
    expect(mounted.element.textContent).toContain("Subtitles are disabled");
    mounted.destroy();
    host.remove();
  });

  it("destroy disposes the controller: no further polling emissions", async () => {
    jest.useFakeTimers();
    const env = makeEnv();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mounted = mountSubtitleControl({ ...env, host, intervalMs: 1000 });
    const views = [];
    const off = mounted.controller.subscribe((vm) => views.push(vm));
    await flushPromises();
    mounted.destroy();

    env.setting = {
      ...env.setting,
      subtitleSetting: { ...env.setting.subtitleSetting, enabled: false },
    };
    jest.advanceTimersByTime(3000);
    await flushPromises();
    const count = views.length;
    jest.advanceTimersByTime(3000);
    expect(views.length).toBe(count); // dispose 后轮询停止
    off();
    jest.useRealTimers();
    host.remove();
  });

  it("does not touch unrelated host children (parallel mount)", async () => {
    const env = makeEnv();
    const host = document.createElement("div");
    const upstream = document.createElement("button");
    upstream.id = "upstream-button";
    host.appendChild(upstream);
    document.body.appendChild(host);

    const mounted = mountSubtitleControl({ ...env, host });
    await flushInAct();
    expect(document.getElementById("upstream-button")).toBe(upstream); // 未被动过
    mounted.destroy();
    expect(document.getElementById("upstream-button")).toBe(upstream);
    host.remove();
  });

  it("requires a host element", () => {
    const env = makeEnv();
    expect(() => mountSubtitleControl({ ...env, host: null })).toThrow(TypeError);
  });
});
