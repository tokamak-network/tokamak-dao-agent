import { STEPS } from "./data";

interface Props {
  activeStep: number;
  isComplete: boolean;
  onGoToStep: (n: number) => void;
  onNext: () => void;
  onReset: () => void;
}

export default function StepControls({ activeStep, isComplete, onGoToStep, onNext, onReset }: Props) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1.5rem",
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border)",
      flexWrap: "wrap",
      fontFamily: "var(--font-mono)",
    }}>
      {STEPS.map((s, i) => {
        const isActive = i === activeStep;
        const isDone = i < activeStep;
        return (
          <button
            key={i}
            onClick={() => onGoToStep(i)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.3rem 0.65rem",
              borderRadius: 6,
              fontSize: "0.65rem",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              border: `1px solid ${isActive ? "var(--accent-blue)" : isDone ? "var(--accent-green)" : "var(--border)"}`,
              background: isActive ? "var(--accent-blue)" : "var(--bg-tertiary)",
              color: isActive ? "#fff" : isDone ? "var(--accent-green)" : "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{
              width: 18,
              height: 18,
              lineHeight: "18px",
              textAlign: "center",
              borderRadius: "50%",
              fontSize: "0.55rem",
              fontWeight: 700,
              background: isActive ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
            }}>
              {isDone ? "\u2713" : i}
            </span>
            <span>{s.subtitle}</span>
          </button>
        );
      })}

      <button
        onClick={onNext}
        disabled={isComplete}
        style={{
          padding: "0.3rem 0.75rem",
          borderRadius: 6,
          fontSize: "0.65rem",
          fontFamily: "var(--font-mono)",
          cursor: isComplete ? "default" : "pointer",
          border: "1px solid var(--accent-blue)",
          background: "var(--accent-blue)",
          color: "#fff",
          marginLeft: "0.5rem",
          opacity: isComplete ? 0.5 : 1,
          transition: "all 0.15s ease",
        }}
      >
        {isComplete ? "\u2713 Done" : "\u25B6 Next"}
      </button>

      <button
        onClick={onReset}
        style={{
          padding: "0.3rem 0.75rem",
          borderRadius: 6,
          fontSize: "0.65rem",
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          border: "1px solid var(--border)",
          background: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
          marginLeft: "0.5rem",
          transition: "all 0.15s ease",
        }}
      >
        \u21ba Reset
      </button>
    </div>
  );
}
