import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { useDemo } from "../../../contexts/DemoContext";
import { CONTRACTS } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";

export default function DelegateStep() {
  const { agentId, completeStep, update } = useDemo();
  const [days, setDays] = useState("30");
  const [prefsURI, setPrefsURI] = useState("ipfs://QmPreferences");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && receipt) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: CONTRACTS.delegation.abi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "AIDelegationCreated") {
            const delegationId = (decoded.args as any).delegationId as `0x${string}`;
            update({ delegationId });
            completeStep(1);
            pushLog("AIDelegationCreated", {
              delegationId,
              delegator: (decoded.args as any).delegator,
              agentId: (decoded.args as any).agentId,
            }, hash);
            return;
          }
        } catch {}
      }
    }
  }, [isSuccess, receipt]);

  const submit = () => {
    if (!agentId) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + Number(days) * 86400);
    writeContract({
      ...CONTRACTS.delegation,
      functionName: "delegateToAgent",
      args: [agentId, expiry, prefsURI],
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        2. Delegate to Agent
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Delegate your voting preferences to the registered agent. The delegation has an expiry
        and preferences URI describing your risk tolerance and values.
      </p>

      {agentId && (
        <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
          <span style={{ color: "var(--text-muted)" }}>Agent ID: </span>
          <span style={{ color: "var(--accent-blue)", wordBreak: "break-all" }}>{agentId}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            Expiry (days)
          </label>
          <input
            className="input"
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            Preferences URI
          </label>
          <input
            className="input"
            value={prefsURI}
            onChange={(e) => setPrefsURI(e.target.value)}
          />
        </div>
      </div>

      <button className="btn btn-primary" onClick={submit} disabled={!agentId || isPending || isConfirming}>
        {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Delegate"}
      </button>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  );
}
