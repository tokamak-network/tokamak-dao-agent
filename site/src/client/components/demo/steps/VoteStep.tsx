import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from "wagmi";
import { useDemo } from "../../../contexts/DemoContext";
import { CONTRACTS, CONFIG } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";
import BlockProgress from "../BlockProgress";

const VOTE_OPTIONS = [
  { value: 0, label: "Against" },
  { value: 1, label: "For" },
  { value: 2, label: "Abstain" },
] as const;

export default function VoteStep() {
  const { proposalId, completeStep, update } = useDemo();
  const [support, setSupport] = useState(1);

  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      update({ hasVoted: true });
      completeStep(4);
      pushLog("VoteCast", {
        proposalId: proposalId!.toString(),
        support: VOTE_OPTIONS.find((o) => o.value === support)?.label || String(support),
      }, hash);
    }
  }, [isSuccess]);

  const submit = () => {
    if (proposalId === null) return;
    writeContract({
      ...CONTRACTS.governor,
      functionName: "castVote",
      args: [proposalId, support],
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        5. Vote on Proposal
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Cast a vote through the Governor. Voting is active after the voting delay
        ({CONFIG.votingDelay} block).
        {blockNumber && (
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            {" "}Current block: {blockNumber.toString()}
          </span>
        )}
      </p>

      <BlockProgress
        label="Voting Delay"
        targetBlocks={CONFIG.votingDelay}
        description="Wait for voting to become active"
      />

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {VOTE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className="btn"
            onClick={() => setSupport(opt.value)}
            style={{
              background: support === opt.value ? "var(--bg-tertiary)" : "var(--bg-primary)",
              borderColor: support === opt.value ? "var(--accent-blue)" : "var(--border)",
              color: support === opt.value ? "var(--accent-blue)" : "var(--text-secondary)",
              fontWeight: support === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={proposalId === null || isPending || isConfirming}
      >
        {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Cast Vote"}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  );
}
