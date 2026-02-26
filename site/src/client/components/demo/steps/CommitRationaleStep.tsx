import { useState, useMemo, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, encodePacked } from "viem";
import { useDemo } from "../../../contexts/DemoContext";
import { useI18n } from "../../../contexts/I18nContext";
import { CONTRACTS } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";

export default function CommitRationaleStep() {
  const { agentId, proposalId, completeStep, update } = useDemo();
  const { t } = useI18n();
  const [rationaleURI, setRationaleURI] = useState("ipfs://QmDemoRationale");
  const [confidence, setConfidence] = useState("85");
  const [step, setStep] = useState<"commit" | "predict" | "done">("commit");

  // Generate salt deterministically from agent + proposal (for demo simplicity)
  const salt = useMemo(() => {
    if (!agentId || proposalId === null) return null;
    return keccak256(encodePacked(["string"], [`demo-salt-${agentId}-${proposalId}`]));
  }, [agentId, proposalId]);

  const commitHash = useMemo(() => {
    if (!salt) return null;
    return keccak256(encodePacked(["string", "bytes32"], [rationaleURI, salt]));
  }, [rationaleURI, salt]);

  // Commit tx
  const {
    writeContract: writeCommit,
    data: commitTxHash,
    isPending: commitPending,
    error: commitError,
  } = useWriteContract();
  const { isLoading: commitConfirming, isSuccess: commitSuccess, data: commitReceipt } = useWaitForTransactionReceipt({
    hash: commitTxHash,
  });

  useEffect(() => {
    if (commitSuccess && commitReceipt?.status === "success") {
      pushLog("RationaleCommitted", {
        agentId: agentId!,
        proposalId: proposalId!.toString(),
        commitHash: commitHash!,
      }, commitTxHash);
      setStep("predict");
    }
  }, [commitSuccess, commitReceipt]);

  // Predict tx
  const {
    writeContract: writePredict,
    data: predictTxHash,
    isPending: predictPending,
    error: predictError,
  } = useWriteContract();
  const { isLoading: predictConfirming, isSuccess: predictSuccess, data: predictReceipt } = useWaitForTransactionReceipt({
    hash: predictTxHash,
  });

  useEffect(() => {
    if (predictSuccess && predictReceipt?.status === "success") {
      update({ rationaleURI, salt: salt!, commitHash: commitHash! });
      completeStep(3);
      pushLog("PredictionRecorded", {
        agentId: agentId!,
        proposalId: proposalId!.toString(),
        verdict: "1 (For)",
        confidence: confidence,
      }, predictTxHash);
      setStep("done");
    }
  }, [predictSuccess, predictReceipt]);

  const submitCommit = () => {
    if (!agentId || proposalId === null || !commitHash) return;
    writeCommit({
      ...CONTRACTS.rationale,
      functionName: "commitRationale",
      args: [agentId, proposalId, commitHash],
    });
  };

  const submitPredict = () => {
    if (!agentId || proposalId === null) return;
    writePredict({
      ...CONTRACTS.credibility,
      functionName: "recordPrediction",
      args: [agentId, proposalId, 1, Number(confidence)], // 1 = For
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        {t("commit.title")}
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {t("commit.desc")}
      </p>

      <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
        {t("commit.rationaleURI")}
      </label>
      <input
        className="input"
        value={rationaleURI}
        onChange={(e) => setRationaleURI(e.target.value)}
        disabled={step !== "commit"}
        style={{ marginBottom: "0.75rem" }}
      />

      <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
        {t("commit.confidence")}
      </label>
      <input
        className="input"
        type="number"
        min="0"
        max="100"
        value={confidence}
        onChange={(e) => setConfidence(e.target.value)}
        disabled={step === "done"}
        style={{ marginBottom: "0.75rem" }}
      />

      {/* Hash visualization */}
      {commitHash && (
        <div style={{
          padding: "0.75rem",
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          marginBottom: "1rem",
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
        }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            {t("commit.hashLabel")}
          </div>
          <div style={{ color: "var(--accent-purple)", wordBreak: "break-all" }}>
            {commitHash}
          </div>
          <div style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>{t("commit.salt")}</div>
          <div style={{ color: "var(--text-secondary)", wordBreak: "break-all" }}>{salt}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        {step === "commit" && (
          <button
            className="btn btn-primary"
            onClick={submitCommit}
            disabled={!agentId || proposalId === null || commitPending || commitConfirming}
          >
            {commitPending ? t("common.signing") : commitConfirming ? t("common.confirming") : t("commit.commitButton")}
          </button>
        )}
        {step === "predict" && (
          <button
            className="btn btn-primary"
            onClick={submitPredict}
            disabled={predictPending || predictConfirming}
          >
            {predictPending ? t("common.signing") : predictConfirming ? t("common.confirming") : t("commit.predictButton")}
          </button>
        )}
        {step === "done" && (
          <span className="badge badge-green">{t("commit.bothConfirmed")}</span>
        )}
      </div>

      {step === "commit" && (
        <TxStatus hash={commitTxHash} isPending={commitPending} isConfirming={commitConfirming} isSuccess={commitSuccess} error={commitError} receiptStatus={commitReceipt?.status} />
      )}
      {step === "predict" && (
        <TxStatus hash={predictTxHash} isPending={predictPending} isConfirming={predictConfirming} isSuccess={predictSuccess} error={predictError} receiptStatus={predictReceipt?.status} />
      )}
    </div>
  );
}
