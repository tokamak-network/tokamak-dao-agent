import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useDemo } from "../../../contexts/DemoContext";
import { CONTRACTS, CONFIG } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";
import BlockProgress from "../BlockProgress";

export default function ResolveStep() {
  const { agentId, proposalId, completeStep, update } = useDemo();

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      update({ isResolved: true });
      completeStep(6);
      pushLog("PredictionResolved", {
        agentId: agentId!,
        proposalId: proposalId!.toString(),
        outcome: "Succeeded (1)",
      }, hash);
    }
  }, [isSuccess]);

  const submit = () => {
    if (!agentId || proposalId === null) return;
    writeContract({
      ...CONTRACTS.resolver,
      functionName: "resolve",
      args: [CONTRACTS.credibility.address, agentId, proposalId, proposalId],
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        7. Resolve Prediction
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        After the voting period ends ({CONFIG.votingPeriod} blocks), the <code>GovernorResolver</code> reads
        the proposal outcome from the Governor and resolves the credibility prediction.
        This is permissionless — anyone can call it.
      </p>

      <BlockProgress
        label="Voting Period"
        targetBlocks={CONFIG.votingPeriod}
        description="Wait for voting period to end before resolving"
      />

      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={!agentId || proposalId === null || isPending || isConfirming}
      >
        {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Resolve"}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  );
}
