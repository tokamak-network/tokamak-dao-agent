/**
 * On-chain agenda synchronization.
 *
 * Polls DAOAgendaManager.totalAgendas() to detect new on-chain agendas,
 * fetches their details, decodes calldata, creates forum entries,
 * and triggers QOC evaluation for newly discovered agendas.
 */

import type { Address, Hex } from "viem";
import { decodeFunctionData } from "viem";
import { publicClient } from "../mcp/client.ts";
import { loadAbi, loadAllAbis } from "../mcp/data/abis.ts";
import { getContractName } from "../mcp/data/contracts.ts";
import { createAgenda, getAgenda, updateAgendaStatus } from "../db/agendas.ts";
import { getDb } from "../db/index.ts";
import { runQocEvaluation } from "./qoc-agents.ts";

const DAO_AGENDA_MANAGER = "0xcD4421d082752f363E1687544a09d5112cD4f484" as Address;

const _compiledAbi = loadAbi("IDAOAgendaManagerComplete");
const AGENDA_MANAGER_ABI = [
  ...(_compiledAbi || []),
  {
    name: "getExecutionInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_agendaID", type: "uint256" }],
    outputs: [
      { name: "target", type: "address[]" },
      { name: "functionBytecode", type: "bytes[]" },
      { name: "atomicExecute", type: "bool" },
      { name: "executeStartFrom", type: "uint256" },
    ],
  },
] as const;

const AGENDA_STATUS = ["NONE", "NOTICE", "VOTING", "WAITING_EXEC", "EXECUTED", "ENDED"] as const;
const AGENDA_RESULT = ["PENDING", "ACCEPT", "REJECT", "DISMISS"] as const;

/** Default sync interval: 5 minutes */
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

let syncTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Decode a single calldata against all known ABIs.
 */
function decodeCalldata(calldata: string): { functionName: string; contractName: string; args: string } | null {
  const allAbis = loadAllAbis();
  for (const [contractName, abi] of allAbis) {
    try {
      const decoded = decodeFunctionData({ abi, data: calldata as Hex });
      const fnAbi = abi.find((item: any) => item.name === decoded.functionName);
      const argsStr = decoded.args
        ? decoded.args
            .map((a: any, i: number) => {
              const input = fnAbi?.inputs?.[i];
              const name = input?.name || `arg${i}`;
              const val = typeof a === "bigint" ? a.toString() : String(a);
              return `${name}: ${val}`;
            })
            .join(", ")
        : "(no arguments)";
      return { functionName: decoded.functionName, contractName, args: argsStr };
    } catch {}
  }
  return null;
}

/**
 * Fetch on-chain agenda details and format as forum content.
 */
async function fetchOnChainAgenda(agendaId: number): Promise<{
  title: string;
  content: string;
  status: string;
  result: string;
  deadline: string;
  createdAt: string;
} | null> {
  try {
    const id = BigInt(agendaId);

    const [agendaInfo, execInfo] = await Promise.all([
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: AGENDA_MANAGER_ABI,
        functionName: "agendas",
        args: [id],
      }),
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: AGENDA_MANAGER_ABI,
        functionName: "getExecutionInfo",
        args: [id],
      }),
    ]);

    const info = agendaInfo as any;
    const exec = execInfo as any;
    const status = AGENDA_STATUS[Number(info.status)] || "UNKNOWN";
    const result = AGENDA_RESULT[Number(info.result)] || "UNKNOWN";
    const targets = [...exec[0]] as string[];
    const bytecodes = [...exec[1]] as string[];

    // Decode calldatas
    const decodedCalls: string[] = [];
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]!;
      const calldata = bytecodes[i]!;
      const targetName = getContractName(target) || `Unknown (${target.slice(0, 10)}...)`;
      const decoded = decodeCalldata(calldata);

      if (decoded) {
        decodedCalls.push(
          `- **${decoded.functionName}** on ${targetName} (${decoded.contractName})\n  Args: ${decoded.args}`,
        );
      } else {
        decodedCalls.push(
          `- Unknown function on ${targetName}\n  Calldata: ${calldata.slice(0, 20)}...`,
        );
      }
    }

    // Build content
    const votingEndTimestamp = Number(info.votingEndTimestamp || info.createdTimestamp) * 1000;
    const deadline = new Date(
      votingEndTimestamp > 0 ? votingEndTimestamp : Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const content = `## On-Chain Agenda #${agendaId}

**Status:** ${status} | **Result:** ${result}
**Executed:** ${info.executed}
**Votes:** Yes: ${info.countingYes?.toString() || "0"} / No: ${info.countingNo?.toString() || "0"} / Abstain: ${info.countingAbstain?.toString() || "0"}
**Created:** ${new Date(Number(info.createdTimestamp) * 1000).toISOString()}
**Atomic Execute:** ${exec[2]}

### Decoded Calls (${targets.length})

${decodedCalls.join("\n\n")}`;

    const title = decodedCalls.length > 0
      ? `On-Chain Agenda #${agendaId}: ${decodedCalls[0]?.match(/\*\*(.+?)\*\*/)?.[1] || "Governance Action"}`
      : `On-Chain Agenda #${agendaId}`;

    const createdAt = new Date(Number(info.createdTimestamp) * 1000).toISOString();
    return { title: title.slice(0, 200), content, status, result, deadline, createdAt };
  } catch (err) {
    console.error(`[agenda-sync] failed to fetch agenda #${agendaId}:`, err);
    return null;
  }
}

/**
 * Check which on-chain agenda IDs are already in the forum DB.
 */
function getExistingOnChainIds(): Set<number> {
  const db = getDb();
  const rows = db
    .query(`SELECT on_chain_agenda_id FROM agendas WHERE on_chain_agenda_id IS NOT NULL`)
    .all() as { on_chain_agenda_id: number }[];
  return new Set(rows.map((r) => r.on_chain_agenda_id));
}

/**
 * Sync on-chain agendas to the forum database.
 * Only creates entries for new agendas not yet in the DB.
 */
export async function syncOnChainAgendas(): Promise<{
  total: number;
  newlyImported: number;
  updated: number;
  errors: number;
}> {
  console.log("[agenda-sync] starting on-chain agenda sync...");

  let total: number;
  try {
    const totalAgendas = await publicClient.readContract({
      address: DAO_AGENDA_MANAGER,
      abi: AGENDA_MANAGER_ABI,
      functionName: "totalAgendas",
      args: [],
    });
    total = Number(totalAgendas);
  } catch (err) {
    console.error("[agenda-sync] failed to fetch totalAgendas:", err);
    return { total: 0, newlyImported: 0, updated: 0, errors: 1 };
  }

  const existingIds = getExistingOnChainIds();
  let newlyImported = 0;
  let updated = 0;
  let errors = 0;

  // Backfill: update existing on-chain agendas missing on_chain_created_at or on_chain_status
  const db = getDb();
  const staleRows = db
    .query(
      `SELECT id, on_chain_agenda_id FROM agendas
       WHERE on_chain_agenda_id IS NOT NULL
         AND (on_chain_created_at IS NULL OR on_chain_status IS NULL)`,
    )
    .all() as { id: number; on_chain_agenda_id: number }[];

  if (staleRows.length > 0) {
    console.log(`[agenda-sync] backfilling ${staleRows.length} existing on-chain agendas...`);
    for (const row of staleRows) {
      try {
        const onChain = await fetchOnChainAgenda(row.on_chain_agenda_id);
        if (onChain) {
          db.prepare(
            `UPDATE agendas SET on_chain_created_at = ?, on_chain_status = ?, updated_at = datetime('now') WHERE id = ?`,
          ).run(onChain.createdAt, `${onChain.status} / ${onChain.result}`, row.id);
          updated++;
        }
      } catch (err) {
        console.error(`[agenda-sync] backfill failed for agenda #${row.on_chain_agenda_id}:`, err);
      }
    }
  }

  // Process agendas in batches of 5
  for (let i = 0; i < total; i += 5) {
    const batch = Array.from(
      { length: Math.min(5, total - i) },
      (_, j) => i + j,
    );

    const results = await Promise.allSettled(
      batch.map(async (agendaId) => {
        if (existingIds.has(agendaId)) return null;

        const onChain = await fetchOnChainAgenda(agendaId);
        if (!onChain) return null;

        // Create forum entry
        const agenda = createAgenda({
          title: onChain.title,
          content: onChain.content,
          onChainAgendaId: agendaId,
          onChainCreatedAt: onChain.createdAt,
          onChainStatus: `${onChain.status} / ${onChain.result}`,
          creator: "on-chain-sync",
          deadline: onChain.deadline,
        });

        // Skip validation for on-chain agendas (already approved by committee)
        // Directly set to open status
        updateAgendaStatus(agenda.id, "open");

        console.log(`[agenda-sync] imported on-chain agenda #${agendaId} → forum #${agenda.id}`);

        // Trigger QOC evaluation in background (fire-and-forget)
        runQocEvaluation({ ...agenda, status: "open" }).catch((err) =>
          console.error(`[agenda-sync] QOC evaluation failed for agenda #${agendaId}:`, err),
        );

        return agenda.id;
      }),
    );

    for (const r of results) {
      if (r.status === "rejected") {
        errors++;
        console.error("[agenda-sync] batch error:", r.reason);
      } else if (r.value !== null) {
        newlyImported++;
      }
    }
  }

  console.log(
    `[agenda-sync] done: ${total} on-chain agendas, ${newlyImported} newly imported, ${updated} backfilled, ${errors} errors`,
  );

  return { total, newlyImported, updated, errors };
}

/**
 * Start periodic sync. Call once at server startup.
 */
export function startAgendaSync(intervalMs: number = SYNC_INTERVAL_MS): void {
  // Initial sync
  syncOnChainAgendas().catch((err) =>
    console.error("[agenda-sync] initial sync failed:", err),
  );

  // Periodic sync
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    syncOnChainAgendas().catch((err) =>
      console.error("[agenda-sync] periodic sync failed:", err),
    );
  }, intervalMs);

  console.log(`[agenda-sync] periodic sync started (every ${intervalMs / 1000}s)`);
}

/**
 * Stop periodic sync.
 */
export function stopAgendaSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    console.log("[agenda-sync] periodic sync stopped");
  }
}
