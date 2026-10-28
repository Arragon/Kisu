// Settings/Onboarding Ink 视觉收敛测试（DES-08 / INH-1209）。
// 验收：内容区发丝线容器、legacy 入口去重（shell fallback 仅在未注入 section
// 级入口时出现）、Advanced escape hatch 唯一强调动作、长本地化文案可换行；
// settings projection 与 onboarding 状态机零改动（各自测试守护）。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { getColorPalette } from "../../../tokens/tokens";
import { SettingsShell } from "../SettingsShell";
import { AdvancedSection } from "../AdvancedSection";
import { ServicesSection } from "../ServicesSection";
import { GeneralSection } from "../GeneralSection";
import { OnboardingWizard } from "../../onboarding/OnboardingWizard";
import { ModeProvider } from "../../../primitives";

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

const LONG_TEXT =
  "An Extremely Long Localized Sentence Repeated To Prove Wrapping Behaviour Inside The Settings Panel Without Horizontal Overflow";

const navButtons = (container) =>
  [...container.querySelectorAll("nav button")];

const plainSections = [
  { id: "general", content: <div>general body</div> },
  { id: "advanced", content: <div>advanced body</div> },
];

describe("SettingsShell formal frame (DES-08)", () => {
  it("wraps section content in a hairline-bordered container", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <SettingsShell sections={plainSections} />
      </ModeProvider>
    );
    const content = container.querySelector('[data-testid="kisu-settings-content"]');
    expect(content.style.border).toBe(`1px solid ${palette.border.default}`);
    expect(content.style.borderRadius).toBe("4px"); // radius.md
    unmount();
  });

  it("keeps the shell legacy fallback only when onOpenLegacy is provided", () => {
    const withProp = render(
      <ModeProvider>
        <SettingsShell sections={plainSections} onOpenLegacy={() => {}} />
      </ModeProvider>
    );
    act(() => {
      navButtons(withProp.container)
        .find((b) => b.textContent === "Advanced")
        .click();
    });
    expect(withProp.container.textContent).toContain("Open legacy settings");
    withProp.unmount();

    const withoutProp = render(
      <ModeProvider>
        <SettingsShell sections={plainSections} />
      </ModeProvider>
    );
    act(() => {
      navButtons(withoutProp.container)
        .find((b) => b.textContent === "Advanced")
        .click();
    });
    expect(withoutProp.container.textContent).not.toContain("Open legacy settings");
    withoutProp.unmount();
  });
});

describe("Advanced escape hatch clarity (DES-08)", () => {
  it("makes the legacy entry the single emphasized action and wraps the banner", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <AdvancedSection onOpenLegacy={() => {}} />
      </ModeProvider>
    );
    const button = container.querySelector('[data-testid="kisu-advanced-open-legacy"]');
    expect(button.textContent).toBe("Open legacy settings");
    // primary = 近黑/纸白反色（Ink action token），非默认描边 secondary
    expect(button.style.backgroundColor).toBe(toRgb(palette.action.primary));
    const banner = container.querySelector('[role="status"]');
    expect(banner.style.overflowWrap).toBe("anywhere");
    unmount();
  });
});

describe("long localization safety (DES-08 acceptance)", () => {
  it("wraps long provider names in the services list", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <ServicesSection
          providers={[
            { apiSlug: "long-provider", name: LONG_TEXT, apiType: "ai", usable: true },
          ]}
          onOpenLegacy={() => {}}
        />
      </ModeProvider>
    );
    const row = container.querySelector('[data-testid="kisu-services-row-long-provider"]');
    expect(row).not.toBeNull();
    const name = [...row.querySelectorAll("span")].find((el) =>
      el.textContent.includes("Extremely Long Localized")
    );
    expect(name.style.overflowWrap).toBe("anywhere");
    unmount();
  });

  it("wraps long theme text in the general section", () => {
    const { container, unmount } = render(
      <ModeProvider>
        <GeneralSection
          setting={{
            uiLang: "en",
            uiLangRaw: null,
            darkMode: LONG_TEXT,
            shortcuts: {},
          }}
          uiLangOptions={[{ value: "en", label: "English" }]}
        />
      </ModeProvider>
    );
    const theme = [...container.querySelectorAll('[role="status"]')].find((el) =>
      el.textContent.includes("Theme follows")
    );
    expect(theme.style.overflowWrap).toBe("anywhere");
    unmount();
  });

  it("wraps long onboarding validation errors", () => {
    const machine = {
      getView: () => ({ step: "language" }),
      subscribe: () => () => {},
      selectLanguage: () => ({
        ok: false,
        error: { code: "UNSUPPORTED_INPUT", message: LONG_TEXT },
      }),
      back: () => {},
      skip: () => {},
    };
    const { container, unmount } = render(
      <OnboardingWizard
        machine={machine}
        languageOptions={[{ value: "en", label: "English" }]}
        serviceOptions={[{ value: "Microsoft", label: "Microsoft" }]}
      />
    );
    const next = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Next"
    );
    act(() => {
      next.click();
    });
    const error = container.querySelector('[role="status"]');
    expect(error.textContent).toContain(LONG_TEXT);
    expect(error.style.overflowWrap).toBe("anywhere");
    unmount();
  });
});
