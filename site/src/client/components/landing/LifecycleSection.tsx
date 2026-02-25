import { useI18n } from "../../contexts/I18nContext";

const STEPS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export default function LifecycleSection() {
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
            marginBottom: "0.5rem",
          }}
        >
          {t("landing.lifecycle.title")}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {t("landing.lifecycle.subtitle")}
        </p>

        <div className="lifecycle-flow">
          {STEPS.map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: 120,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--accent-blue)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textAlign: "center",
                    color: "var(--text-primary)",
                  }}
                >
                  {t(`rail.step${i}`)}
                </span>
              </div>

              {i < 7 && (
                <div
                  style={{
                    width: 32,
                    height: 2,
                    background: "var(--border)",
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
