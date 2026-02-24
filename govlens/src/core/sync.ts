/**
 * Proposal Sync Engine
 *
 * Polls governance contracts for new/updated proposals
 * and syncs them to the database.
 */

import type { Address } from "viem";
import type { Tenant, ContractEntry, Proposal } from "../types/index.js";
import type { GovernanceAdapter } from "../adapters/interface.js";
import type { ChainClientManager } from "../chain/client.js";
import { upsertProposal, getProposalByOnChainId } from "../db/proposals.js";

export interface SyncResult {
  tenantSlug: string;
  totalOnChain: number;
  newProposals: number;
  updatedProposals: number;
  errors: string[];
}

/**
 * Sync proposals for a single tenant.
 */
export async function syncProposals(
  tenant: Tenant,
  adapter: GovernanceAdapter,
  client: ChainClientManager,
): Promise<SyncResult> {
  const result: SyncResult = {
    tenantSlug: tenant.slug,
    totalOnChain: 0,
    newProposals: 0,
    updatedProposals: 0,
    errors: [],
  };

  const contracts = tenant.config.additionalContracts;

  try {
    const total = await adapter.getTotalProposals(
      contracts,
      tenant.chainId,
      client,
    );
    result.totalOnChain = total;

    // Sync each proposal (most recent first for efficiency)
    for (let i = total; i >= Math.max(1, total - 50); i--) {
      try {
        const proposalId = String(i);
        const existing = await getProposalByOnChainId(tenant.id, proposalId);

        // If proposal exists and is in a terminal state, skip
        if (existing) {
          const terminalStates = ["executed", "canceled", "expired", "defeated"];
          if (terminalStates.includes(existing.status)) continue;
        }

        // Fetch from chain
        const proposal = await adapter.getProposal(
          proposalId,
          contracts,
          tenant.chainId,
          client,
        );

        // Set tenant ID
        proposal.tenantId = tenant.id;

        // Upsert to database
        await upsertProposal(tenant.id, proposal);

        if (existing) {
          result.updatedProposals++;
        } else {
          result.newProposals++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Proposal ${i}: ${msg}`);
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Sync failed: ${msg}`);
  }

  return result;
}

/**
 * Sync proposals for all tenants.
 */
export async function syncAllTenants(
  tenants: Tenant[],
  adapterMap: Map<string, GovernanceAdapter>,
  client: ChainClientManager,
): Promise<SyncResult[]> {
  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const adapter = adapterMap.get(tenant.frameworkType);
      if (!adapter) {
        return {
          tenantSlug: tenant.slug,
          totalOnChain: 0,
          newProposals: 0,
          updatedProposals: 0,
          errors: [`No adapter for framework: ${tenant.frameworkType}`],
        };
      }
      return syncProposals(tenant, adapter, client);
    }),
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : {
          tenantSlug: "unknown",
          totalOnChain: 0,
          newProposals: 0,
          updatedProposals: 0,
          errors: [r.reason?.message ?? "Unknown error"],
        },
  );
}
