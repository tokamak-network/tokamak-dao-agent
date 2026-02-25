import { useState, useMemo, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { useDemo } from "../../../contexts/DemoContext";
import { useI18n } from "../../../contexts/I18nContext";
import { CONTRACTS } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";
import PreferencesForm, { type RiskTolerance } from "./PreferencesForm";

export default function DelegateStep() {
  const { agentId, completeStep, update } = useDemo();
  const { t } = useI18n();
  const [days, setDays] = useState("30");

  // Structured preferences state
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>("moderate");
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);
  const [escalateCategories, setEscalateCategories] = useState<string[]>([]);
  const [principlesText, setPrinciplesText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Build preferences JSON and data: URI
  const { prefsJson, prefsURI } = useMemo(() => {
    const prefs: Record<string, unknown> = {
      riskTolerance,
      escalation: {
        confidenceThreshold,
        alwaysEscalate: escalateCategories,
      },
      principles: principlesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    };
    const json = JSON.stringify(prefs, null, 2);
    const uri = `data:application/json;base64,${btoa(json)}`;
    return { prefsJson: json, prefsURI: uri };
  }, [riskTolerance, confidenceThreshold, escalateCategories, principlesText]);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && receipt) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: CONTRACTS.delegation.abi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "AgentDelegationCreated") {
            const delegationId = (decoded.args as any).delegationId as `0x${string}`;
            update({ delegationId });
            completeStep(1);
            pushLog("AgentDelegationCreated", {
              delegationId,
              delegator: (decoded.args as any).delegator,
              agentId: (decoded.args as any).agentId,
            }, hash);
            return;
          }
        } catch {}
      }
    }
  }, [isSuccess, receipt]);

  const submit = () => {
    if (!agentId) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + Number(days) * 86400);
    writeContract({
      ...CONTRACTS.delegation,
      functionName: "delegateToAgent",
      args: [agentId, expiry, prefsURI],
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        {t("delegate.title")}
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {t("delegate.desc")}
      </p>

      {agentId && (
        <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
          <span style={{ color: "var(--text-muted)" }}>{t("delegate.agentId")}: </span>
          <span style={{ color: "var(--accent-blue)", wordBreak: "break-all" }}>{agentId}</span>
        </div>
      )}

      <PreferencesForm
        riskTolerance={riskTolerance}
        setRiskTolerance={setRiskTolerance}
        confidenceThreshold={confidenceThreshold}
        setConfidenceThreshold={setConfidenceThreshold}
        escalateCategories={escalateCategories}
        setEscalateCategories={setEscalateCategories}
        principlesText={principlesText}
        setPrinciplesText={setPrinciplesText}
      />

      {/* JSON Preview (collapsible) */}
      <div style={{ marginBottom: "0.75rem" }}>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            padding: 0,
            marginBottom: "0.25rem",
          }}
        >
          {showPreview ? "\u25BC" : "\u25B6"} {t("delegate.jsonPreview")}
        </button>
        {showPreview && (
          <div style={{
            padding: "0.75rem",
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
          }}>
            <div style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }}>
              {t("delegate.jsonPreviewNote")}
            </div>
            <pre style={{
              color: "var(--accent-purple)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
              padding: 0,
              background: "none",
              border: "none",
              fontSize: "0.75rem",
            }}>
              {prefsJson}
            </pre>
          </div>
        )}
      </div>

      {/* Expiry Days */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
          {t("delegate.expiryDays")}
        </label>
        <input
          className="input"
          type="number"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </div>

      <button className="btn btn-primary" onClick={submit} disabled={!agentId || isPending || isConfirming}>
        {isPending ? t("common.signing") : isConfirming ? t("common.confirming") : t("delegate.button")}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  );
}
