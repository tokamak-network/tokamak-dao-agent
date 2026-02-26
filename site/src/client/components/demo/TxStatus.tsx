import { useI18n } from "../../contexts/I18nContext";

interface TxStatusProps {
  hash?: `0x${string}`;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  receiptStatus?: "success" | "reverted";
}

/** Extract a human-readable reason from a viem/wagmi error */
function extractErrorReason(error: Error): string {
  const msg = error.message;

  // Check for known custom error names
  const customErrorMatch = msg.match(/reverted with custom error '([^']+)'/);
  if (customErrorMatch) return customErrorMatch[1];

  // Check for revert reason strings
  const reasonMatch = msg.match(/reverted with reason string '([^']+)'/);
  if (reasonMatch) return reasonMatch[1];

  // Check for known error signatures from our contracts
  const knownErrors: Record<string, string> = {
    NotAgentOperator: "Not agent operator — wrong wallet connected",
    AgentNotActive: "Agent is not active",
    AgentNotFound: "Agent not found — try resetting the demo",
    AlreadyCommitted: "Rationale already committed for this proposal",
    AlreadyRevealed: "Rationale already revealed",
    HashMismatch: "Reveal hash does not match commitment",
    NotResolver: "Not authorized resolver",
    PredictionExists: "Prediction already recorded",
    PredictionNotFound: "Prediction not found",
  };

  for (const [name, description] of Object.entries(knownErrors)) {
    if (msg.includes(name)) return description;
  }

  // Middleware/RPC errors
  if (msg.includes("RetryOnEmptyMiddleware"))
    return "Transaction reverted (simulation failed). Try resetting the demo.";
  if (msg.includes("User rejected"))
    return "Transaction rejected by user";

  // Fallback: truncate
  return msg.slice(0, 200);
}

export default function TxStatus({ hash, isPending, isConfirming, isSuccess, error, receiptStatus }: TxStatusProps) {
  const { t } = useI18n();

  if (!isPending && !isConfirming && !isSuccess && !error) return null;

  const isReverted = isSuccess && receiptStatus === "reverted";

  const status = isPending
    ? { label: t("tx.awaitingSignature"), color: "var(--accent-yellow)" }
    : isConfirming
    ? { label: t("tx.confirming"), color: "var(--accent-blue)" }
    : isReverted
    ? { label: t("tx.reverted"), color: "var(--accent-red)" }
    : isSuccess
    ? { label: t("tx.confirmed"), color: "var(--accent-green)" }
    : { label: t("tx.failed"), color: "var(--accent-red)" };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      padding: "0.75rem 1rem",
      background: "var(--bg-primary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      fontSize: "0.8rem",
      fontFamily: "var(--font-mono)",
      marginTop: "1rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: status.color,
          display: "inline-block",
          animation: (isPending || isConfirming) ? "pulse 1.5s infinite" : "none",
        }} />
        <span style={{ color: status.color }}>{status.label}</span>
      </div>
      {hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-secondary)", fontSize: "0.75rem", wordBreak: "break-all" }}
        >
          {hash}
        </a>
      )}
      {error && (
        <div style={{ color: "var(--accent-red)", fontSize: "0.75rem", wordBreak: "break-word" }}>
          {extractErrorReason(error)}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
