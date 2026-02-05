/**
 * fetch_agenda and decode_calldata tools
 */

import { z } from "zod";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  decodeFunctionData,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import { getContractName } from "../data/contracts.ts";
import { loadAllAbis } from "../data/abis.ts";

const AGENDAS_PATH = join(import.meta.dir, "../../../scripts/mainnet/agendas.json");

const DAO_AGENDA_MANAGER = "0xcD4421d082752f363E1687544a09d5112cD4f484" as Address;

const agendaManagerAbi = parseAbi([
  "function numAgendas() view returns (uint256)",
  "function getAgendaStatus(uint256 _agendaID) view returns (uint256)",
  "function getAgendaResult(uint256 _agendaID) view returns (uint256, bool)",
  "function getVotingCount(uint256 _agendaID) view returns (uint256, uint256, uint256)",
  "function getAgendaTimestamps(uint256 _agendaID) view returns (uint256, uint256, uint256, uint256, uint256)",
  "function getExecutionInfo(uint256 _agendaID) view returns (address[], bytes[], bool, uint256)",
  "function getVoters(uint256 _agendaID) view returns (address[])",
]);

const AGENDA_STATUS = ["NONE", "NOTICE", "VOTING", "WAITING_EXEC", "EXECUTED", "ENDED"] as const;
const AGENDA_RESULT = ["PENDING", "ACCEPT", "REJECT", "DISMISS"] as const;

interface CachedAgenda {
  id: number;
  status: string;
  result: string;
  executed: boolean;
  votes: { yes: string; no: string; abstain: string };
  timestamps: {
    created: string;
    noticeEnd: string;
    votingStart: string;
    votingEnd: string;
    executed: string | null;
  };
  targets: string[];
  targetNames: string[];
  calls: string[];
  atomicExecute: boolean;
  voters: string[];
}

function loadCachedAgendas(): CachedAgenda[] {
  if (!existsSync(AGENDAS_PATH)) return [];
  return JSON.parse(readFileSync(AGENDAS_PATH, "utf-8"));
}

function tryDecodeCalldata(calldata: Hex): string {
  const allAbis = loadAllAbis();
  for (const [, abi] of allAbis) {
    try {
      const decoded = decodeFunctionData({ abi, data: calldata });
      const argsStr = decoded.args
        ? decoded.args
            .map((a: any) => {
              if (typeof a === "bigint") return a.toString();
              if (Array.isArray(a)) return `[${a.map(String).join(", ")}]`;
              return String(a);
            })
            .join(", ")
        : "";
      return `${decoded.functionName}(${argsStr})`;
    } catch {}
  }
  return `unknown(selector: ${calldata.slice(0, 10)})`;
}

async function fetchAgendaFromChain(id: number): Promise<CachedAgenda> {
  const [status, resultTuple, votes, timestamps, execInfo, voters] =
    await Promise.all([
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: agendaManagerAbi,
        functionName: "getAgendaStatus",
        args: [BigInt(id)],
      }),
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: agendaManagerAbi,
        functionName: "getAgendaResult",
        args: [BigInt(id)],
      }),
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: agendaManagerAbi,
        functionName: "getVotingCount",
        args: [BigInt(id)],
      }),
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: agendaManagerAbi,
        functionName: "getAgendaTimestamps",
        args: [BigInt(id)],
      }),
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: agendaManagerAbi,
        functionName: "getExecutionInfo",
        args: [BigInt(id)],
      }),
      publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: agendaManagerAbi,
        functionName: "getVoters",
        args: [BigInt(id)],
      }),
    ]);

  const [result, executed] = resultTuple as [bigint, boolean];
  const [yes, no, abstain] = votes as [bigint, bigint, bigint];
  const [created, noticeEnd, votingStart, votingEnd, executedTs] =
    timestamps as [bigint, bigint, bigint, bigint, bigint];
  const [targets, functionBytecodes, atomicExecute] = execInfo as [
    Address[],
    Hex[],
    boolean,
  ];

  const calls = functionBytecodes.map((bytecode: Hex) =>
    tryDecodeCalldata(bytecode)
  );
  const targetNames = targets.map((t: Address) => getContractName(t));

  return {
    id,
    status: AGENDA_STATUS[Number(status)] || `UNKNOWN(${status})`,
    result: AGENDA_RESULT[Number(result)] || `UNKNOWN(${result})`,
    executed,
    votes: {
      yes: yes.toString(),
      no: no.toString(),
      abstain: abstain.toString(),
    },
    timestamps: {
      created: new Date(Number(created) * 1000).toISOString(),
      noticeEnd: new Date(Number(noticeEnd) * 1000).toISOString(),
      votingStart:
        Number(votingStart) > 0
          ? new Date(Number(votingStart) * 1000).toISOString()
          : new Date(0).toISOString(),
      votingEnd: new Date(Number(votingEnd) * 1000).toISOString(),
      executed:
        Number(executedTs) > 0
          ? new Date(Number(executedTs) * 1000).toISOString()
          : null,
    },
    targets: targets.map(String),
    targetNames,
    calls,
    atomicExecute,
    voters: voters.map(String),
  };
}

export async function handleFetchAgenda(args: {
  agenda_id: number;
  force_refresh?: boolean;
}): Promise<string> {
  let agenda: CachedAgenda | undefined;

  if (!args.force_refresh) {
    const cached = loadCachedAgendas();
    agenda = cached.find((a) => a.id === args.agenda_id);
  }

  if (!agenda) {
    agenda = await fetchAgendaFromChain(args.agenda_id);

    // Update cache
    const cached = loadCachedAgendas();
    const idx = cached.findIndex((a) => a.id === args.agenda_id);
    if (idx >= 0) {
      cached[idx] = agenda;
    } else {
      cached.push(agenda);
      cached.sort((a, b) => a.id - b.id);
    }
    writeFileSync(AGENDAS_PATH, JSON.stringify(cached, null, 2));
  }

  const lines = [
    `## Agenda #${agenda.id}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Status | ${agenda.status} |`,
    `| Result | ${agenda.result} |`,
    `| Executed | ${agenda.executed} |`,
    `| Votes (Y/N/A) | ${agenda.votes.yes} / ${agenda.votes.no} / ${agenda.votes.abstain} |`,
    `| Atomic Execute | ${agenda.atomicExecute} |`,
    "",
    `### Timeline`,
    `- Created: ${agenda.timestamps.created}`,
    `- Notice End: ${agenda.timestamps.noticeEnd}`,
    `- Voting: ${agenda.timestamps.votingStart} → ${agenda.timestamps.votingEnd}`,
    agenda.timestamps.executed ? `- Executed: ${agenda.timestamps.executed}` : "- Not executed",
    "",
    `### Targets & Calls`,
  ];

  for (let i = 0; i < agenda.targets.length; i++) {
    lines.push(`**Target ${i}**: ${agenda.targetNames[i]} (${agenda.targets[i]})`);
    lines.push(`**Call ${i}**: \`${agenda.calls[i]}\``);
    lines.push("");
  }

  lines.push(`### Voters (${agenda.voters.length})`);
  for (const voter of agenda.voters) {
    lines.push(`- ${voter}`);
  }

  return lines.join("\n");
}

export async function handleDecodeCalldata(args: {
  calldata: string;
  target_address?: string;
}): Promise<string> {
  const allAbis = loadAllAbis();
  const results: { contractName: string; functionName: string; args: string }[] = [];

  for (const [contractName, abi] of allAbis) {
    try {
      const decoded = decodeFunctionData({ abi, data: args.calldata as Hex });
      const argsStr = decoded.args
        ? decoded.args
            .map((a: any, i: number) => {
              const input = abi.find((item: any) => item.name === decoded.functionName)?.inputs?.[i];
              const name = input?.name || `arg${i}`;
              const val = typeof a === "bigint" ? a.toString() : String(a);
              return `  ${name}: ${val}`;
            })
            .join("\n")
        : "  (no arguments)";

      results.push({
        contractName,
        functionName: decoded.functionName,
        args: argsStr,
      });
    } catch {}
  }

  if (results.length === 0) {
    const selector = (args.calldata as string).slice(0, 10);
    return `Could not decode calldata.\n\n**Selector**: ${selector}\n**Raw data**: ${args.calldata}`;
  }

  const seen = new Set<string>();
  const unique = results.filter((r) => {
    const key = `${r.functionName}:${r.args}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const lines = [
    `## Decoded Calldata`,
    args.target_address ? `**Target**: ${getContractName(args.target_address)} (${args.target_address})` : "",
    "",
  ];

  for (const r of unique) {
    lines.push(`### ${r.functionName} (from ${r.contractName})`);
    lines.push(`\`\`\``);
    lines.push(r.args);
    lines.push(`\`\`\``);
    lines.push("");
  }

  return lines.join("\n");
}

export function registerGovernanceTools(server: McpServer) {
  server.tool(
    "fetch_agenda",
    "Fetch a DAO agenda/proposal by ID. Returns status, votes, targets, decoded calldata, and voter list. Uses cache by default, set force_refresh to query on-chain.",
    {
      agenda_id: z.number().describe("Agenda ID (0-based)"),
      force_refresh: z.boolean().optional().describe("Force on-chain refresh instead of using cache"),
    },
    async ({ agenda_id, force_refresh }) => {
      try {
        const text = await handleFetchAgenda({ agenda_id, force_refresh });
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `Error fetching agenda #${agenda_id}: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "decode_calldata",
    "Decode raw calldata (transaction data) using known Tokamak contract ABIs. Returns function name and parameters.",
    {
      calldata: z.string().describe("Hex-encoded calldata (0x...)"),
      target_address: z.string().optional().describe("Target contract address for context"),
    },
    async ({ calldata, target_address }) => {
      const text = await handleDecodeCalldata({ calldata, target_address });
      return { content: [{ type: "text" as const, text }] };
    }
  );
}
