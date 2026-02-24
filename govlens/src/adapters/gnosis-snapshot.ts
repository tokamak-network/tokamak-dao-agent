/**
 * Gnosis Safe + Snapshot Adapter (Stub)
 *
 * For DAOs using Gnosis Safe multisig with off-chain Snapshot voting.
 * To be fully implemented in Phase 4.
 */

import type { Address } from "viem";
import type {
  ChainId,
  GovernanceFramework,
  ContractEntry,
  Proposal,
  ProposalStatus,
} from "../types/index.js";
import type { ChainClientManager } from "../chain/client.js";
import type { GovernanceAdapter } from "./interface.js";

// Gnosis Safe function signatures
const SAFE_ABI = [
  {
    name: "getOwners",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    name: "getThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "nonce",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export class GnosisSnapshotAdapter implements GovernanceAdapter {
  readonly type: GovernanceFramework = "gnosis_snapshot";

  async detect(
    address: Address,
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<{ match: boolean; confidence: number }> {
    const isContract = await client.isContract(chainId, address);
    if (!isContract) return { match: false, confidence: 0 };

    let confidence = 0;

    // Try getOwners() — Gnosis Safe signature
    try {
      const owners = await client.readContract(chainId, {
        address,
        abi: SAFE_ABI,
        functionName: "getOwners",
      });
      if (Array.isArray(owners) && owners.length > 0) confidence += 0.4;
    } catch {
      return { match: false, confidence: 0 };
    }

    // Try getThreshold()
    try {
      const threshold = await client.readContract(chainId, {
        address,
        abi: SAFE_ABI,
        functionName: "getThreshold",
      });
      if (typeof threshold === "bigint" && threshold > 0n) confidence += 0.3;
    } catch {}

    return { match: confidence >= 0.4, confidence: Math.min(confidence, 1) };
  }

  async discoverContracts(
    address: Address,
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<ContractEntry[]> {
    const contracts: ContractEntry[] = [
      { address, name: "Gnosis Safe", role: "multisig" },
    ];

    try {
      const owners = (await client.readContract(chainId, {
        address,
        abi: SAFE_ABI,
        functionName: "getOwners",
      })) as Address[];

      // Record owners as metadata (not separate contracts)
      contracts[0]!.role = `multisig (${owners.length} owners)`;
    } catch {}

    return contracts;
  }

  async getTotalProposals(): Promise<number> {
    // Snapshot proposals are off-chain — requires Snapshot GraphQL API
    // Stub: return 0 until Phase 4 implementation
    return 0;
  }

  async getProposal(): Promise<Proposal> {
    throw new Error("GnosisSnapshotAdapter.getProposal: not yet implemented — requires Snapshot GraphQL integration");
  }

  async getProposalStatus(): Promise<ProposalStatus> {
    throw new Error("GnosisSnapshotAdapter.getProposalStatus: not yet implemented");
  }

  async generateDomainKnowledge(
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<string> {
    const safe = contracts.find((c) => c.role.startsWith("multisig"));
    if (!safe) return "No Gnosis Safe found.";

    const lines: string[] = [];
    lines.push("## Governance Framework: Gnosis Safe + Snapshot");
    lines.push("");

    try {
      const [owners, threshold] = await Promise.all([
        client.readContract(chainId, {
          address: safe.address,
          abi: SAFE_ABI,
          functionName: "getOwners",
        }) as Promise<Address[]>,
        client.readContract(chainId, {
          address: safe.address,
          abi: SAFE_ABI,
          functionName: "getThreshold",
        }) as Promise<bigint>,
      ]);

      lines.push(`**Safe Address**: \`${safe.address}\``);
      lines.push(`**Threshold**: ${threshold} of ${owners.length} owners`);
      lines.push("");
      lines.push("### Owners");
      for (const owner of owners) {
        lines.push(`- \`${owner}\``);
      }
    } catch {}

    return lines.join("\n");
  }
}
