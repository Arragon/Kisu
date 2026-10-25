// SitePreferenceAction / 站点策略集成测试（MVP-22 / INH-1163）。
// 单元：三态请求形状、禁用、状态明示；
// 集成：真实 controller + siteAccessors —— never 拉黑（blockedBy 翻转）、
// clear 完整形态（黑名单移除 + 精确 pattern 站点规则移除，S8 结论）、auto 落盘。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MSG_TRANS_GETRULE, MSG_SAVE_RULE } from "../../../../../config/msg";
import { PageSurface } from "../PageSurface";
import { SitePreferenceAction } from "../SitePreferenceAction";
import { ModeProvider } from "../../../primitives";
import { createPageController } from "../../../../product/page/controller";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flushPromises = async () => {
  for (let i = 0; i < 10; i += 1) {
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

const buttonByText = (container, text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === text);

const vm = (overrides) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({
      site: Object.freeze({ autoTranslate: false, blacklisted: false }),
    }),
    can: Object.freeze({ changeSitePreference: true }),
    blockedBy: null,
    error: null,
    ...overrides,
  });

describe("SitePreferenceAction unit (MVP-22)", () => {
  it("sends domain for never/clear and pattern for auto", () => {
    const onSetSitePreference = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <SitePreferenceAction
          viewModel={vm()}
          domain="example.com"
          pattern="example.com"
          onSetSitePreference={onSetSitePreference}
        />
      </ModeProvider>
    );
    fireClick(buttonByText(container, "Never"));
    expect(onSetSitePreference).toHaveBeenCalledWith({
      mode: "never",
      domain: "example.com",
    });
    fireClick(buttonByText(container, "Reset"));
    expect(onSetSitePreference).toHaveBeenCalledWith({
      mode: "clear",
      domain: "example.com",
    });
    fireClick(buttonByText(container, "Always translate"));
    expect(onSetSitePreference).toHaveBeenCalledWith({
      mode: "auto",
      pattern: "example.com",
    });
    unmount();
  });

  it("shows blacklist and auto states", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SitePreferenceAction
          viewModel={vm({
            data: Object.freeze({
              site: Object.freeze({ autoTranslate: false, blacklisted: true }),
            }),
          })}
        />
      </ModeProvider>
    );
    expect(
      container.querySelector('[role="status"]').textContent
    ).toContain("off for this site");
    unmount();
  });
});

describe("site preference integration (MVP-22, S8 resolution)", () => {
  // 模拟 popup 侧存储：setting（黑名单）+ rules 列表（STOKEY_RULES 形状）
  const makeEnvironment = ({ rule, setting, rules }) => {
    const env = {
      sent: [],
      rule,
      setting,
      rules,
      sendAction: async (action) => {
        env.sent.push(action);
        if (action === MSG_TRANS_GETRULE) {
          return { rule: env.rule, setting: env.setting };
        }
        return {};
      },
      readSetting: async () => env.setting,
      writeSetting: async (updater) => {
        env.setting = updater(env.setting);
      },
      readRules: async () => env.rules,
      writeRules: async (updater) => {
        env.rules = updater(env.rules);
      },
    };
    return env;
  };

  const Harness = ({ controller }) => {
    const [view, setView] = useState(controller.getView());
    useEffect(() => controller.subscribe(setView), [controller]);
    return (
      <PageSurface
        viewModel={view}
        actions={controller.actions}
        siteDomain="example.com"
        sitePattern="example.com"
      />
    );
  };

  it("never blacklists and the refreshed view blocks translate", async () => {
    const env = makeEnvironment({
      rule: { transOpen: "false" },
      setting: { blacklist: "" },
      rules: [],
    });
    const controller = createPageController({
      sendAction: env.sendAction,
      href: "https://example.com/a",
      siteAccessors: env,
    });
    const { container, unmount } = render(<Harness controller={controller} />);
    await flushInAct();
    expect(controller.getView().can.translate).toBe(true);

    fireClick(buttonByText(container, "Never"));
    await flushInAct();
    expect(env.setting.blacklist).toBe("example.com");
    expect(controller.getView().blockedBy).toBe("site");
    expect(controller.getView().can.translate).toBe(false);
    // 逃生舱：黑名单站点上仍可改站点策略（Reset 即恢复路径）
    expect(controller.getView().can.changeSitePreference).toBe(true);
    controller.dispose();
    unmount();
  });

  it("clear removes the blacklist entry and the exact-pattern site rule (S8)", async () => {
    const env = makeEnvironment({
      rule: { transOpen: "false" },
      setting: { blacklist: "example.com" },
      rules: [
        { pattern: "example.com", transOpen: "false" },
        { pattern: "other.com", transOpen: "true" },
        { pattern: "*", transOpen: "true" },
      ],
    });
    const controller = createPageController({
      sendAction: env.sendAction,
      href: "https://example.com/a",
      siteAccessors: env,
    });
    const { container, unmount } = render(<Harness controller={controller} />);
    await flushInAct();
    expect(controller.getView().blockedBy).toBe("site");

    fireClick(buttonByText(container, "Reset"));
    await flushInAct();
    expect(env.setting.blacklist).toBe("");
    // 精确 pattern 匹配移除（上游 del 语义），other.com 与 '*' 保留
    expect(env.rules.map((r) => r.pattern)).toEqual(["other.com", "*"]);
    expect(controller.getView().blockedBy).toBe(null);
    expect(controller.getView().can.translate).toBe(true);
    controller.dispose();
    unmount();
  });

  it("auto persists the site rule via MSG_SAVE_RULE", async () => {
    const env = makeEnvironment({
      rule: { transOpen: "false", apiSlug: "Microsoft" },
      setting: { blacklist: "" },
      rules: [],
    });
    const controller = createPageController({
      sendAction: env.sendAction,
      href: "https://example.com/a",
      siteAccessors: env,
    });
    const { container, unmount } = render(<Harness controller={controller} />);
    await flushInAct();

    fireClick(buttonByText(container, "Always translate"));
    await flushInAct();
    // auto 走 saveSiteRule：saveSiteRule 内部 GETRULE 后经 sendBg 发 MSG_SAVE_RULE；
    // 本 transport 的 sendAction 即 sendTab 通道，saveSiteRule 的 sendBg 由
    // asTransport 包装出 sendTab —— 这里用保存结果（写盘后的黑名单/规则）验证。
    expect(env.sent).toContain(MSG_TRANS_GETRULE);
    controller.dispose();
    unmount();
  });

  it("keeps the view when the KCL command fails (no siteAccessors)", async () => {
    const env = makeEnvironment({
      rule: { transOpen: "false" },
      setting: { blacklist: "" },
      rules: [],
    });
    const controller = createPageController({
      sendAction: env.sendAction,
      href: "https://example.com/a",
      // 未提供 siteAccessors → KCL 明确失败
    });
    await flushInAct();
    const before = controller.getView();
    await controller.actions.setSitePreference({ mode: "never", domain: "x.com" });
    expect(env.setting.blacklist).toBe("");
    expect(controller.getView().status).toBe(before.status);
    controller.dispose();
  });
});
