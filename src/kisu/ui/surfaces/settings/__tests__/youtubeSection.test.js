// YouTubeSection round-trip 测试（MVP-51 / INH-1192）。
// 真实 #33 subtitle controller → YouTubeSection → KCL next-load 命令 → 持久化折叠。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_SUBTITLE_SETTING } from "../../../../../config/setting";
import { YouTubeSection } from "../YouTubeSection";
import { createSubtitleController } from "../../../../product/subtitles/controller";
import {
  getSubtitleLanguageOptions,
  getSubtitleLanguageFallback,
} from "../../../../product/subtitles/languages";

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

const render = (ui) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const fireClick = (el) =>
  act(() => {
    el.click();
  });
const fireChange = (el, value) => {
  el.value = value;
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const APIS = [
  { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
  { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
];

const makeEnv = () => {
  const env = {
    setting: {
      transApis: APIS,
      subtitleSetting: { ...DEFAULT_SUBTITLE_SETTING },
    },
    writes: 0,
    getSetting: async () => env.setting,
    writeSetting: async (updater) => {
      env.writes += 1;
      env.setting = updater(env.setting);
    },
    getStatus: () => null,
  };
  return env;
};

const Harness = ({ controller }) => {
  const [view, setView] = useState(controller.getView());
  useEffect(() => controller.subscribe(setView), [controller]);
  return (
    <YouTubeSection
      viewModel={view}
      actions={controller.actions}
      languageOptions={getSubtitleLanguageOptions()}
      languageFallback={getSubtitleLanguageFallback()}
    />
  );
};

const mountWith = async (env) => {
  const controller = createSubtitleController(env);
  const rendered = render(<Harness controller={controller} />);
  await flushInAct();
  return { controller, ...rendered };
};

const radioByLabel = (container, label) =>
  [...container.querySelectorAll('[role="radio"]')].find(
    (r) => r.textContent === label
  );

describe("YouTubeSection round-trip (MVP-51)", () => {
  it("enable/disable persists via next-load and the view follows", async () => {
    const env = makeEnv();
    const { container, controller, unmount } = await mountWith(env);
    fireClick(container.querySelector('[data-testid="kisu-settings-youtube-toggle"]'));
    await flushInAct();
    expect(env.setting.subtitleSetting.enabled).toBe(false);
    expect(controller.getView().data.enabled).toBe(false);
    expect(
      container.querySelector('[data-testid="kisu-settings-youtube-toggle"]').textContent
    ).toBe("Enable subtitles");
    controller.dispose();
    unmount();
  });

  it("display mode / provider / language / context all persist", async () => {
    const env = makeEnv();
    const { container, controller, unmount } = await mountWith(env);

    fireClick(radioByLabel(container, "Translated only"));
    await flushInAct();
    expect(env.setting.subtitleSetting.isBilingual).toBe(false);

    fireChange(
      container.querySelector('[aria-label="Subtitle service"]'),
      "my-ai"
    );
    await flushInAct();
    expect(env.setting.subtitleSetting.apiSlug).toBe("my-ai");

    fireChange(
      container.querySelector('[aria-label="Subtitle language"]'),
      "ja"
    );
    await flushInAct();
    expect(env.setting.subtitleSetting.toLang).toBe("ja");

    fireChange(container.querySelector('[aria-label="Context mode"]'), "my-ai");
    await flushInAct();
    expect(env.setting.subtitleSetting.aiContextSlug).toBe("my-ai");
    expect(controller.getView().data.context.capability.supported).toBe(true);
    controller.dispose();
    unmount();
  });

  it("capability gating: absent stays configurable with the reason shown", async () => {
    const env = makeEnv();
    const { container, controller, unmount } = await mountWith(env);
    // 默认 aiContextSlug="-" → absent：select 可交互（配置它正是控件的目的），
    // reason 以 info 呈现（MVP-43 修正后的门控语义；broken 态由其单测覆盖）
    const select = container.querySelector('[aria-label="Context mode"]');
    expect(select.disabled).toBe(false);
    expect(
      container.querySelector('[data-testid="kisu-subtitle-context-reason"]').textContent
    ).toContain('not configured');
    controller.dispose();
    unmount();
  });
});
