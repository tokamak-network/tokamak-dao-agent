import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { useDemo } from "../../../contexts/DemoContext";
import { CONTRACTS } from "../../../config/contracts";
import TxStatus from "../TxStatus";
import { pushLog } from "../EventLog";

export default function RegisterAgentStep() {
  const { completeStep, update } = useDemo();
  const [metadataURI, setMetadataURI] = useState("ipfs://QmDemoAgent");

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && receipt) {
      // Parse AgentRegistered event
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: CONTRACTS.registry.abi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "AgentRegistered") {
            const agentId = (decoded.args as any).agentId as `0x${string}`;
            update({ agentId });
            completeStep(0);
            pushLog("AgentRegistered", {
              agentId,
              operator: (decoded.args as any).operator,
              metadataURI: (decoded.args as any).metadataURI,
            }, hash);
            return;
          }
        } catch {}
      }
    }
  }, [isSuccess, receipt]);

  const submit = () => {
    writeContract({
      ...CONTRACTS.registry,
      functionName: "registerAgent",
      args: [metadataURI],
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        1. Register AI Agent
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        Register an AI agent on the <code>AIAgentRegistry</code>. The agent ID is deterministically
        derived from your address and a nonce.
      </p>

      <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
        Metadata URI
      </label>
      <input
        className="input"
        value={metadataURI}
        onChange={(e) => setMetadataURI(e.target.value)}
        placeholder="ipfs://Qm..."
      />

      <div style={{ marginTop: "1rem" }}>
        <button className="btn btn-primary" onClick={submit} disabled={isPending || isConfirming}>
          {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Register Agent"}
        </button>
      </div>

      <TxStatus hash={hash} isPending={isPending} isConfirming={isConfirming} isSuccess={isSuccess} error={error} />
    </div>
  );
}
