interface TxStatusProps {
  hash?: `0x${string}`;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
}

export default function TxStatus({ hash, isPending, isConfirming, isSuccess, error }: TxStatusProps) {
  if (!isPending && !isConfirming && !isSuccess && !error) return null;

  const status = isPending
    ? { label: "Awaiting signature...", color: "var(--accent-yellow)" }
    : isConfirming
    ? { label: "Confirming...", color: "var(--accent-blue)" }
    : isSuccess
    ? { label: "Confirmed", color: "var(--accent-green)" }
    : { label: "Failed", color: "var(--accent-red)" };

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
          {error.message.slice(0, 200)}
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
