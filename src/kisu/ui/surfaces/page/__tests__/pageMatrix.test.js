// Page Popup 行为测试矩阵（MVP-24 / INH-1165）。
// MVP-18..23 全部产品状态收拢为一张可复跑矩阵；每一行都走真实链路：
// createPageController（ADR-014 轮询）→ PopupShell → PageSurface 全 slot。
// 不做视觉 pixel snapshot；light/dark 用 token 断言；长本地化文本验证布局不失效。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MSG_TRANS_GETRULE, MSG_TRANS_TOGGLE } from "../../../../../config/msg";
import { getColorPalette } from "../../../tokens/tokens";
import { PopupShell } from "../../popup/PopupShell";
import { PageSurface } from "../PageSurface";
import { createPageController } from "../../../../product/page/controller";
import {
  getLanguageOptions,
  getDefaultTargetLanguage,
} from "../../../../product/page/languages";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const light = getColorPalette("light");
const dark = getColorPalette("dark");
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
const fireKey = (el, key) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });

const LANG_OPTIONS = getLanguageOptions();
const LANG_FALLBACK = getDefaultTargetLanguage();

// 可配置的内容脚本模拟：GETRULE / TOGGLE / PUTRULE / 存储访问器
const makeTransport = ({
  rule = { transOpen: "false" },
  setting = {
    blacklist: "",
    transApis: [{ apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" }],
  },
  rules = [],
  getruleFails = false,
  hang = false,
} = {}) => {
  const t = {
    sent: [],
    rule,
    setting,
    rules,
    sendAction: (action, args) => {
      t.sent.push([action, args]);
      if (action === MSG_TRANS_GETRULE) {
        if (hang) {
          return new Promise(() => {});
        }
        if (getruleFails) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve({ rule: t.rule, setting: t.setting });
      }
      if (action === MSG_TRANS_TOGGLE) {
        t.rule = {
          ...t.rule,
          transOpen: t.rule.transOpen === "true" ? "false" : "true",
        };
      }
      return Promise.resolve({});
    },
    readSetting: async () => t.setting,
    writeSetting: async (updater) => {
      t.setting = updater(t.setting);
    },
    readRules: async () => t.rules,
    writeRules: async (updater) => {
      t.rules = updater(t.rules);
    },
  };
  return t;
};

const Harness = ({ controller, mode }) => {
  const [view, setView] = useState(controller.getView());
  useEffect(() => controller.subscribe(setView), [controller]);
  return (
    <PopupShell title="Kisu" mode={mode} viewModel={view}>
      <PageSurface
        viewModel={view}
        actions={controller.actions}
        languageOptions={LANG_OPTIONS}
        languageFallback={LANG_FALLBACK}
        siteDomain="example.com"
        sitePattern="example.com"
      />
    </PopupShell>
  );
};

const mount = async (t, mode = "light") => {
  const controller = createPageController({
    sendAction: t.sendAction,
    href: "https://example.com/page",
    siteAccessors: t,
  });
  const rendered = render(<Harness controller={controller} mode={mode} />);
  await flushInAct();
  return { controller, ...rendered };
};

const primaryButton = (container) =>
  [...container.querySelectorAll("button")].find((b) =>
    ["Translate", "Stop", "Translate…"].includes(b.textContent)
  );
const statusText = (container) =>
  container.querySelector('[data-testid="kisu-page-status"] [role="status"]')
    ?.textContent;
const shell = (container) =>
  container.querySelector('[data-testid="kisu-popup-shell"]');

describe("Page Popup behavior matrix (MVP-24)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each([
    [
      "idle: Translate enabled, status silent, idle visuals",
      { rule: { transOpen: "false" } },
      ({ container }) => {
        expect(primaryButton(container).textContent).toBe("Translate");
        expect(primaryButton(container).disabled).toBe(false);
        expect(container.querySelector('[data-testid="kisu-page-status"]')).toBeNull();
      },
    ],
    [
      "active: Stop shown, active status hint",
      { rule: { transOpen: "true" } },
      ({ container }) => {
        expect(primaryButton(container).textContent).toBe("Stop");
        expect(statusText(container)).toContain("Translating");
      },
    ],
    [
      "loading: shell placeholder, controls absent",
      { hang: true },
      ({ container }) => {
        expect(
          container.querySelector('[data-testid="kisu-popup-loading"]')
        ).not.toBeNull();
        expect(primaryButton(container)).toBeUndefined();
      },
    ],
    [
      "error: shell shows the normalized error with recovery guidance",
      { getruleFails: true },
      ({ container }) => {
        // error 态由 PopupShell 的状态占位呈现（children 不渲染）
        const statuses = [...container.querySelectorAll('[role="status"]')];
        expect(statuses.length).toBeGreaterThan(0);
        expect(statuses.map((s) => s.textContent).join(" ")).toContain(
          "Reopen the popup or refresh"
        );
        expect(primaryButton(container)).toBeUndefined();
      },
    ],
    [
      "site-blocked: disabled with Reset escape hatch available",
      { rule: { transOpen: "false" }, setting: { blacklist: "example.com", transApis: [] } },
      ({ container }) => {
        expect(statusText(container)).toContain("Reset below");
        expect(primaryButton(container).disabled).toBe(true);
        const reset = [...container.querySelectorAll("button")].find(
          (b) => b.textContent === "Reset"
        );
        expect(reset.disabled).toBe(false);
      },
    ],
    [
      "provider-blocked: stale slug with working recovery picker",
      {
        rule: { transOpen: "false", apiSlug: "Ghost" },
        setting: {
          blacklist: "",
          transApis: [{ apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" }],
        },
      },
      ({ container }) => {
        expect(statusText(container)).toContain("pick another");
        expect(primaryButton(container).disabled).toBe(true);
        expect(
          container.querySelector('[data-testid="kisu-page-provider"] [role="status"]').textContent
        ).toContain("Ghost");
      },
    ],
  ])("%s", (_name, transportArgs, assert) => {
    const t = makeTransport(transportArgs);
    return mount(t).then(({ container, controller, unmount }) => {
      assert({ container });
      controller.dispose();
      unmount();
    });
  });

  it("unknown language code falls back with an inline notice", async () => {
    const t = makeTransport({
      rule: { transOpen: "false", toLang: "xx-Unknown" },
    });
    const { container, controller, unmount } = await mount(t);
    const languageBox = container.querySelector('[data-testid="kisu-page-language"]');
    expect(languageBox.querySelector("select").value).toBe(LANG_FALLBACK);
    expect(languageBox.querySelector('[role="status"]').textContent).toContain(
      "xx-Unknown"
    );
    controller.dispose();
    unmount();
  });

  it("keyboard activation toggles through the real surface", async () => {
    const t = makeTransport({ rule: { transOpen: "false" } });
    const { container, controller, unmount } = await mount(t);
    fireKey(primaryButton(container), "Enter");
    await flushInAct();
    expect(t.sent).toContainEqual([MSG_TRANS_TOGGLE, undefined]);
    expect(primaryButton(container).textContent).toBe("Stop");
    controller.dispose();
    unmount();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ])("%s mode resolves the palette end to end", async (mode, palette) => {
    const t = makeTransport({ rule: { transOpen: "false" } });
    const { container, controller, unmount } = await mount(t, mode);
    expect(shell(container).style.backgroundColor).toBe(
      toRgb(palette.bg.default)
    );
    expect(primaryButton(container).style.backgroundColor).toBe(
      toRgb(palette.action.primary)
    );
    controller.dispose();
    unmount();
  });

  it("long localized labels keep every control present and clickable", async () => {
    const longName = "Supercalifragilisticexpialidocious · 超长本地化服务名称测试用例 · Довгое имя";
    const t = makeTransport({
      rule: { transOpen: "false", apiSlug: "Microsoft" },
      setting: {
        blacklist: "",
        transApis: [
          { apiSlug: "Microsoft", apiName: longName, apiType: "Microsoft" },
        ],
      },
    });
    const { container, controller, unmount } = await mount(t);
    const select = container.querySelector(
      '[aria-label="Translation service"]'
    );
    expect(select).toBeTruthy();
    expect(
      [...select.querySelectorAll("option")].some((o) => o.label === longName || o.textContent === longName)
    ).toBe(true);
    // 长文本下主动作与状态区仍可交互/呈现
    expect(primaryButton(container).disabled).toBe(false);
    controller.dispose();
    unmount();
  });
});
