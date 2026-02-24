/**
 * OpenZeppelin Governor Adapter
 *
 * Supports Governor (Bravo-compatible), GovernorAlpha,
 * and their various extensions (Compound, Votes, etc.)
 *
 * Used by: Aave, Compound, ENS, Uniswap, and the majority of DAOs.
 */

import type { Address, Hex } from "viem";
import {
  decodeFunctionData,
  encodeFunctionData,
  parseAbiItem,
  keccak256,
  toHex,
} from "viem";
import type {
  ChainId,
  GovernanceFramework,
  ContractEntry,
  Proposal,
  ProposalStatus,
} from "../types/index.js";
import type { ChainClientManager } from "../chain/client.js";
import type { GovernanceAdapter } from "./interface.js";

// ─── IGovernor Interface ID (ERC165) ─────────────────────────

// IGovernor interfaceId from OpenZeppelin
const IGOVERNOR_INTERFACE_ID = "0xbf26d897" as Hex;
// GovernorBravo-style check
const IGOVERNOR_BRAVO_INTERFACE_ID = "0x79dd7960" as Hex;

// ─── ABI Fragments ───────────────────────────────────────────

const GOVERNOR_ABI = [
  // Detection
  {
    name: "supportsInterface",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "version",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  // Proposal queries
  {
    name: "proposalCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "state",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "proposalSnapshot",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalDeadline",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalProposer",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "proposalVotes",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
  },
  // Governor parameters
  {
    name: "votingDelay",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "votingPeriod",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "quorum",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "blockNumber", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "proposalThreshold",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Related contracts
  {
    name: "timelock",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "token",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// ─── Proposal State Mapping ──────────────────────────────────

const STATE_MAP: Record<number, ProposalStatus> = {
  0: "pending",
  1: "active",
  2: "canceled",
  3: "defeated",
  4: "succeeded",
  5: "queued",
  6: "expired",
  7: "executed",
};

// ─── OZ Governor Adapter ─────────────────────────────────────

export class OZGovernorAdapter implements GovernanceAdapter {
  readonly type: GovernanceFramework = "oz_governor";

  async detect(
    address: Address,
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<{ match: boolean; confidence: number }> {
    // Check if address is a contract
    const isContract = await client.isContract(chainId, address);
    if (!isContract) return { match: false, confidence: 0 };

    let confidence = 0;

    // Try ERC165 supportsInterface(IGovernor)
    try {
      const supports = await client.readContract(chainId, {
        address,
        abi: GOVERNOR_ABI,
        functionName: "supportsInterface",
        args: [IGOVERNOR_INTERFACE_ID],
      });
      if (supports) confidence += 0.5;
    } catch {
      // Not ERC165 compatible, try function probing
    }

    // Try calling name() — OZ Governor always has this
    try {
      const name = await client.readContract(chainId, {
        address,
        abi: GOVERNOR_ABI,
        functionName: "name",
      });
      if (typeof name === "string" && name.length > 0) confidence += 0.2;
    } catch {
      // No name function
    }

    // Try votingDelay() — strong signal for Governor
    try {
      await client.readContract(chainId, {
        address,
        abi: GOVERNOR_ABI,
        functionName: "votingDelay",
      });
      confidence += 0.2;
    } catch {
      // Not a Governor
    }

    // Try proposalThreshold() — another Governor signal
    try {
      await client.readContract(chainId, {
        address,
        abi: GOVERNOR_ABI,
        functionName: "proposalThreshold",
      });
      confidence += 0.1;
    } catch {
      // Not critical
    }

    return { match: confidence >= 0.4, confidence: Math.min(confidence, 1) };
  }

  async discoverContracts(
    address: Address,
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<ContractEntry[]> {
    const contracts: ContractEntry[] = [];

    // The governor itself
    let governorName = "Governor";
    try {
      const name = await client.readContract(chainId, {
        address,
        abi: GOVERNOR_ABI,
        functionName: "name",
      });
      if (typeof name === "string") governorName = name;
    } catch {}

    contracts.push({
      address,
      name: governorName,
      role: "governor",
    });

    // Discover timelock
    try {
      const timelockAddr = (await client.readContract(chainId, {
        address,
        abi: GOVERNOR_ABI,
        functionName: "timelock",
      })) as Address;

      if (timelockAddr && timelockAddr !== "0x0000000000000000000000000000000000000000") {
        contracts.push({
          address: timelockAddr,
          name: "Timelock",
          role: "timelock",
        });
      }
    } catch {}

    // Discover governance token
    try {
      const tokenAddr = (await client.readContract(chainId, {
        address,
        abi: GOVERNOR_ABI,
        functionName: "token",
      })) as Address;

      if (tokenAddr && tokenAddr !== "0x0000000000000000000000000000000000000000") {
        contracts.push({
          address: tokenAddr,
          name: "Governance Token",
          role: "token",
        });
      }
    } catch {}

    return contracts;
  }

  async getTotalProposals(
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<number> {
    const governor = contracts.find((c) => c.role === "governor");
    if (!governor) throw new Error("No governor contract found");

    try {
      const count = (await client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "proposalCount",
      })) as bigint;
      return Number(count);
    } catch {
      // Some governors don't have proposalCount — return 0
      return 0;
    }
  }

  async getProposal(
    proposalId: string,
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<Proposal> {
    const governor = contracts.find((c) => c.role === "governor");
    if (!governor) throw new Error("No governor contract found");

    const id = BigInt(proposalId);

    // Fetch proposal data in parallel
    const [state, snapshot, deadline, proposer, votes] = await Promise.all([
      client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "state",
        args: [id],
      }) as Promise<number>,
      client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "proposalSnapshot",
        args: [id],
      }) as Promise<bigint>,
      client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "proposalDeadline",
        args: [id],
      }) as Promise<bigint>,
      client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "proposalProposer",
        args: [id],
      }).catch(() => "0x0000000000000000000000000000000000000000" as Address) as Promise<Address>,
      client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "proposalVotes",
        args: [id],
      }).catch(() => [0n, 0n, 0n]) as Promise<[bigint, bigint, bigint]>,
    ]);

    return {
      id: crypto.randomUUID(),
      tenantId: "", // Set by caller
      onChainId: proposalId,
      title: `Proposal #${proposalId}`,
      description: "", // Fetched from events or IPFS separately
      proposer,
      status: STATE_MAP[Number(state)] ?? "pending",
      targets: [],
      values: [],
      calldatas: [],
      startBlock: snapshot,
      endBlock: deadline,
      forVotes: votes[1],
      againstVotes: votes[0],
      abstainVotes: votes[2],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getProposalStatus(
    proposalId: string,
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<ProposalStatus> {
    const governor = contracts.find((c) => c.role === "governor");
    if (!governor) throw new Error("No governor contract found");

    const state = (await client.readContract(chainId, {
      address: governor.address,
      abi: GOVERNOR_ABI,
      functionName: "state",
      args: [BigInt(proposalId)],
    })) as number;

    return STATE_MAP[state] ?? "pending";
  }

  async generateDomainKnowledge(
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<string> {
    const governor = contracts.find((c) => c.role === "governor");
    if (!governor) return "No governor contract found.";

    const lines: string[] = [];
    lines.push(`## Governance Framework: OpenZeppelin Governor`);
    lines.push("");

    // Name
    try {
      const name = await client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "name",
      });
      lines.push(`**Name**: ${name}`);
    } catch {}

    // Version
    try {
      const version = await client.readContract(chainId, {
        address: governor.address,
        abi: GOVERNOR_ABI,
        functionName: "version",
      });
      lines.push(`**Version**: ${version}`);
    } catch {}

    // Parameters
    try {
      const [votingDelay, votingPeriod, threshold] = await Promise.all([
        client.readContract(chainId, {
          address: governor.address,
          abi: GOVERNOR_ABI,
          functionName: "votingDelay",
        }) as Promise<bigint>,
        client.readContract(chainId, {
          address: governor.address,
          abi: GOVERNOR_ABI,
          functionName: "votingPeriod",
        }) as Promise<bigint>,
        client.readContract(chainId, {
          address: governor.address,
          abi: GOVERNOR_ABI,
          functionName: "proposalThreshold",
        }) as Promise<bigint>,
      ]);

      lines.push("");
      lines.push("### Governance Parameters");
      lines.push(`- Voting Delay: ${votingDelay} blocks`);
      lines.push(`- Voting Period: ${votingPeriod} blocks`);
      lines.push(`- Proposal Threshold: ${threshold}`);
    } catch {}

    // Contracts
    lines.push("");
    lines.push("### Contracts");
    for (const contract of contracts) {
      lines.push(`- **${contract.name}** (${contract.role}): \`${contract.address}\``);
    }

    return lines.join("\n");
  }
}
