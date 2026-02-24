import { useReadContract } from "wagmi";
import { useDemo } from "../../../contexts/DemoContext";
import { CONTRACTS } from "../../../config/contracts";

export default function CredibilityStep() {
  const { agentId, completeStep, update, completedSteps } = useDemo();

  const { data, isLoading, refetch } = useReadContract({
    ...CONTRACTS.credibility,
    functionName: "getCredibility",
    args: agentId ? [agentId] : undefined,
    query: { enabled: !!agentId },
  });

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.data) {
      const [totalScore, totalPredictions] = result.data as [bigint, bigint];
      update({
        credibility: { totalScore, totalPredictions },
      });
      if (!completedSteps.includes(7)) {
        completeStep(7);
      }
    }
  };

  const totalScore = data ? (data as [bigint, bigint])[0] : null;
  const totalPredictions = data ? (data as [bigint, bigint])[1] : null;

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        8. View Credibility
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Read the agent's accumulated credibility score from the <code>CredibilityRegistry</code>.
        This is a read-only call — no transaction needed.
      </p>

      {agentId && (
        <div style={{
          padding: "1.5rem",
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          marginBottom: "1rem",
          textAlign: "center",
        }}>
          {isLoading ? (
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              Loading...
            </div>
          ) : totalScore !== null ? (
            <>
              <div style={{
                fontSize: "3rem",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: totalScore > 0n
                  ? "var(--accent-green)"
                  : totalScore < 0n
                  ? "var(--accent-red)"
                  : "var(--text-primary)",
                marginBottom: "0.5rem",
              }}>
                {totalScore > 0n ? "+" : ""}{totalScore.toString()}
              </div>
              <div style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}>
                Total Score across {totalPredictions!.toString()} prediction{totalPredictions !== 1n ? "s" : ""}
              </div>
              <div style={{
                marginTop: "1rem",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}>
                Delta applied: +3 (high confidence correct prediction)
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              No data yet
            </div>
          )}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleRefresh} disabled={!agentId || isLoading}>
        {isLoading ? "Loading..." : "Fetch Credibility"}
      </button>

      {completedSteps.includes(7) && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1rem",
          background: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "var(--radius)",
          fontSize: "0.85rem",
          color: "var(--accent-green)",
          fontFamily: "var(--font-mono)",
          textAlign: "center",
        }}>
          Demo complete! Full AI agent governance lifecycle executed on Sepolia.
        </div>
      )}
    </div>
  );
}
