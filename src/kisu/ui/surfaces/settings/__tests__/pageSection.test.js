// PageSection 测试（MVP-49 / INH-1190）。
// round-trip 验收：真实 page controller（#14）→ PageSection → PUTRULE → 视图折叠。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
} from "../../../../../config/msg";
import { PageSection } from "../PageSection";
import { ModeProvider } from "../../../primitives";
import { createPageController } from "../../../../product/page/controller";
import {
  getLanguageOptions,
  getDefaultTargetLanguage,
} from "../../../../product/page/languages";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LANG_OPTIONS = getLanguageOptions();
const LANG_FALLBACK = getDefaultTargetLanguage();

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

const fireChange = (el, value) => {
  el.value = value;
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};
const fireClick = (el) =>
  act(() => {
    el.click();
  });

// 模拟内容脚本：GETRULE 回读 live rule；PUTRULE 写入
const makeContentScriptTransport = (rule, setting) => {
  const t = {
    sent: [],
    rule,
    setting,
    sendAction: async (action, args) => {
      t.sent.push([action, args]);
      if (action === MSG_TRANS_GETRULE) {
        return { rule: t.rule, setting: t.setting };
      }
      if (action === MSG_TRANS_PUTRULE) {
        t.rule = { ...t.rule, ...args };
      }
      return {};
    },
  };
  return t;
};

const SETTING = {
  blacklist: "",
  transApis: [
    { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
    { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
  ],
};

const Harness = ({ controller }) => {
  const [view, setView] = useState(controller.getView());
  useEffect(() => controller.subscribe(setView), [controller]);
  return (
    <PageSection
      viewModel={view}
      actions={controller.actions}
      languageOptions={LANG_OPTIONS}
    />
  );
};

const mountWith = async (t) => {
  const controller = createPageController({
    sendAction: t.sendAction,
    href: "https://example.com/",
  });
  const rendered = render(<Harness controller={controller} />);
  await flushInAct();
  return { controller, ...rendered };
};

describe("PageSection round-trip (MVP-49)", () => {
  it("language change goes through KCL and reads back", async () => {
    const t = makeContentScriptTransport(
      { transOpen: "false", toLang: "zh-CN" },
      SETTING
    );
    const { container, controller, unmount } = await mountWith(t);
    fireChange(
      container.querySelector('[aria-label="Page target language"]'),
      "ja"
    );
    await flushInAct();
    expect(t.sent).toContainEqual([MSG_TRANS_PUTRULE, { toLang: "ja" }]);
    expect(controller.getView().data.targetLanguage).toBe("ja");
    controller.dispose();
    unmount();
  });

  it("provider change goes through KCL with registry validation", async () => {
    const t = makeContentScriptTransport({ transOpen: "false" }, SETTING);
    const { container, controller, unmount } = await mountWith(t);
    fireChange(
      container.querySelector('[aria-label="Page translation service"]'),
      "my-ai"
    );
    await flushInAct();
    expect(t.sent).toContainEqual([MSG_TRANS_PUTRULE, { apiSlug: "my-ai" }]);
    expect(controller.getView().data.provider.apiSlug).toBe("my-ai");
    controller.dispose();
    unmount();
  });

  it("display mode chips emit the frozen patches", async () => {
    const t = makeContentScriptTransport(
      { transOpen: "false", transOnly: "false", transOrder: "original-first" },
      SETTING
    );
    const { container, unmount } = await mountWith(t);
    fireClick(
      container.querySelector('[data-testid="kisu-page-mode-translated"]')
    );
    await flushInAct();
    expect(t.sent).toContainEqual([MSG_TRANS_PUTRULE, { transOnly: "true" }]);
    unmount();
  });

  it("stale provider shows a recoverable warning", async () => {
    const t = makeContentScriptTransport({ transOpen: "false", apiSlug: "Ghost" }, SETTING);
    const { container, unmount } = await mountWith(t);
    expect(
      container.querySelector('[data-testid="kisu-settings-page"] [role="status"]')
        .textContent
    ).toContain("Ghost");
    unmount();
  });
});
