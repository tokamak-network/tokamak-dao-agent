import { DemoProvider } from "../contexts/DemoContext";
import { useI18n } from "../contexts/I18nContext";
import StepRail from "../components/demo/StepRail";
import StepContainer from "../components/demo/StepContainer";
import EventLog from "../components/demo/EventLog";

export default function DemoPage() {
  const { t } = useI18n();

  return (
    <DemoProvider>
      <div style={{
        maxWidth: "var(--max-width)",
        margin: "0 auto",
        padding: "2rem 1.5rem",
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {t("demo.title")}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {t("demo.subtitle")}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: "1.5rem",
          minHeight: "600px",
        }}>
          <StepRail />
          <StepContainer />
        </div>

        <EventLog />
      </div>
    </DemoProvider>
  );
}
