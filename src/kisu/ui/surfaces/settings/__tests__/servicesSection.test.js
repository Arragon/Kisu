// ServicesSection 测试（MVP-52 / INH-1193）。
// 验收：只读列表（名称/类型/可用性）、不可用标记、legacy 跳转回调、
// 凭据不可达、空列表。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ServicesSection } from "../ServicesSection";
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
    capabilities: Object.freeze({}),
  }),
  Object.freeze({
    apiSlug: "my-ai",
    name: "My AI",
    apiType: "OpenAI",
    usable: true,
    capabilities: Object.freeze({}),
  }),
  Object.freeze({
    apiSlug: "broken",
    name: "Broken",
    apiType: "NotAnEngine",
    usable: false,
    capabilities: Object.freeze({}),
  }),
]);

describe("ServicesSection (MVP-52)", () => {
  it("renders the read-only list with name/type/availability", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <ServicesSection providers={PROVIDERS} />
      </ModeProvider>
    );
    const rows = container.querySelectorAll(
      '[data-testid="kisu-settings-services-list"] > li'
    );
    expect(rows).toHaveLength(3);
    expect(
      container.querySelector('[data-testid="kisu-services-row-Microsoft"]').textContent
    ).toContain("Microsoft");
    expect(
      container.querySelector('[data-testid="kisu-services-row-Microsoft"]').textContent
    ).toContain("Ready");
    expect(
      container.querySelector('[data-testid="kisu-services-row-broken"]').textContent
    ).toContain("Check configuration");
    unmount();
  });

  it("forwards both legacy entry callbacks", () => {
    const onOpenLegacy = jest.fn();
    const { container, unmount } = render(
      <ModeProvider>
        <ServicesSection providers={PROVIDERS} onOpenLegacy={onOpenLegacy} />
      </ModeProvider>
    );
    const buttons = [...container.querySelectorAll("button")];
    fireClick(buttons.find((b) => b.textContent.includes("Manage credentials")));
    expect(onOpenLegacy).toHaveBeenCalledTimes(1);
    fireClick(buttons.find((b) => b.textContent.includes("Custom APIs")));
    expect(onOpenLegacy).toHaveBeenCalledTimes(2);
    unmount();
  });

  it("never exposes credential material and handles an empty list", () => {
    const withCreds = [
      { apiSlug: "x", name: "X", apiType: "OpenAI", usable: true, apiKey: "sk-secret", model: "gpt" },
    ];
    const { container, unmount } = render(
      <ModeProvider>
        <ServicesSection providers={withCreds} />
      </ModeProvider>
    );
    expect(container.textContent).not.toContain("sk-secret");
    expect(container.textContent).not.toContain("apiKey");
    unmount();

    const { container: c2, unmount: u2 } = render(
      <ModeProvider>
        <ServicesSection providers={[]} />
      </ModeProvider>
    );
    expect(c2.textContent).toContain("No services configured.");
    u2();
  });
});
