// PageProviderPicker 测试（MVP-21 / INH-1162）。
// 单元：注册表选项、选中、失效恢复状态、禁用、Manage 回调；
// 集成：controller → PUTRULE {apiSlug}；失效 provider 可经切换恢复（can 保持可用）。
import React, { useEffect, useState } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  MSG_TRANS_GETRULE,
  MSG_TRANS_PUTRULE,
} from "../../../../../config/msg";
import { PageProviderPicker } from "../PageProviderPicker";
import { PageSurface } from "../PageSurface";
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

const PROVIDERS = Object.freeze([
  Object.freeze({
    apiSlug: "Microsoft",
    name: "Microsoft",
    apiType: "Microsoft",
    usable: true,
    capabilities: Object.freeze({ ai: false, batch: true }),
  }),
  Object.freeze({
    apiSlug: "my-ai",
    name: "My AI",
    apiType: "OpenAI",
    usable: true,
    capabilities: Object.freeze({ ai: true, batch: false }),
  }),
  Object.freeze({
    apiSlug: "broken",
    name: "Broken",
    apiType: "NotAnEngine",
    usable: false,
    capabilities: Object.freeze({}),
  }),
]);

const vm = (overrides) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({
      provider: Object.freeze({ apiSlug: "Microsoft", registered: true }),
      providers: PROVIDERS,
    }),
    can: Object.freeze({ changeProvider: true }),
    blockedBy: null,
    error: null,
    ...overrides,
  });

describe("PageProviderPicker unit (MVP-21)", () => {
  it("lists usable providers by registry name and selects the current one", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageProviderPicker viewModel={vm()} />
      </ModeProvider>
    );
    const select = container.querySelector("select");
    // 不可用 provider（broken）不进入选项
    expect(
      [...select.querySelectorAll("option")].map((o) => o.value)
    ).toEqual(["Microsoft", "my-ai"]);
    expect(select.value).toBe("Microsoft");
    unmount();
  });

  it("shows a recoverable state for a stale current provider", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageProviderPicker
          viewModel={vm({
            data: Object.freeze({
              provider: Object.freeze({ apiSlug: "Ghost", registered: false }),
              providers: PROVIDERS,
            }),
            blockedBy: "provider",
          })}
        />
      </ModeProvider>
    );
    const status = container.querySelector('[role="status"]');
    expect(status.textContent).toContain("Ghost");
    expect(status.textContent).toContain("no longer available");
    // 回退选中第一个可用 provider
    expect(container.querySelector("select").value).toBe("Microsoft");
    unmount();
  });

  it("reports changes, disables with can, and forwards Manage", () => {
    const onSetProvider = jest.fn();
    const onManageServices = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <PageProviderPicker
          viewModel={vm()}
          onSetProvider={onSetProvider}
          onManageServices={onManageServices}
        />
      </ModeProvider>
    );
    fireChange(container.querySelector("select"), "my-ai");
    expect(onSetProvider).toHaveBeenCalledWith("my-ai");

    const manage = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Manage")
    );
    fireClick(manage);
    expect(onManageServices).toHaveBeenCalledTimes(1);

    const { container: c2, unmount: u2 } = render(
      <ModeProvider>
        <PageProviderPicker
          viewModel={vm({ can: Object.freeze({ changeProvider: false }) })}
        />
      </ModeProvider>
    );
    expect(c2.querySelector("select").disabled).toBe(true);
    unmount();
    u2();
  });
});

describe("PageProviderPicker integration (MVP-21)", () => {
  const SETTING = {
    blacklist: "",
    transApis: [
      { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
      { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
    ],
  };
  const makeTransport = (rule) => {
    const t = {
      sent: [],
      rule,
      sendAction: async (action, args) => {
        t.sent.push([action, args]);
        if (action === MSG_TRANS_GETRULE) {
          return { rule: t.rule, setting: SETTING };
        }
        if (action === MSG_TRANS_PUTRULE) {
          t.rule = { ...t.rule, ...args };
        }
        return {};
      },
    };
    return t;
  };

  const Harness = ({ controller }) => {
    const [view, setView] = useState(controller.getView());
    useEffect(() => controller.subscribe(setView), [controller]);
    return <PageSurface viewModel={view} actions={controller.actions} />;
  };

  it("recovers a stale provider by switching (can stays available, PUTRULE emitted)", async () => {
    const t = makeTransport({ transOpen: "false", apiSlug: "Ghost" });
    const controller = createPageController({
      sendAction: t.sendAction,
      href: "https://example.com/",
    });
    const { container, unmount } = render(<Harness controller={controller} />);
    await flushInAct();

    // 失效状态：主翻译被阻断，但换 provider 是恢复路径
    expect(controller.getView().blockedBy).toBe("provider");
    expect(controller.getView().can.changeProvider).toBe(true);
    expect(controller.getView().can.translate).toBe(false);
    expect(
      container.querySelector('[data-testid="kisu-page-provider"] [role="status"]')
        .textContent
    ).toContain("Ghost");

    fireChange(
      container.querySelector('[aria-label="Translation service"]'),
      "my-ai"
    );
    await flushInAct();
    expect(t.sent).toContainEqual([MSG_TRANS_PUTRULE, { apiSlug: "my-ai" }]);
    expect(controller.getView().blockedBy).toBe(null);
    expect(controller.getView().can.translate).toBe(true);
    controller.dispose();
    unmount();
  });

  it("keeps the view when the provider command fails", async () => {
    const t = makeTransport({ transOpen: "false", apiSlug: "Microsoft" });
    let fail = false;
    const failing = {
      sendAction: async (action, args) => {
        if (action === MSG_TRANS_PUTRULE && fail) {
          return { error: "rejected" };
        }
        return t.sendAction(action, args);
      },
    };
    const controller = createPageController({
      sendAction: failing.sendAction,
      href: "https://example.com/",
    });
    await flushInAct();
    fail = true;
    await controller.actions.setProvider("my-ai");
    expect(controller.getView().data.provider.apiSlug).toBe("Microsoft");
    expect(controller.getView().status).toBe("idle");
    controller.dispose();
  });
});
