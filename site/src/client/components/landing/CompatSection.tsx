import { useI18n } from "../../contexts/I18nContext";

const INTERFACES = [
  { name: "IAIAgentRegistry", id: "0x________" },
  { name: "IAIDelegation", id: "0x________" },
  { name: "IRationaleCommitment", id: "0x________" },
  { name: "ICredibilityRegistry", id: "0x________" },
];

export default function CompatSection() {
  const { t } = useI18n();

  return (
    <section className="landing-section-alt">
      <div className="landing-container" style={{ maxWidth: 700 }}>
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {t("landing.compat.title")}
        </h2>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr style={{ background: "var(--bg-tertiary)" }}>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {t("landing.compat.interface")}
                </th>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {t("landing.compat.id")}
                </th>
              </tr>
            </thead>
            <tbody>
              {INTERFACES.map(({ name, id }) => (
                <tr key={name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.6rem 1rem", color: "var(--accent-blue)" }}>{name}</td>
                  <td style={{ padding: "0.6rem 1rem", color: "var(--text-secondary)" }}>{id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
