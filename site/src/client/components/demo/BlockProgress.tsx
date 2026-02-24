import { useBlockNumber } from "wagmi";

interface Props {
  label: string;
  targetBlocks: number;
  description: string;
}

export default function BlockProgress({ label, targetBlocks, description }: Props) {
  const { data: blockNumber } = useBlockNumber({ watch: true });

  if (!blockNumber) return null;

  return (
    <div style={{
      padding: "0.75rem",
      background: "var(--bg-primary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      marginBottom: "1rem",
      fontFamily: "var(--font-mono)",
      fontSize: "0.78rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <span style={{ color: "var(--text-secondary)" }}>{label}: {targetBlocks} blocks</span>
        <span style={{ color: "var(--text-muted)" }}>
          Block #{blockNumber.toString()}
        </span>
      </div>
      <div style={{
        color: "var(--text-muted)",
        fontSize: "0.72rem",
      }}>
        {description}
      </div>
    </div>
  );
}
