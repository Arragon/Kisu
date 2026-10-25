// OnboardingWizard 测试（MVP-55 / INH-1196）。
// 验收：三步渲染与前进、跳过、后退、完成态 + onDone、错误呈现、键盘原生可达。
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { OnboardingWizard } from "../OnboardingWizard";
import { ModeProvider } from "../../../primitives";
import { createOnboardingMachine } from "../../../../product/onboarding/machine";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
  act(async () => {
    el.click();
    await flushPromises();
  });
const fireChange = (el, value) => {
  el.value = value;
  act(() => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const LANGUAGE = [
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
];
const SERVICES = [
  { value: "Microsoft", label: "Microsoft" },
  { value: "my-ai", label: "My AI" },
];
const APIS = [
  { apiSlug: "Microsoft", apiName: "Microsoft", apiType: "Microsoft" },
  { apiSlug: "my-ai", apiName: "My AI", apiType: "OpenAI" },
];

const makeMachine = () => {
  const env = {
    setting: { transApis: APIS, subtitleSetting: {} },
    rules: [{ pattern: "*" }],
    writes: { setting: 0, rules: 0 },
  };
  env.transport = {
    readSetting: async () => env.setting,
    writeSetting: async (updater) => {
      env.writes.setting += 1;
      env.setting = updater(env.setting);
    },
    readRules: async () => env.rules,
    writeRules: async (updater) => {
      env.writes.rules += 1;
      env.rules = updater(env.rules);
    },
  };
  return { machine: createOnboardingMachine({ transport: env.transport }), env };
};

const mountWizard = ({ onDone } = {}) => {
  const { machine, env } = makeMachine();
  const rendered = render(
    <ModeProvider>
      <OnboardingWizard
        machine={machine}
        languageOptions={LANGUAGE}
        serviceOptions={SERVICES}
        onDone={onDone}
      />
    </ModeProvider>
  );
  return { machine, env, ...rendered };
};

const buttonByText = (container, text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === text);

describe("OnboardingWizard (MVP-55)", () => {
  it("renders step 1 with language options and advances on Next", async () => {
    const { container, unmount } = mountWizard();
    expect(container.textContent).toContain("Step 1 of 3");
    expect(container.querySelector('[aria-label="Onboarding language"]')).toBeTruthy();
    fireChange(
      container.querySelector('[aria-label="Onboarding language"]'),
      "ja"
    );
    await fireClick(buttonByText(container, "Next"));
    expect(container.textContent).toContain("Step 2 of 3");
    unmount();
  });

  it("skip jumps forward; back returns", async () => {
    const { container, unmount } = mountWizard();
    await fireClick(buttonByText(container, "Skip"));
    expect(container.textContent).toContain("Step 2 of 3");
    await fireClick(buttonByText(container, "Back"));
    expect(container.textContent).toContain("Step 1 of 3");
    unmount();
  });

  it("completes all three steps and shows the done state with onDone", async () => {
    const onDone = jest.fn();
    const { container, env, unmount } = mountWizard({ onDone });

    fireChange(container.querySelector('[aria-label="Onboarding language"]'), "ja");
    await fireClick(buttonByText(container, "Next"));
    fireChange(container.querySelector('[aria-label="Onboarding service"]'), "my-ai");
    await fireClick(buttonByText(container, "Next"));
    await fireClick(
      container.querySelector('[data-testid="kisu-onboarding-auto-open"]')
    );
    await fireClick(buttonByText(container, "Finish"));

    expect(container.querySelector('[data-testid="kisu-onboarding-done"]')).not.toBeNull();
    expect(container.textContent).toContain("You're all set");
    expect(onDone).toHaveBeenCalledTimes(1);
    // 状态机已提交（经机器 commit? 注意：Finish 只收集；提交由机器 commit 完成——
    // 本向导在 behavior 步即 done。此处断言机器态而非存储：
    expect(env.writes.setting).toBe(0); // 向导不越权提交，commit 由宿主触发
    unmount();
  });

  it("surfaces machine validation errors inline", async () => {
    const { machine, container, unmount } = mountWizard();
    // 直接把机器推进到 service 步并注入非法选项，验证错误呈现
    machine.selectLanguage("ja");
    const bad = render(
      <ModeProvider>
        <OnboardingWizard
          machine={machine}
          languageOptions={LANGUAGE}
          serviceOptions={[{ value: "ghost", label: "Ghost" }]}
        />
      </ModeProvider>
    );
    fireChange(
      bad.container.querySelector('[aria-label="Onboarding service"]'),
      "ghost"
    );
    await fireClick(buttonByText(bad.container, "Next"));
    expect(bad.container.querySelector('[role="alert"], [role="status"]')).toBeTruthy();
    expect(bad.container.textContent).toContain("PROVIDER_NOT_FOUND");
    bad.unmount();
    unmount();
  });
});
