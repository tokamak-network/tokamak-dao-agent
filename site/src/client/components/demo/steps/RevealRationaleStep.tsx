import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useDemo } from "../../../contexts/DemoContext";
import { CONTRACTS } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";

export default function RevealRationaleStep() {
  const { agentId, proposalId, rationaleURI, salt, commitHash, completeStep, update } = useDemo();

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      update({ isRevealed: true });
      completeStep(5);
      pushLog("RationaleRevealed", {
        agentId: agentId!,
        proposalId: proposalId!.toString(),
        rationaleURI,
      }, hash);
    }
  }, [isSuccess]);

  const submit = () => {
    if (!agentId || proposalId === null || !salt) return;
    writeContract({
      ...CONTRACTS.rationale,
      functionName: "revealRationale",
      args: [agentId, proposalId, rationaleURI, salt],
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        6. Reveal Rationale
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Reveal the rationale URI and salt. The contract verifies that
        <code>keccak256(rationaleURI || salt)</code> matches the committed hash.
      </p>

      {/* Hash verification visualization */}
      <div style={{
        padding: "0.75rem",
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        marginBottom: "1rem",
        fontFamily: "var(--font-mono)",
        fontSize: "0.75rem",
      }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ color: "var(--text-muted)" }}>Committed hash: </span>
          <span style={{ color: "var(--accent-purple)", wordBreak: "break-all" }}>
            {commitHash || "—"}
          </span>
        </div>
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ color: "var(--text-muted)" }}>Rationale URI: </span>
          <span style={{ color: "var(--text-secondary)" }}>{rationaleURI || "—"}</span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Salt: </span>
          <span style={{ color: "var(--text-secondary)", wordBreak: "break-all" }}>{salt || "—"}</span>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={!agentId || proposalId === null || !salt || isPending || isConfirming}
      >
        {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Reveal Rationale"}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  );
}
