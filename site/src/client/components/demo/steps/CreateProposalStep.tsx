import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog, zeroAddress } from "viem";
import { useDemo } from "../../../contexts/DemoContext";
import { useI18n } from "../../../contexts/I18nContext";
import { CONTRACTS } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";

export default function CreateProposalStep() {
  const { completeStep, update } = useDemo();
  const { t } = useI18n();
  const [description, setDescription] = useState("Upgrade treasury allocation for Q3");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && receipt) {
      if (receipt.status !== "success") return;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: CONTRACTS.governor.abi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "ProposalCreated") {
            const proposalId = (decoded.args as any).proposalId as bigint;
            update({ proposalId });
            completeStep(2);
            pushLog("ProposalCreated", {
              proposalId: proposalId.toString(),
              description,
            }, hash);
            return;
          }
        } catch {
          // skip non-matching logs
        }
      }
      console.warn("[CreateProposalStep] TX succeeded but ProposalCreated event not found in logs");
    }
  }, [isSuccess, receipt]);

  const submit = () => {
    writeContract({
      ...CONTRACTS.governor,
      functionName: "propose",
      args: [
        [zeroAddress],   // targets
        [0n],            // values
        ["0x" as `0x${string}`],          // calldatas
        description,
      ],
      // Reown RPC gas cap is ~16M; viem default simulation gas is 21M.
      // Explicit gas avoids "gas limit too high" RPC rejection.
      gas: 500_000n,
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        {t("proposal.title")}
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        {t("proposal.desc")}
      </p>

      <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
        {t("proposal.description")}
      </label>
      <textarea
        className="input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <div style={{ marginTop: "1rem" }}>
        <button className="btn btn-primary" onClick={submit} disabled={isPending || isConfirming}>
          {isPending ? t("common.signing") : isConfirming ? t("common.confirming") : t("proposal.button")}
        </button>
      </div>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} receiptStatus={receipt?.status} />
    </div>
  );
}
