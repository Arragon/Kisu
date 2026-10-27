// Options 装配根（M1 entry / DES-01 与 S2 铺路）。
// 把全部已交付 surface 经真实适配器/controller 接进 SettingsShell：
// General（#44 适配器）/ Page（#14 controller）/ Selection（#46 适配器）/
// YouTube（#33 controller）/ Services（#48）/ Advanced（#49）/ Appearance·Sites·About（V0.1 占位）。
// entry 层允许 import product + ui + config（boundary scan "other" 层）；
// 本组件不直接写 storage——一切写入经各适配器/controller 的注入 transport。
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPageController } from "../../product/page/controller";
import { createSubtitleController } from "../../product/subtitles/controller";
import {
  readGeneralSetting,
  updateGeneralUiLang,
  getUiLangOptions,
} from "../../product/settings/general";
import {
  readSelectionSetting,
  updateSelectionSetting,
  getTriggerModeOptions,
  getDictOptions,
} from "../../product/settings/selection";
import {
  getSubtitleLanguageOptions,
  getSubtitleLanguageFallback,
} from "../../product/subtitles/languages";
import { getLanguageOptions } from "../../product/page/languages";
import { listProviders } from "../../kcl/providers";
import { KISU_VERSION } from "../../kcl";
import { SettingsShell } from "../../ui/surfaces/settings/SettingsShell";
import { GeneralSection } from "../../ui/surfaces/settings/GeneralSection";
import { PageSection } from "../../ui/surfaces/settings/PageSection";
import { SelectionSection } from "../../ui/surfaces/settings/SelectionSection";
import { YouTubeSection } from "../../ui/surfaces/settings/YouTubeSection";
import { ServicesSection } from "../../ui/surfaces/settings/ServicesSection";
import { AdvancedSection } from "../../ui/surfaces/settings/AdvancedSection";
import { InlineStatus } from "../../ui/primitives";

const projection = (result) => (result.ok ? result.value : null);

export const OptionsApp = ({ dependencies, mode = "light", colorSet = null }) => {
  const {
    sendTab,
    getSetting,
    writeSetting,
    getStatus,
    onOpenLegacy,
  } = dependencies;

  const settingTransport = { readSetting: getSetting, writeSetting };

  // Page：live rule 轮询控制器（与 Popup 同源命令）
  const [pageController] = useState(() =>
    createPageController({ sendAction: sendTab, href: "" })
  );
  const [pageView, setPageView] = useState(pageController.getView());
  useEffect(() => {
    const off = pageController.subscribe(setPageView);
    return () => {
      off();
      pageController.dispose();
    };
  }, [pageController]);

  // YouTube：字幕控制器（轮询 + next-load 命令）
  const [subtitleController] = useState(() =>
    createSubtitleController({ getSetting, getStatus, writeSetting })
  );
  const [subtitleView, setSubtitleView] = useState(subtitleController.getView());
  useEffect(() => {
    const off = subtitleController.subscribe(setSubtitleView);
    return () => {
      off();
      subtitleController.dispose();
    };
  }, [subtitleController]);

  // 静态投影 setting 快照（General/Selection 写后刷新）
  const [setting, setSettingState] = useState(null);
  const refreshSetting = async () => setSettingState(await getSetting());
  useEffect(() => {
    refreshSetting();
  }, []);

  const general = setting ? projection(readGeneralSetting(setting)) : null;
  const selection = setting ? projection(readSelectionSetting(setting)) : null;
  const providers = setting ? projection(listProviders(setting)) : [];

  const sections = [
    {
      id: "general",
      content: general ? (
        <GeneralSection
          setting={general}
          uiLangOptions={getUiLangOptions()}
          onUpdate={async (patch) => {
            await updateGeneralUiLang(settingTransport, patch);
            await refreshSetting();
          }}
        />
      ) : (
        <InlineStatus tone="info">Loading…</InlineStatus>
      ),
    },
    {
      id: "page",
      content: (
        <PageSection
          viewModel={pageView}
          actions={pageController.actions}
          languageOptions={getLanguageOptions()}
        />
      ),
    },
    {
      id: "selection",
      content: selection ? (
        <SelectionSection
          setting={selection}
          triggerOptions={getTriggerModeOptions()}
          dictOptions={getDictOptions()}
          languageOptions={getSubtitleLanguageOptions()}
          providerOptions={providers.map((p) => ({
            value: p.apiSlug,
            label: p.name,
          }))}
          onUpdate={async (patch) => {
            await updateSelectionSetting(settingTransport, patch);
            await refreshSetting();
          }}
        />
      ) : (
        <InlineStatus tone="info">Loading…</InlineStatus>
      ),
    },
    {
      id: "youtube",
      content: (
        <YouTubeSection
          viewModel={subtitleView}
          actions={subtitleController.actions}
          languageOptions={getSubtitleLanguageOptions()}
          languageFallback={getSubtitleLanguageFallback()}
        />
      ),
    },
    {
      id: "services",
      content: <ServicesSection providers={providers} onOpenLegacy={onOpenLegacy} />,
    },
    {
      id: "appearance",
      content: (
        <InlineStatus tone="info">
          {`Theme follows the General darkMode setting ("${
            general ? general.darkMode : "auto"
          }"). Visual style is provisional until the Design Freedom Gate.`}
        </InlineStatus>
      ),
    },
    {
      id: "sites",
      content: (
        <InlineStatus tone="info">
          Per-site rules are managed from the popup while translating a page on
          that site (Always / Never / Reset).
        </InlineStatus>
      ),
    },
    {
      id: "advanced",
      content: <AdvancedSection onOpenLegacy={onOpenLegacy} />,
    },
    {
      id: "about",
      content: (
        <InlineStatus tone="info">{`Kisu ${KISU_VERSION} on KISS v2.0.32 baseline`}</InlineStatus>
      ),
    },
  ];

  return <SettingsShell sections={sections} onOpenLegacy={onOpenLegacy} mode={mode} colorSet={colorSet} />;
};

export const mountOptionsApp = ({
  dependencies,
  host,
  mode = "light",
  colorSet = null,
} = {}) => {
  if (!host || typeof host.appendChild !== "function") {
    throw new TypeError("mountOptionsApp requires a host element");
  }
  const frame = document.createElement("div");
  frame.setAttribute("data-kisu-options-app", "");
  host.appendChild(frame);
  const root = createRoot(frame);
  root.render(<OptionsApp dependencies={dependencies} mode={mode} colorSet={colorSet} />);
  return {
    element: frame,
    destroy: () => {
      root.unmount();
      if (frame.parentNode) {
        frame.parentNode.removeChild(frame);
      }
    },
  };
};
