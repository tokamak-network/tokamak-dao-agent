import { navigate } from "../../App";
import { useI18n } from "../../contexts/I18nContext";

export default function CtaSection() {
  const { t } = useI18n();

  return (
    <section className="landing-section">
      <div className="landing-container" style={{ textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          {t("landing.cta.title")}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
            marginBottom: "2rem",
          }}
        >
          {t("landing.cta.subtitle")}
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <button className="btn btn-primary" onClick={() => navigate("/spec")}>
            {t("landing.cta.spec")}
          </button>
          <button className="btn" onClick={() => navigate("/demo")}>
            {t("landing.cta.demo")}
          </button>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center" }}>
          <a
            href="https://github.com/tokamak-network/tokamak-dao-agent"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
          >
            {t("landing.cta.github")}
          </a>
          <a
            href="https://ethereum-magicians.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
          >
            {t("landing.cta.discuss")}
          </a>
        </div>
      </div>
    </section>
  );
}
