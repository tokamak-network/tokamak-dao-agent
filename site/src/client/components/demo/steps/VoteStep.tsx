import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useBlockNumber } from "wagmi";
import { useDemo } from "../../../contexts/DemoContext";
import { useI18n } from "../../../contexts/I18nContext";
import { CONTRACTS, CONFIG } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";
import BlockProgress from "../BlockProgress";

export default function VoteStep() {
  const { proposalId, completeStep, update } = useDemo();
  const { t } = useI18n();
  const [support, setSupport] = useState(1);

  const voteOptions = [
    { value: 0, label: t("vote.against") },
    { value: 1, label: t("vote.for") },
    { value: 2, label: t("vote.abstain") },
  ];

  const { data: blockNumber } = useBlockNumber({ watch: true });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && receipt?.status === "success") {
      update({ hasVoted: true });
      completeStep(4);
      pushLog("VoteCast", {
        proposalId: proposalId!.toString(),
        support: voteOptions.find((o) => o.value === support)?.label || String(support),
      }, hash);
    }
  }, [isSuccess, receipt]);

  const submit = () => {
    if (proposalId === null) return;
    writeContract({
      ...CONTRACTS.governor,
      functionName: "castVote",
      args: [proposalId, support],
      gas: 300_000n,
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        {t("vote.title")}
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {t("vote.desc")} ({CONFIG.votingDelay} block).
        {blockNumber && (
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            {" "}{t("vote.currentBlock")} {blockNumber.toString()}
          </span>
        )}
      </p>

      <BlockProgress
        label={t("vote.votingDelay")}
        targetBlocks={CONFIG.votingDelay}
        description={t("vote.waitForVoting")}
      />

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {voteOptions.map((opt) => (
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
        {isPending ? t("common.signing") : isConfirming ? t("common.confirming") : t("vote.button")}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} receiptStatus={receipt?.status} />
    </div>
  );
}
