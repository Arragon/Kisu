// Onboarding 三步向导（MVP-55 / INH-1196）。
// 消费 #50 状态机实例（subscribe 回放 + 动作调用）；每步本地选择态在步进时
// 提交给状态机（校验/收集归机器）；Skip/Back 走机器动作；done 态可接 onDone。
// 键盘可达（原生 button/select）；视觉全 token 语义名。
import React, { useEffect, useState } from "react";
import { ModeProvider, Button, Select, InlineStatus, useColorPalette } from "../../primitives";
import { space, type } from "../../tokens/tokens";

const useMachineView = (machine) => {
  const [view, setView] = useState(machine.getView());
  useEffect(() => machine.subscribe(setView), [machine]);
  return view;
};

const StepBody = ({ view, choice, setChoice, options, error }) => {
  const palette = useColorPalette();
  if (view.step === "language") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
        <span style={{ fontSize: type.size.md, color: palette.text.primary }}>
          Pick your translation target language
        </span>
        <Select
          aria-label="Onboarding language"
          options={options.language}
          value={choice.lang}
          onChange={(next) => setChoice((c) => ({ ...c, lang: next }))}
        />
      </div>
    );
  }
  if (view.step === "service") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
        <span style={{ fontSize: type.size.md, color: palette.text.primary }}>
          Pick a translation service
        </span>
        <Select
          aria-label="Onboarding service"
          options={options.service}
          value={choice.service}
          onChange={(next) => setChoice((c) => ({ ...c, service: next }))}
        />
      </div>
    );
  }
  if (view.step === "behavior") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
        <span style={{ fontSize: type.size.md, color: palette.text.primary }}>
          Translate pages automatically?
        </span>
        <Button
          variant={choice.autoOpen ? "primary" : "secondary"}
          aria-pressed={choice.autoOpen}
          onClick={() => setChoice((c) => ({ ...c, autoOpen: !c.autoOpen }))}
          data-testid="kisu-onboarding-auto-open"
        >
          {choice.autoOpen ? "Auto-translate pages: on" : "Auto-translate pages: off"}
        </Button>
      </div>
    );
  }
  return (
    <InlineStatus tone="success" data-testid="kisu-onboarding-done">
      You're all set. You can change everything later in Settings.
    </InlineStatus>
  );
};

export const OnboardingWizard = ({
  machine,
  languageOptions,
  serviceOptions,
  onDone,
}) => {
  const palette = useColorPalette();
  const view = useMachineView(machine);
  const [choice, setChoice] = useState({ lang: "", service: "", autoOpen: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const first = (options) => (options[0] ? options[0].value : "");

  const next = async () => {
    setError(null);
    setBusy(true);
    try {
      if (view.step === "language") {
        const result = machine.selectLanguage(choice.lang || first(languageOptions));
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else if (view.step === "service") {
        const result = await machine.selectService(
          choice.service || first(serviceOptions)
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else if (view.step === "behavior") {
        const result = machine.setPageAutoOpen(Boolean(choice.autoOpen));
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (typeof onDone === "function") {
          onDone();
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError(null);
    machine.back();
  };

  const skip = () => {
    setError(null);
    machine.skip();
  };

  const stepIndex = ["language", "service", "behavior"].indexOf(view.step);
  const isDone = view.step === "done";

  return (
    <ModeProvider>
      <div
        data-testid="kisu-onboarding-wizard"
        style={{ display: "flex", flexDirection: "column", gap: space.md, maxWidth: 420 }}
      >
        <span
          style={{
            fontSize: type.size.sm,
            fontWeight: type.weight.medium,
            color: palette.text.secondary,
          }}
        >
          {isDone ? "Setup complete" : `Step ${stepIndex + 1} of 3`}
        </span>
        <StepBody view={view} choice={choice} setChoice={setChoice} options={{ language: languageOptions, service: serviceOptions }} error={error} />
        {error && <InlineStatus tone="error">{`${error.code}: ${error.message}`}</InlineStatus>}
        {!isDone && (
          <div style={{ display: "flex", gap: space.sm }}>
            {stepIndex > 0 && (
              <Button onClick={back} disabled={busy}>
                Back
              </Button>
            )}
            <Button variant="primary" onClick={next} disabled={busy}>
              {view.step === "behavior" ? "Finish" : "Next"}
            </Button>
            <Button onClick={skip} disabled={busy}>
              Skip
            </Button>
          </div>
        )}
      </div>
    </ModeProvider>
  );
};
