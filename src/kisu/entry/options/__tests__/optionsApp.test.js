// OptionsApp 装配根测试（M1 entry / DES-01 与 S2 铺路）。
// 验收：SettingsShell 渲染全部九 section、General 写经适配器持久化、
// Page section 接 live rule、YouTube 接 next-load、Advanced 回调。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_SETTING } from "../../../../config/setting";
import { DEFAULT_TRANBOX_SETTING } from "../../../../config/setting";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";
import { OptionsApp } from "../OptionsApp";

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
      mounted: false,
      processing: false,
      progressed: 0,
      autoTranslate: true,
      activeTrackKey: null,
      fromLang: "auto",
    },
  };
  world.dependencies = {
    sendTab: async (action, args) => {
      world.sent.push([action, args]);
      if (action === "trans_getrule") {
        return { rule: world.pageRule, setting: world.setting };
      }
      if (action === "trans_putrule") {
        world.pageRule = { ...world.pageRule, ...args };
      }
      return {};
    },
    getSetting: async () => world.setting,
    writeSetting: async (updater) => {
      world.setting = updater(world.setting);
    },
    getStatus: () => world.subtitleRuntime,
    onOpenLegacy: jest.fn(),
  };
  return world;
};

const renderApp = (world) => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<OptionsApp dependencies={world.dependencies} />);
  });
  return { host, unmount: () => act(() => root.unmount()) };
};

const navButton = (host, label) =>
  [...host.querySelectorAll("nav button")].find((b) => b.textContent === label);
const goto = async (host, label) => {
  act(() => {
    navButton(host, label).click();
  });
  await flushInAct();
};

describe("OptionsApp composition root (M1 entry)", () => {
  it("renders the shell with all nine sections", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    expect(host.querySelectorAll("nav button")).toHaveLength(9);
    unmount();
  });

  it("General section writes uiLang through the adapter", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    await goto(host, "General");
    const select = host.querySelector('[aria-label="Interface language"]');
    expect(select.value).toBe("en");
    world.dependencies; // keep reference
    act(() => {
      select.value = "zh";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushInAct();
    expect(world.setting.uiLang).toBe("zh");
    unmount();
  });

  it("Page section is wired to the live rule via the page controller", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    await goto(host, "Page");
    const select = host.querySelector('[aria-label="Page target language"]');
    act(() => {
      select.value = "ja";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushInAct();
    expect(world.sent).toContainEqual(["trans_putrule", { toLang: "ja" }]);
    expect(world.pageRule.toLang).toBe("ja");
    unmount();
  });

  it("YouTube section persists via next-load commands", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    await goto(host, "YouTube");
    const select = host.querySelector('[aria-label="Subtitle language"]');
    act(() => {
      select.value = "ja";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushInAct();
    expect(world.setting.subtitleSetting.toLang).toBe("ja");
    unmount();
  });

  it("Advanced section forwards the legacy navigation callback", async () => {
    const world = makeWorld();
    const { host, unmount } = renderApp(world);
    await flushInAct();
    await goto(host, "Advanced");
    const open = [...host.querySelectorAll("button")].find((b) =>
      b.textContent.includes("legacy settings")
    );
    act(() => {
      open.click();
    });
    expect(world.dependencies.onOpenLegacy).toHaveBeenCalledTimes(1);
    unmount();
  });
});
