// YouTube SPA 生命周期回归矩阵（MVP-45 / INH-1186）。
// Kisu 侧集成真相：真实 mount（entry）+ 真实 controller + KP-001 快照源的可变
// 模拟（上游 SPA 行为本身已由 YouTubeCaptionProvider.test.js 的 KP-001 用例覆盖，
// 见 PR #8）。真实浏览器步骤（真实 YouTube 页面验证）按 SHELVED-LOCAL S2 搁置。
// 矩阵：切换视频 / 前进后退 / 晚到字幕 / 中途改 provider / 禁用再启用 / 无 stale。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";
import { mountSubtitleControl } from "../mount";

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
  { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
];

// 可变 KP-001 快照源（形状与 getStatusSnapshot 一致）
const makeRuntime = () => {
  const state = {
    videoId: "v1",
    mounted: false,
    autoTranslate: true,
    progressed: 0,
    processing: false,
    activeTrackKey: null,
    fromLang: "auto",
  };
  return {
    getStatus: () => ({ ...state }),
    navigate: (videoId, mounted) => {
      Object.assign(state, {
        videoId,
        mounted,
        processing: false,
        progressed: 0,
        activeTrackKey: null,
      });
    },
  };
};

const makeWorld = ({ enabled = true } = {}) => {
  const runtime = makeRuntime();
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
    getStatus: runtime.getStatus,
    runtime,
  };
  return env;
};

const mountInto = (env) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const mounted = mountSubtitleControl({ ...env, host });
  return { host, mounted };
};

const text = (host) =>
  host.querySelector("[data-kisu-subtitle-control]").textContent;

describe("YouTube SPA regression matrix (MVP-45)", () => {
  it("late captions: panel transitions from no-captions to active", async () => {
    const env = makeWorld();
    const { host, mounted } = mountInto(env);
    await flushInAct();
    expect(text(host)).toContain("No subtitles found");

    env.runtime.navigate("v1", true); // 晚到字幕轨激活
    await act(async () => {
      await mounted.controller.refresh();
    });
    await flushInAct();
    expect(text(host)).toContain("Subtitles active");
    mounted.destroy();
    host.remove();
  });

  it("video switch and back/forward follow the snapshot without stale state", async () => {
    const env = makeWorld({ enabled: true });
    env.runtime.navigate("v1", true);
    const { host, mounted } = mountInto(env);
    await flushInAct();

    env.runtime.navigate("v2", true); // 切换视频
    await act(async () => {
      await mounted.controller.refresh();
    });
    await flushInAct();
    expect(mounted.controller.getView().data.runtime.videoId).toBe("v2");

    env.runtime.navigate("v1", true); // 前进后退回 v1
    await act(async () => {
      await mounted.controller.refresh();
    });
    await flushInAct();
    expect(mounted.controller.getView().data.runtime.videoId).toBe("v1");
    // 无 stale：面板容器始终唯一
    expect(
      host.querySelectorAll("[data-kisu-subtitle-control]")
    ).toHaveLength(1);
    mounted.destroy();
    host.remove();
  });

  it("provider change mid-session persists via next-load and the view follows", async () => {
    const env = makeWorld();
    env.runtime.navigate("v1", true);
    const { mounted } = mountInto(env);
    await flushInAct();

    await act(async () => {
      await mounted.controller.actions.setProvider("my-ai");
    });
    expect(env.setting.subtitleSetting.apiSlug).toBe("my-ai");
    expect(mounted.controller.getView().data.provider.apiSlug).toBe("my-ai");
    mounted.destroy();
  });

  it("disable then re-enable keeps the panel mounted throughout", async () => {
    const env = makeWorld();
    env.runtime.navigate("v1", true);
    const { host, mounted } = mountInto(env);
    await flushInAct();

    await act(async () => {
      await mounted.controller.actions.setEnabled(false);
    });
    await flushInAct();
    expect(text(host)).toContain("Subtitles are disabled");
    expect(host.querySelector("[data-kisu-subtitle-control]")).not.toBeNull();

    await act(async () => {
      await mounted.controller.actions.setEnabled(true);
    });
    await flushInAct();
    expect(text(host)).toContain("Subtitles active");
    mounted.destroy();
    host.remove();
  });

  it("destroy fully unwinds after the full cycle (no orphan timers or DOM)", async () => {
    const env = makeWorld();
    env.runtime.navigate("v1", true);
    const { host, mounted } = mountInto(env);
    await flushInAct();

    env.runtime.navigate("v2", true);
    await act(async () => {
      await mounted.controller.refresh();
    });
    mounted.destroy();
    expect(host.querySelector("[data-kisu-subtitle-control]")).toBeNull();

    const views = [];
    mounted.controller.subscribe((vm) => views.push(vm)); // 订阅回放当前视图（约定）
    const afterReplay = views.length;
    env.runtime.navigate("v3", true);
    await mounted.controller.refresh();
    expect(views.length).toBe(afterReplay); // dispose 后零发射
    host.remove();
  });
});
