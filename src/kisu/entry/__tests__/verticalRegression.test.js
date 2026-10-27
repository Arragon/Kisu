// 三核心场景纵切回归（MVP-57 / INH-1198，M0 出口 gate 自动化部分）。
// 一份共享世界同时驱动 Page / Selection / YouTube 三核心的真实链路
// （controller + surface/mount），断言端到端行为与**跨核无串扰**
// （一核的写入不改变另一核的事实源）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_SETTING } from "../../../config/setting";
import { DEFAULT_TRANBOX_SETTING } from "../../../config/setting";
import { DEFAULT_SUBTITLE_SETTING } from "../../../config/setting";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_TOGGLE,
  MSG_TRANS_PUTRULE,
} from "../../../config/msg";
import { createPageController } from "../../product/page/controller";
import { createSelectionController } from "../../product/selection/controller";
import { createSubtitleController } from "../../product/subtitles/controller";
import { mountSubtitleControl } from "../subtitles/mount";

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

// 共享世界：SETTING（全局）+ STOKEY_RULES（页面全局条目）+ 内容脚本 live rule
// + KP-001 快照源——三核各取所需，互不持有对方状态。
const makeWorld = () => {
  const world = {
    sent: [],
    pageRule: { transOpen: "false", toLang: "zh-CN", apiSlug: "Microsoft" },
    setting: {
      ...DEFAULT_SETTING,
      transApis: APIS,
      tranboxSetting: { ...DEFAULT_TRANBOX_SETTING, apiSlugs: ["Microsoft"] },
      subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING },
    },
    rules: [
      { pattern: "*", toLang: "zh-CN", apiSlug: "Microsoft", transOpen: "false" },
    ],
    subtitleRuntime: {
      videoId: "v1",
      mounted: true,
      processing: false,
      progressed: 0,
      autoTranslate: true,
      activeTrackKey: null,
      fromLang: "auto",
    },
  };
  world.sendTab = async (action, args) => {
    world.sent.push([action, args]);
    if (action === MSG_TRANS_GETRULE) {
      return { rule: world.pageRule, setting: world.setting };
    }
    if (action === MSG_TRANS_TOGGLE) {
      world.pageRule = {
        ...world.pageRule,
        transOpen: world.pageRule.transOpen === "true" ? "false" : "true",
      };
    }
    if (action === MSG_TRANS_PUTRULE) {
      world.pageRule = { ...world.pageRule, ...args };
    }
    return {};
  };
  world.transport = {
    sendTab: world.sendTab,
    readSetting: async () => world.setting,
    writeSetting: async (updater) => {
      world.setting = updater(world.setting);
    },
    readRules: async () => world.rules,
    writeRules: async (updater) => {
      world.rules = updater(world.rules);
    },
  };
  return world;
};

describe("three-core vertical regression (MVP-57 / INH-1198)", () => {
  it("page core: popup-equivalent round-trip through the shared KCL commands", async () => {
    const world = makeWorld();
    const controller = createPageController({
      sendAction: world.sendTab,
      href: "https://example.com/",
    });
    await flushInAct();
    expect(controller.getView().status).toBe("idle");

    await controller.actions.setTargetLanguage("ja");
    await flushInAct();
    expect(world.pageRule.toLang).toBe("ja");

    await controller.actions.translate();
    await flushInAct();
    expect(world.pageRule.transOpen).toBe("true");
    expect(controller.getView().status).toBe("active");
    controller.dispose();
  });

  it("selection core: classify → provider resolve → lookup through injected runner", async () => {
    const world = makeWorld();
    const lookups = [];
    const controller = createSelectionController({
      getSetting: async () => world.setting,
      runLookup: async (input) => {
        lookups.push(input);
        return { word: input.text };
      },
      runTranslate: async () => ({}),
    });
    await controller.open("serendipity");
    await flushInAct();
    const vm = controller.getView();
    expect(vm.data.text.kind).toBe("lexical");
    expect(vm.data.result.status).toBe("ready");
    expect(vm.data.providers.missing).toEqual([]);
    expect(lookups[0].text).toBe("serendipity");
    controller.dispose();
  });

  it("youtube core: mount renders and next-load command persists independently", async () => {
    const world = makeWorld();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mounted = mountSubtitleControl({
      getSetting: world.transport.readSetting,
      getStatus: () => world.subtitleRuntime,
      writeSetting: world.transport.writeSetting,
      host,
    });
    await flushInAct();
    expect(mounted.element.textContent).toContain("Subtitles active");

    await act(async () => {
      await mounted.controller.actions.setDisplayMode({ bilingual: false });
    });
    await flushInAct();
    expect(world.setting.subtitleSetting.isBilingual).toBe(false);
    mounted.destroy();
    host.remove();
  });

  it("cross-core independence: one core's write never mutates another core's source", async () => {
    const world = makeWorld();
    const page = createPageController({ sendAction: world.sendTab, href: "https://example.com/" });
    const subtitles = createSubtitleController({
      getSetting: world.transport.readSetting,
      writeSetting: world.transport.writeSetting,
      getStatus: () => world.subtitleRuntime,
    });
    await flushInAct();

    // 页面核写 toLang（PUTRULE → live rule）
    await page.actions.setTargetLanguage("ja");
    await flushInAct();
    // 字幕核写 toLang（SETTING subtitleSetting）
    await subtitles.actions.setTargetLanguage("ko");
    await flushInAct();

    expect(world.pageRule.toLang).toBe("ja"); // 页面核落在 live rule
    expect(world.setting.subtitleSetting.toLang).toBe("ko"); // 字幕核落在 SETTING
    // 互不污染：页面 PUTRULE 未触碰 subtitleSetting；字幕写入未触碰 rules
    expect(world.setting.subtitleSetting.toLang).not.toBe(world.pageRule.toLang);
    expect(world.rules[0].toLang).toBe("zh-CN"); // rules 全局条目未被页面核写入

    page.dispose();
    subtitles.dispose();
  });
});
