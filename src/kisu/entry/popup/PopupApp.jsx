// Popup 装配根（M1 entry / 与 OptionsApp 同构）。
// 把 Page 全部 slot（MVP-18..23）经真实 #14 controller 接进 PopupShell；
// 站点策略的 domain/pattern 与黑名单读写由调用方注入（真实 popup 页接进
// TRACK popup.js 时即 mountPopupApp + 一行登记）。onReady(controller) 可选，
// 供宿主/测试在挂载后取得控制器句柄。
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPageController } from "../../product/page/controller";
import { PopupShell } from "../../ui/surfaces/popup/PopupShell";
import { PageSurface } from "../../ui/surfaces/page/PageSurface";
import { ModeProvider } from "../../ui/primitives";

export const PopupApp = ({
  dependencies: { sendTab, readSetting, writeSetting, readRules, writeRules },
  siteDomain = "",
  sitePattern = "",
  languageOptions,
  languageFallback,
  mode = "light",
  colorSet = null,
  onClose,
  onReady,
}) => {
  const transport = {
    sendTab,
    readSetting,
    writeSetting,
    ...(readRules ? { readRules } : {}),
    ...(writeRules ? { writeRules } : {}),
  };
  const [controller] = useState(() =>
    createPageController({ sendAction: sendTab, href: siteDomain, siteAccessors: transport })
  );
  const [view, setView] = useState(controller.getView());
  const readyRef = React.useRef(false);
  useEffect(() => {
    const off = controller.subscribe(setView);
    if (!readyRef.current && typeof onReady === "function") {
      readyRef.current = true;
      onReady(controller);
    }
    return () => {
      off();
      controller.dispose();
    };
  }, [controller]);
  void onReady;

  return (
    <ModeProvider mode={mode} colorSet={colorSet}>
      <PopupShell title="Kisu" viewModel={view} onClose={onClose} mode={mode} colorSet={colorSet}>
        <PageSurface
          viewModel={view}
          actions={controller.actions}
          languageOptions={languageOptions}
          languageFallback={languageFallback}
          siteDomain={siteDomain}
          sitePattern={sitePattern}
        />
      </PopupShell>
    </ModeProvider>
  );
};

export const mountPopupApp = ({
  dependencies,
  host,
  mode = "light",
  colorSet = null,
  siteDomain,
  sitePattern,
  languageOptions,
  languageFallback,
  onClose,
  onReady,
} = {}) => {
  if (!host || typeof host.appendChild !== "function") {
    throw new TypeError("mountPopupApp requires a host element");
  }
  const frame = document.createElement("div");
  frame.setAttribute("data-kisu-popup-app", "");
  host.appendChild(frame);
  const root = createRoot(frame);
  root.render(
    <PopupApp
      dependencies={dependencies}
      mode={mode}
      colorSet={colorSet}
      siteDomain={siteDomain}
      sitePattern={sitePattern}
      languageOptions={languageOptions}
      languageFallback={languageFallback}
      onClose={onClose}
      onReady={onReady}
    />
  );
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
