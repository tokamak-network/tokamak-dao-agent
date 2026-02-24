/**
 * Governance Adapter Interface
 *
 * Every governance framework (OZ Governor, Gnosis, Aragon, Custom)
 * implements this interface to normalize proposal data and detection.
 */

import type { Address } from "viem";
import type {
  ChainId,
  GovernanceFramework,
  ContractEntry,
  Proposal,
  ProposalStatus,
  DiscoveryResult,
} from "../types/index.js";
import type { ChainClientManager } from "../chain/client.js";

export interface GovernanceAdapter {
  readonly type: GovernanceFramework;

  /**
   * Detect if the given address uses this governance framework.
   * Returns confidence 0-1.
   */
  detect(
    address: Address,
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<{ match: boolean; confidence: number }>;

  /**
   * Discover all related governance contracts from an entry point.
   * e.g., Governor → Timelock, Token, Treasury
   */
  discoverContracts(
    address: Address,
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<ContractEntry[]>;

  /**
   * Get the total number of proposals.
   */
  getTotalProposals(
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<number>;

  /**
   * Fetch a specific proposal by ID.
   */
  getProposal(
    proposalId: string,
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<Proposal>;

  /**
   * Get the current status of a proposal.
   */
  getProposalStatus(
    proposalId: string,
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<ProposalStatus>;

  /**
   * Generate domain knowledge for system prompts.
   * Describes the governance structure, key parameters, etc.
   */
  generateDomainKnowledge(
    contracts: ContractEntry[],
    chainId: ChainId,
    client: ChainClientManager,
  ): Promise<string>;
}

/**
 * Run all adapters against an address and return the best match.
 */
export async function detectFramework(
  address: Address,
  chainId: ChainId,
  client: ChainClientManager,
  adapters: GovernanceAdapter[],
): Promise<DiscoveryResult | null> {
  const results: Array<{
    adapter: GovernanceAdapter;
    confidence: number;
  }> = [];

  // Run detection in parallel
  const detections = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const result = await adapter.detect(address, chainId, client);
      return { adapter, ...result };
    }),
  );

  for (const detection of detections) {
    if (detection.status === "fulfilled" && detection.value.match) {
      results.push({
        adapter: detection.value.adapter,
        confidence: detection.value.confidence,
      });
    }
  }

  if (results.length === 0) return null;

  // Pick highest confidence
  results.sort((a, b) => b.confidence - a.confidence);
  const best = results[0]!;

  // Discover related contracts
  const contracts = await best.adapter.discoverContracts(
    address,
    chainId,
    client,
  );

  return {
    framework: best.adapter.type,
    confidence: best.confidence,
    contracts,
    metadata: {},
  };
}
