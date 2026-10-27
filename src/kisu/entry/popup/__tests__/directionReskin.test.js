// DES-01 整页换肤测试（M1 entry）：PopupApp / OptionsApp 接受方向 colorSet，
// primitives 实际取方向色板（dark 模式下与默认色板可区分），语义槽位不变。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_SETTING } from "../../../../config/setting";
import { DEFAULT_TRANBOX_SETTING } from "../../../../config/setting";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../config/setting";
import { PopupApp } from "../PopupApp";
import { OptionsApp } from "../../options/OptionsApp";
import { DESIGN_DIRECTIONS } from "../../../ui/tokens/directions";
import { getLanguageOptions, getDefaultTargetLanguage } from "../../../product/page/languages";
import {
  getSubtitleLanguageOptions,
  getSubtitleLanguageFallback,
} from "../../../product/subtitles/languages";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ink = DESIGN_DIRECTIONS.find((d) => d.id === "ink");
const ember = DESIGN_DIRECTIONS.find((d) => d.id === "ember");
const toRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

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

const makeWorld = () => {
  const world = {
    sent: [],
    pageRule: { transOpen: "false", toLang: "zh-CN", apiSlug: "Microsoft" },
    setting: {
      ...DEFAULT_SETTING,
      blacklist: "",
      transApis: APIS,
      tranboxSetting: { ...DEFAULT_TRANBOX_SETTING, apiSlugs: ["Microsoft"] },
      subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING },
    },
    rules: [{ pattern: "*" }],
  };
  world.dependencies = {
    sendTab: async (action, args) => {
      world.sent.push([action, args]);
      if (action === "trans_getrule") {
        return { rule: world.pageRule, setting: world.setting };
      }
      return {};
    },
    getSetting: async () => world.setting,
    readSetting: async () => world.setting,
    writeSetting: async (updater) => {
      world.setting = updater(world.setting);
    },
    getStatus: () => null,
    onOpenLegacy: () => {},
  };
  return world;
};

describe("DES-01 full-page reskin via colorSet (M1 entry)", () => {
  it("PopupApp renders with the Ink palette in dark mode", async () => {
    const world = makeWorld();
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      createRoot(host).render(
        <PopupApp
          dependencies={world.dependencies}
          mode="dark"
          colorSet={ink.tokens.color}
          siteDomain="example.com"
          languageOptions={getLanguageOptions()}
          languageFallback={getDefaultTargetLanguage()}
        />
      );
    });
    await flushInAct();
    const shell = host.querySelector('[data-testid="kisu-popup-shell"]');
    expect(shell.style.backgroundColor).toBe(
      toRgb(ink.tokens.color.dark.bg.default)
    );
    unmountHost(host);
  });

  it("OptionsApp renders with the Ember palette in dark mode", async () => {
    const world = makeWorld();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <OptionsApp
          dependencies={world.dependencies}
          mode="dark"
          colorSet={ember.tokens.color}
        />
      );
    });
    await flushInAct();
    const content = host.querySelector('[data-testid="kisu-settings-content"]');
    expect(content.style.backgroundColor).toBe(
      toRgb(ember.tokens.color.dark.bg.default)
    );
    act(() => root.unmount());
    host.remove();
  });
});

const unmountHost = (host) => {
  host.remove();
};
