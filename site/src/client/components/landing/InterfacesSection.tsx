import { useI18n } from "../../contexts/I18nContext";

const INTERFACES = [
  {
    key: "registry",
    color: "var(--accent-blue)",
    badge: "Core",
    functions: ["registerAgent(uri)", "getAgent(id)", "isRegistered(id)"],
  },
  {
    key: "delegation",
    color: "var(--accent-green)",
    badge: "Core",
    functions: ["delegate(id, expiry, uri)", "revokeDelegation(id)", "getDelegation(addr)"],
  },
  {
    key: "rationale",
    color: "var(--accent-yellow)",
    badge: "Extension",
    functions: ["commitRationale(id, hash)", "revealRationale(id, uri, salt)"],
  },
  {
    key: "credibility",
    color: "var(--accent-purple)",
    badge: "Extension",
    functions: ["getCredibility(id)", "recordPrediction(id, ...)", "resolvePrediction(...)"],
  },
] as const;

export default function InterfacesSection() {
  const { t } = useI18n();

  return (
    <section className="landing-section">
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
          {t("landing.interfaces.title")}
        </h2>

        <div className="landing-grid">
          {INTERFACES.map(({ key, color, badge, functions }) => (
            <div
              className="card"
              key={key}
              style={{ borderTop: `3px solid ${color}` }}
            >
              <div style={{ marginBottom: "0.75rem" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color,
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  {t(`landing.interfaces.${key}.name`)}
                </span>
                <span
                  className="badge"
                  style={{
                    background: `color-mix(in srgb, ${color} 15%, transparent)`,
                    color,
                    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                  }}
                >
                  {badge}
                </span>
              </div>

              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                {t(`landing.interfaces.${key}.desc`)}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {functions.map((fn) => (
                  <code
                    key={fn}
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      background: "var(--bg-tertiary)",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      display: "inline-block",
                      width: "fit-content",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fn}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
