import { useDemo } from "../../contexts/DemoContext";
import { useI18n } from "../../contexts/I18nContext";

export default function StepRail() {
  const { currentStep, completedSteps, setStep, reset } = useDemo();
  const { t } = useI18n();

  const steps = Array.from({ length: 8 }, (_, i) => ({
    label: t(`rail.step${i}`),
    desc: t(`rail.step${i}Desc`),
  }));

  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "1rem",
      height: "fit-content",
      position: "sticky",
      top: "5rem",
    }}>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: "0.7rem",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "0.75rem",
      }}>
        {t("rail.lifecycleSteps")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {steps.map((step, i) => {
          const isCompleted = completedSteps.includes(i);
          const isActive = currentStep === i;
          const isLocked = i > 0 && !completedSteps.includes(i - 1) && !isCompleted;

          return (
            <button
              key={i}
              onClick={() => !isLocked && setStep(i)}
              disabled={isLocked}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.5rem 0.6rem",
                background: isActive ? "var(--bg-tertiary)" : "transparent",
                border: isActive ? "1px solid var(--border-hover)" : "1px solid transparent",
                borderRadius: "var(--radius)",
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.4 : 1,
                transition: "all 0.15s ease",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
                background: isCompleted
                  ? "var(--accent-green)"
                  : isActive
                  ? "var(--accent-blue)"
                  : "var(--bg-tertiary)",
                color: isCompleted || isActive ? "#fff" : "var(--text-muted)",
                border: isCompleted || isActive ? "none" : "1px solid var(--border)",
              }}>
                {isCompleted ? "\u2713" : i + 1}
              </span>
              <div>
                <div style={{
                  fontSize: "0.8rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}>
                  {step.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={reset}
        style={{
          marginTop: "1rem",
          width: "100%",
          padding: "0.4rem",
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          cursor: "pointer",
        }}
      >
        {t("rail.resetDemo")}
      </button>
    </div>
  );
}
