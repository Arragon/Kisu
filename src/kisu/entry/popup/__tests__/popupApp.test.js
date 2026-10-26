// PopupApp 装配根测试（M1 entry，与 OptionsApp 同构）。
// 验收：shell 渲染、toggle → MSG_TRANS_TOGGLE、站点策略 never 拉黑（黑名单写 +
// 视图 blockedBy 翻转）、语言 PUTRULE、Advanced 之外无额外 DOM。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_SETTING } from "../../../../config/setting";
import { DEFAULT_TRANBOX_SETTING } from "../../../../config/setting";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_TOGGLE,
  MSG_TRANS_PUTRULE,
} from "../../../../config/msg";
import { PopupApp, mountPopupApp } from "../PopupApp";
import { getLanguageOptions, getDefaultTargetLanguage } from "../../../product/page/languages";

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

const makeWorld = ({ blacklist = "" } = {}) => {
  const world = {
    sent: [],
    pageRule: { transOpen: "false", toLang: "zh-CN", apiSlug: "Microsoft" },
    setting: {
      ...DEFAULT_SETTING,
      blacklist,
      transApis: APIS,
      tranboxSetting: { ...DEFAULT_TRANBOX_SETTING, apiSlugs: ["Microsoft"] },
      subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING },
    },
    rules: [
      { pattern: "*", toLang: "zh-CN", apiSlug: "Microsoft", transOpen: "false" },
    ],
  };
  world.dependencies = {
    sendTab: async (action, args) => {
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
    },
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

const renderApp = (world, props = {}) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  let mounted;
  act(() => {
    mounted = mountPopupApp({
      dependencies: world.dependencies,
      host,
      siteDomain: "example.com",
      sitePattern: "example.com",
      languageOptions: getLanguageOptions(),
      languageFallback: getDefaultTargetLanguage(),
      ...props,
    });
  });
  return { host, unmount: () => mounted.destroy() };
};

const buttonByText = (host, text) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === text);

describe("PopupApp composition root (M1 entry)", () => {
  it("renders the shell with the page surface wired", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    expect(host.querySelector("[data-kisu-popup-app]")).not.toBeNull();
    expect(
      host.querySelector('[data-testid="kisu-page-surface"]')
    ).not.toBeNull();
    unmount();
  });

  it("toggle translates through the shared KCL commands", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    await act(async () => {
      buttonByText(host, "Translate").click();
      await flushPromises();
    });
    await flushInAct();
    expect(world.sent).toContainEqual([MSG_TRANS_TOGGLE, undefined]);
    expect(buttonByText(host, "Stop")).toBeTruthy();
    unmount();
  });

  it("site preference Never blacklists via injected setting accessors", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    // 经 controller 动作驱动（DOM 接线由 PrimaryAction 用例证明）；
    // SitePreferenceAction 的按钮渲染已在 MVP-22 surface 单测覆盖。
    const controllerRef = { current: null };
    world.dependenciesProbe = controllerRef;
    await act(async () => {
      buttonByText(host, "Never").click();
      await flushPromises();
    });
    await flushInAct();
    await act(async () => {
      buttonByText(host, "Never").click();
      await flushPromises();
    });
    await flushInAct();
    expect(world.setting.blacklist).toContain("example.com");
    expect(
      host.querySelector('[data-testid="kisu-page-status"]').textContent
    ).toContain("Reset below");
    unmount();
  });

  it("language change goes through PUTRULE", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    console.log("DBG4 TEXT:", host.textContent.slice(0, 100), "SELECTS:", JSON.stringify([...host.querySelectorAll("select")].map((s) => s.getAttribute("aria-label"))));
    const select = host.querySelector('[aria-label="Target language"]');
    act(() => {
      select.value = "ja";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushInAct();
    expect(world.sent).toContainEqual([MSG_TRANS_PUTRULE, { toLang: "ja" }]);
    unmount();
  });

  it("requires a host element", () => {
    const world = makeWorld();
    expect(() => mountPopupApp({ dependencies: world.dependencies, host: null })).toThrow(
      TypeError
    );
  });
});
