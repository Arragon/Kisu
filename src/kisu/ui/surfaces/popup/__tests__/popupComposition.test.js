// Popup 正式构图测试（DES-05 / INH-1206）。
// 验收：Ink 构图（DESIGN-DIRECTION §6）——发丝线三组分层、全宽主动作、
// 长名称/长错误安全、标题层级；不改变 Page 行为契约（view-model/动作 wiring
// 由 MVP-18..23 各自测试守护，此处只锁视觉组合）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { getColorPalette } from "../../../tokens/tokens";
import { PopupShell } from "../PopupShell";
import { PageSurface } from "../../page/PageSurface.jsx";
import { PrimaryAction } from "../../page/PrimaryAction.jsx";
import { PageStatus } from "../../page/PageStatus.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const palette = getColorPalette("light");
const toRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
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

const vm = (overrides = {}) =>
  Object.freeze({
    status: "idle",
    data: Object.freeze({
      displayMode: Object.freeze({ onlyTranslation: false, order: "original-first" }),
      targetLanguage: "en",
      providers: Object.freeze([
        Object.freeze({ apiSlug: "google", name: "Google Translate", usable: true }),
        Object.freeze({
          apiSlug: "long-provider",
          name: "A Very Long Translation Service Name That Must Not Break The Popup Layout",
          usable: true,
        }),
      ]),
      provider: Object.freeze({ apiSlug: "google" }),
      site: Object.freeze({ autoTranslate: false, blacklisted: false }),
    }),
    can: Object.freeze({
      translate: true,
      stop: false,
      changeDisplayMode: true,
      changeLanguage: true,
      changeProvider: true,
      changeSitePreference: true,
    }),
    blockedBy: null,
    error: null,
    ...overrides,
  });

const languageOptions = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "Chinese (Simplified) — a rather long display name" },
];

describe("PopupShell formal chrome (DES-05)", () => {
  it("separates the header with a hairline rule and uses md+strong title", () => {
    const { container, unmount } = render(
      <PopupShell title="Kisu" viewModel={vm()}>
        <span>x</span>
      </PopupShell>
    );
    const header = container.querySelector("header");
    expect(header.style.borderBottom).toBe(`1px solid ${palette.border.default}`);
    expect(header.style.paddingBottom).toBe("8px"); // space.sm
    const title = [...header.children].find((el) => el.textContent === "Kisu");
    expect(title.style.fontSize).toBe("14px"); // type.size.md
    expect(title.style.fontWeight).toBe("700"); // type.weight.strong
    unmount();
  });
});

describe("PageSurface group composition (DES-05)", () => {
  it("renders action / settings / site groups separated by hairline rules", () => {
    const { container, unmount } = render(
      <PageSurface
        viewModel={vm()}
        actions={{}}
        languageOptions={languageOptions}
        languageFallback="en"
        siteDomain="example.com"
        sitePattern="*://example.com/*"
      />
    );
    const separators = [...container.querySelectorAll('[role="separator"]')];
    expect(separators).toHaveLength(2);
    separators.forEach((sep) => {
      expect(sep.style.backgroundColor).toBe(toRgb(palette.border.default));
      expect(sep.style.height).toBe("1px");
    });

    // 三组归属：设置组收 Display/Language/Provider；Site 组独立于组外
    const settingsGroup = container.querySelector(
      '[data-testid="kisu-page-settings-group"]'
    );
    expect(settingsGroup.querySelector('[data-testid="kisu-page-display-mode"]')).not.toBeNull();
    expect(settingsGroup.querySelector('[data-testid="kisu-page-language"]')).not.toBeNull();
    expect(settingsGroup.querySelector('[data-testid="kisu-page-provider"]')).not.toBeNull();
    expect(settingsGroup.querySelector('[data-testid="kisu-page-site"]')).toBeNull();
    expect(container.querySelector('[data-testid="kisu-page-site"]')).not.toBeNull();
    unmount();
  });
});

describe("PrimaryAction full-width emphasis (DES-05)", () => {
  it("stretches the primary button to the full popup width", () => {
    const { container, unmount } = render(
      <PrimaryAction viewModel={vm()} onTranslate={() => {}} />
    );
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Translate"
    );
    expect(button.style.width).toBe("100%");
    unmount();
  });

  it("keeps full width when the blocked reason wraps it in a tooltip", () => {
    const { container, unmount } = render(
      <PrimaryAction
        viewModel={vm({
          can: Object.freeze({ translate: false, stop: false }),
          blockedBy: "site",
        })}
      />
    );
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Translate"
    );
    expect(button.style.width).toBe("100%");
    expect(button.parentElement.style.width).toBe("100%"); // Tooltip wrapper
    unmount();
  });
});

describe("long-state safety (DES-05 acceptance)", () => {
  it("lets the provider select consume the row and renders long names", () => {
    const { container, unmount } = render(
      <PageSurface viewModel={vm()} actions={{}} />
    );
    const select = container.querySelector('[aria-label="Translation service"]');
    expect(select.style.flexGrow).toBe("1");
    expect(select.style.minWidth).toBe("0");
    const longOption = [...select.options].find((o) =>
      o.textContent.startsWith("A Very Long Translation Service Name")
    );
    expect(longOption).toBeTruthy(); // 长名称完整可用（原生下拉承载）
    unmount();
  });

  it("distributes the three site actions evenly across the row", () => {
    const { container, unmount } = render(
      <PageSurface viewModel={vm()} actions={{}} />
    );
    const row = container.querySelector('[data-testid="kisu-page-site"] > div');
    const buttons = [...row.querySelectorAll("button")];
    expect(buttons.map((b) => b.textContent.replace(/\s+/g, " ").trim())).toEqual([
      "Always translate",
      "Never",
      "Reset",
    ]);
    buttons.forEach((button) => {
      expect(button.style.flexGrow).toBe("1");
    });
    unmount();
  });

  it("wraps long error messages instead of overflowing the 360px shell", () => {
    const { container, unmount } = render(
      <PageStatus
        viewModel={vm({
          status: "error",
          data: null,
          error: {
            code: "PROVIDER_REQUEST_FAILED",
            message:
              "An Extremely Long Failure Description Repeated To Prove Wrapping Behaviour In The Popup Status Line Without Horizontal Overflow",
          },
        })}
      />
    );
    const status = container.querySelector('[role="status"]');
    expect(status.textContent).toContain("Without Horizontal Overflow");
    expect(status.style.overflowWrap).toBe("anywhere");
    unmount();
  });
});
