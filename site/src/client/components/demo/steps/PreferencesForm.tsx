import { useState, type KeyboardEvent } from "react";
import { useI18n } from "../../../contexts/I18nContext";

export type RiskTolerance = "conservative" | "moderate" | "aggressive";

interface PreferencesFormProps {
  riskTolerance: RiskTolerance;
  setRiskTolerance: (v: RiskTolerance) => void;
  confidenceThreshold: number;
  setConfidenceThreshold: (v: number) => void;
  escalateCategories: string[];
  setEscalateCategories: (v: string[]) => void;
  principlesText: string;
  setPrinciplesText: (v: string) => void;
}

const riskOptions: { value: RiskTolerance; key: string }[] = [
  { value: "conservative", key: "delegate.riskConservative" },
  { value: "moderate", key: "delegate.riskModerate" },
  { value: "aggressive", key: "delegate.riskAggressive" },
];

export default function PreferencesForm({
  riskTolerance,
  setRiskTolerance,
  confidenceThreshold,
  setConfidenceThreshold,
  escalateCategories,
  setEscalateCategories,
  principlesText,
  setPrinciplesText,
}: PreferencesFormProps) {
  const { t } = useI18n();
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !escalateCategories.includes(tag)) {
      setEscalateCategories([...escalateCategories, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setEscalateCategories(escalateCategories.filter((c) => c !== tag));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const labelStyle = {
    display: "block" as const,
    marginBottom: "0.25rem",
    fontSize: "0.8rem",
    fontFamily: "var(--font-mono)",
    color: "var(--text-secondary)",
  };

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
        {t("delegate.prefsSection")}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.75rem", fontStyle: "italic" }}>
        {t("delegate.prefsAdvisory")}
      </p>

      {/* Risk Tolerance */}
      <label style={labelStyle}>{t("delegate.riskTolerance")}</label>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {riskOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="btn"
            onClick={() => setRiskTolerance(opt.value)}
            style={{
              background: riskTolerance === opt.value ? "var(--bg-tertiary)" : "var(--bg-primary)",
              borderColor: riskTolerance === opt.value ? "var(--accent-blue)" : "var(--border)",
              color: riskTolerance === opt.value ? "var(--accent-blue)" : "var(--text-secondary)",
              fontWeight: riskTolerance === opt.value ? 600 : 400,
              flex: 1,
            }}
          >
            {t(opt.key)}
          </button>
        ))}
      </div>

      {/* Escalation Threshold */}
      <label style={labelStyle}>
        {t("delegate.escalationThreshold")}
        <span style={{ color: "var(--accent-blue)", marginLeft: "0.5rem" }}>{confidenceThreshold}%</span>
      </label>
      <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginBottom: "0.25rem" }}>
        {t("delegate.escalationThresholdDesc")}
      </p>
      <input
        type="range"
        min={0}
        max={100}
        value={confidenceThreshold}
        onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
        style={{ width: "100%", marginBottom: "0.75rem" }}
      />

      {/* Always Escalate For */}
      <label style={labelStyle}>{t("delegate.escalateFor")}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.375rem" }}>
        {escalateCategories.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.2rem 0.5rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-primary)",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "0 0.125rem",
                fontSize: "0.85rem",
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        className="input"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={handleTagKeyDown}
        placeholder={t("delegate.escalateForPlaceholder")}
        style={{ marginBottom: "0.75rem" }}
      />

      {/* Decision Principles */}
      <label style={labelStyle}>{t("delegate.principles")}</label>
      <textarea
        className="input"
        value={principlesText}
        onChange={(e) => setPrinciplesText(e.target.value)}
        placeholder={t("delegate.principlesPlaceholder")}
        rows={3}
      />
    </div>
  );
}
