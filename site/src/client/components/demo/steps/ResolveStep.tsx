import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useDemo } from "../../../contexts/DemoContext";
import { useI18n } from "../../../contexts/I18nContext";
import { CONTRACTS, CONFIG } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";
import BlockProgress from "../BlockProgress";

export default function ResolveStep() {
  const { agentId, proposalId, completeStep, update } = useDemo();
  const { t } = useI18n();

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
        {t("resolve.title")}
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {t("resolve.desc")} ({CONFIG.votingPeriod} blocks)
      </p>

      <BlockProgress
        label={t("resolve.votingPeriod")}
        targetBlocks={CONFIG.votingPeriod}
        description={t("resolve.waitForVoting")}
      />

      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={!agentId || proposalId === null || isPending || isConfirming}
      >
        {isPending ? t("common.signing") : isConfirming ? t("common.confirming") : t("resolve.button")}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  );
}
