import { useI18n } from "../../contexts/I18nContext";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer style={{
      padding: "1.5rem",
      borderTop: "1px solid var(--border)",
      textAlign: "center",
      fontFamily: "var(--font-mono)",
      fontSize: "0.75rem",
      color: "var(--text-muted)",
    }}>
      {t("footer.text")}
    </footer>
  );
}
