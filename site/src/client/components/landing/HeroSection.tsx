import { navigate } from "../../App";
import { useI18n } from "../../contexts/I18nContext";

export default function HeroSection() {
  const { t } = useI18n();

  return (
    <section
      className="landing-section"
      style={{
        textAlign: "center",
        background: "linear-gradient(180deg, rgba(74,158,255,0.08) 0%, transparent 100%)",
      }}
    >
      <div className="landing-container">
        <span className="badge badge-draft" style={{ marginBottom: "1.5rem" }}>
          {t("landing.hero.draft")}
        </span>

        <h1
          className="landing-glow"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "1rem",
            color: "var(--text-primary)",
          }}
        >
          {t("landing.hero.title")}
        </h1>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.85rem, 2vw, 1.05rem)",
            color: "var(--text-secondary)",
            maxWidth: 700,
            margin: "0 auto 2.5rem",
            lineHeight: 1.6,
          }}
        >
          {t("landing.hero.subtitle")}
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => navigate("/spec")}>
            {t("landing.hero.readSpec")}
          </button>
          <button className="btn" onClick={() => navigate("/demo")}>
            {t("landing.hero.tryDemo")}
          </button>
        </div>
      </div>
    </section>
  );
}
