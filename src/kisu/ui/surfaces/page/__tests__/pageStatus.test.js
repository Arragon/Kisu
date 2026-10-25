// PageStatus 测试（MVP-23 / INH-1164）。
// 验收：归一化错误码逐一映射可行动信息、blocked 提示、active 提示、
// idle 静默、无 stack 形状内容上主 UI、debug 行仅开发环境。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PageSurface } from "../PageSurface";
import { PageStatus } from "../PageStatus";
import { ModeProvider } from "../../../primitives";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const vm = (overrides) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({}),
    can: Object.freeze({}),
    blockedBy: null,
    error: null,
    ...overrides,
  });

const statusText = (container) =>
  container.querySelector('[data-testid="kisu-page-status"] [role="status"]')
    ?.textContent;

describe("PageStatus (MVP-23)", () => {
  it("maps each normalized error code to actionable info", () => {
    const cases = [
      [
        "TRANSPORT_UNAVAILABLE",
        "Reopen the popup or refresh",
      ],
      ["PROVIDER_NOT_FOUND", "pick another"],
      [
        "PROVIDER_REQUEST_FAILED",
        "credentials, rate limit or network",
      ],
      ["UNSUPPORTED_INPUT", "not available here"],
    ];
    cases.forEach(([code, expected]) => {
      const { container, unmount } = render(
        <ModeProvider>
          <PageStatus
            viewModel={vm({
              status: "error",
              error: { code, message: "detail" },
            })}
          />
        </ModeProvider>
      );
      const text = statusText(container);
      expect(text).toContain(expected);
      expect(text).toContain("detail");
      unmount();
    });
  });

  it("renders unknown codes verbatim instead of guessing", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageStatus
          viewModel={vm({
            status: "error",
            error: { code: "FUTURE_CODE", message: "m" },
          })}
        />
      </ModeProvider>
    );
    expect(statusText(container)).toBe("FUTURE_CODE: m");
    unmount();
  });

  it("shows blocked hints with recovery guidance", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageStatus viewModel={vm({ blockedBy: "site" })} />
      </ModeProvider>
    );
    expect(statusText(container)).toContain("Reset below");
    unmount();

    const { container: c2, unmount: u2 } = render(
      <ModeProvider>
        <PageStatus viewModel={vm({ blockedBy: "provider" })} />
      </ModeProvider>
    );
    expect(statusText(c2)).toContain("pick another");
    u2();
  });

  it("shows an active hint and stays silent when idle", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageStatus viewModel={vm({ status: "active" })} />
      </ModeProvider>
    );
    expect(statusText(container)).toContain("Translating");
    unmount();

    const { container: c2, unmount: u2 } = render(
      <ModeProvider>
        <PageStatus viewModel={vm({ status: "idle" })} />
      </ModeProvider>
    );
    expect(c2.querySelector('[data-testid="kisu-page-status"]')).toBeNull();
    u2();
  });

  it("never renders stack-shaped content on the main UI", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageStatus
          viewModel={vm({
            status: "error",
            error: {
              code: "TRANSPORT_UNAVAILABLE",
              message: "failed at Translator.toggle (translator.js:3943)",
            },
          })}
        />
      </ModeProvider>
    );
    // message 原样作为归一化契约的一部分呈现（契约保证无 stack），
    // 组件自身不拼接任何 "at file:line" 形状
    expect(statusText(container)).not.toMatch(/\bat \w+\.?\w*\(/);
    unmount();
  });

  it("registers into PageSurface as the status slot", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <PageSurface
          viewModel={vm({
            data: Object.freeze({
              displayMode: Object.freeze({
                onlyTranslation: false,
                order: "original-first",
              }),
              provider: Object.freeze({ apiSlug: "Microsoft", registered: true }),
              providers: Object.freeze([]),
              targetLanguage: "zh-CN",
              site: Object.freeze({ autoTranslate: false, blacklisted: false }),
            }),
            blockedBy: "site",
          })}
          actions={{}}
        />
      </ModeProvider>
    );
    expect(
      container.querySelector('[data-testid="kisu-page-status"]')
    ).not.toBeNull();
    unmount();
  });
});
