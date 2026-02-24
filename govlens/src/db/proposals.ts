/**
 * Proposal Data Access
 */

import type { Address, Hex } from "viem";
import type { Proposal, ProposalStatus } from "../types/index.js";
import { getDb, withTenant } from "./client.js";

// ─── CRUD ────────────────────────────────────────────────────

export async function upsertProposal(
  tenantId: string,
  proposal: Omit<Proposal, "id" | "createdAt" | "updatedAt">,
): Promise<Proposal> {
  const sql = getDb();
  const [row] = await sql`
    INSERT INTO proposals (
      tenant_id, on_chain_id, title, description, proposer, status,
      targets, "values", calldatas, start_block, end_block,
      for_votes, against_votes, abstain_votes
    ) VALUES (
      ${tenantId},
      ${proposal.onChainId},
      ${proposal.title},
      ${proposal.description},
      ${proposal.proposer},
      ${proposal.status},
      ${JSON.stringify(proposal.targets)},
      ${JSON.stringify(proposal.values.map(String))},
      ${JSON.stringify(proposal.calldatas)},
      ${proposal.startBlock.toString()},
      ${proposal.endBlock.toString()},
      ${proposal.forVotes.toString()},
      ${proposal.againstVotes.toString()},
      ${proposal.abstainVotes.toString()}
    )
    ON CONFLICT (tenant_id, on_chain_id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      status = EXCLUDED.status,
      for_votes = EXCLUDED.for_votes,
      against_votes = EXCLUDED.against_votes,
      abstain_votes = EXCLUDED.abstain_votes,
      updated_at = NOW()
    RETURNING *
  `;

  return rowToProposal(row);
}

export async function getProposal(
  tenantId: string,
  proposalId: string,
): Promise<Proposal | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT * FROM proposals
    WHERE tenant_id = ${tenantId} AND id = ${proposalId}
  `;
  return row ? rowToProposal(row) : null;
}

export async function getProposalByOnChainId(
  tenantId: string,
  onChainId: string,
): Promise<Proposal | null> {
  const sql = getDb();
  const [row] = await sql`
    SELECT * FROM proposals
    WHERE tenant_id = ${tenantId} AND on_chain_id = ${onChainId}
  `;
  return row ? rowToProposal(row) : null;
}

export async function listProposals(
  tenantId: string,
  options?: { status?: ProposalStatus; limit?: number; offset?: number },
): Promise<Proposal[]> {
  const sql = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let rows;
  if (options?.status) {
    rows = await sql`
      SELECT * FROM proposals
      WHERE tenant_id = ${tenantId} AND status = ${options.status}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    rows = await sql`
      SELECT * FROM proposals
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  return rows.map(rowToProposal);
}

export async function updateProposalStatus(
  tenantId: string,
  proposalId: string,
  status: ProposalStatus,
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE proposals
    SET status = ${status}, updated_at = NOW()
    WHERE tenant_id = ${tenantId} AND id = ${proposalId}
  `;
}

// ─── Row Mapping ─────────────────────────────────────────────

function rowToProposal(row: Record<string, any>): Proposal {
  const targets = Array.isArray(row.targets)
    ? row.targets
    : JSON.parse(row.targets ?? "[]");
  const values = Array.isArray(row.values)
    ? row.values
    : JSON.parse(row.values ?? "[]");
  const calldatas = Array.isArray(row.calldatas)
    ? row.calldatas
    : JSON.parse(row.calldatas ?? "[]");

  return {
    id: row.id,
    tenantId: row.tenant_id,
    onChainId: row.on_chain_id,
    title: row.title ?? "",
    description: row.description ?? "",
    proposer: (row.proposer ?? "0x0000000000000000000000000000000000000000") as Address,
    status: row.status as ProposalStatus,
    targets: targets as Address[],
    values: values.map((v: string) => BigInt(v)),
    calldatas: calldatas as Hex[],
    startBlock: BigInt(row.start_block ?? "0"),
    endBlock: BigInt(row.end_block ?? "0"),
    forVotes: BigInt(row.for_votes ?? "0"),
    againstVotes: BigInt(row.against_votes ?? "0"),
    abstainVotes: BigInt(row.abstain_votes ?? "0"),
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}
