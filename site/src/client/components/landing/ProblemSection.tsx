import { useI18n } from "../../contexts/I18nContext";

const PROBLEMS = [
  { key: "identity", icon: "?" },
  { key: "delegation", icon: "\u221E" },
  { key: "rationale", icon: "\u270E" },
  { key: "reputation", icon: "\u2300" },
] as const;

export default function ProblemSection() {
  const { t } = useI18n();

  return (
    <section className="landing-section-alt">
      <div className="landing-container">
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {t("landing.problem.title")}
        </h2>

        <div className="landing-grid">
          {PROBLEMS.map(({ key, icon }) => (
            <div className="card" key={key}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius)",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "1.2rem",
                  color: "var(--accent-red)",
                  marginBottom: "0.75rem",
                }}
              >
                {icon}
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                {t(`landing.problem.${key}.title`)}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {t(`landing.problem.${key}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
