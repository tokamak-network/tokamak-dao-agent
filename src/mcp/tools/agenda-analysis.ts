/**
 * analyze_agenda tool - Comprehensive DAO agenda analysis
 *
 * Decodes calldata, simulates execution, runs fork tests,
 * and provides risk assessment for DAO proposals.
 */

import { z } from "zod";
import { decodeFunctionData, type Address, type Hex } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import { getContractName } from "../data/contracts.ts";
import { loadAbi, loadAllAbis } from "../data/abis.ts";
import { DAO_ACTIONS } from "../data/dao-actions.ts";
import { handleRunForkTest } from "./fork-test.ts";
import { formatError } from "./validation.ts";

const DAO_COMMITTEE_PROXY = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26" as Address;
const DAO_AGENDA_MANAGER = "0xcD4421d082752f363E1687544a09d5112cD4f484" as Address;

// Load compiled ABI (correct struct layout for agendas) and supplement with
// getExecutionInfo which exists on-chain but not in the compiled interface.
const _compiledAbi = loadAbi("IDAOAgendaManagerComplete");
const AGENDA_MANAGER_ABI = [
  ...(_compiledAbi || []),
  // getExecutionInfo exists on-chain (DAOAgendaManager.sol:368) but the
  // compiled interface only has executionInfos (struct getter). Add it manually.
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

interface DecodedCall {
  target: string;
  targetName: string;
  calldata: string;
  functionName: string;
  contractName: string;
  args: string;
}

/**
 * Decode a single calldata using all known ABIs.
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

  // Fallback: try DAO actions registry ABIs (governance functions not in contracts/out/)
  for (const action of DAO_ACTIONS) {
    try {
      const decoded = decodeFunctionData({ abi: action.abi, data: calldata as Hex });
      const fnAbi = action.abi.find((item) => item.name === decoded.functionName);
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

      return { functionName: decoded.functionName, contractName: action.name, args: argsStr };
    } catch {}
  }

  return null;
}

/**
 * Classify risk level for a decoded call.
 */
function classifyRisk(targetName: string, functionName: string): { level: string; reason: string } {
  const fn = functionName.toLowerCase();
  const target = targetName.toLowerCase();

  if (fn.includes("upgrade") || fn.includes("setimplementation")) {
    return { level: "HIGH", reason: "Contract upgrade - changes implementation logic" };
  }
  if (fn.includes("transfer") && target.includes("vault")) {
    return { level: "HIGH", reason: "Treasury fund transfer" };
  }
  if (fn.includes("setowner") || fn.includes("transferownership") || fn.includes("changeowner")) {
    return { level: "HIGH", reason: "Ownership change" };
  }
  if (fn.includes("pause") || fn.includes("unpause")) {
    return { level: "MEDIUM", reason: "System pause/unpause" };
  }
  if (fn.startsWith("set") || fn.startsWith("update")) {
    return { level: "MEDIUM", reason: "Parameter change" };
  }
  return { level: "LOW", reason: "Standard operation" };
}

export async function handleAnalyzeAgenda(args: {
  agenda_id?: string;
  targets?: string[];
  function_bytecodes?: string[];
  atomic_execute?: boolean;
}): Promise<string> {
  const lines: string[] = [];
  let targets: string[] = [];
  let bytecodes: string[] = [];
  let atomicExecute = false;

  // Step 1: Fetch agenda info if agenda_id provided
  if (args.agenda_id) {
    const agendaId = BigInt(args.agenda_id);

    try {
      // Get execution info
      const execInfo = await publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: AGENDA_MANAGER_ABI,
        functionName: "getExecutionInfo",
        args: [agendaId],
      });

      const execResult = execInfo as [string[], string[], boolean];
      targets = [...execResult[0]];
      bytecodes = [...execResult[1]];
      atomicExecute = execResult[2];

      // Get agenda metadata
      const agendaInfo = await publicClient.readContract({
        address: DAO_AGENDA_MANAGER,
        abi: AGENDA_MANAGER_ABI,
        functionName: "agendas",
        args: [agendaId],
      });

      // Compiled ABI returns a single tuple struct with named fields
      const info = agendaInfo as any;

      lines.push(`# Agenda #${args.agenda_id} Analysis`);
      lines.push("");
      lines.push("## Metadata");
      lines.push("");
      lines.push(`| Field | Value |`);
      lines.push(`|-------|-------|`);
      lines.push(`| Status | ${AGENDA_STATUS[Number(info.status)] || "UNKNOWN"} |`);
      lines.push(`| Result | ${AGENDA_RESULT[Number(info.result)] || "UNKNOWN"} |`);
      lines.push(`| Executed | ${info.executed} |`);
      lines.push(`| Votes (Yes/No/Abstain) | ${info.countingYes.toString()} / ${info.countingNo.toString()} / ${info.countingAbstain.toString()} |`);
      lines.push(`| Created | ${new Date(Number(info.createdTimestamp) * 1000).toISOString()} |`);
      lines.push(`| Voting Period | ${Number(info.votingPeriodInSeconds)}s |`);
      lines.push(`| Atomic Execute | ${atomicExecute} |`);
      lines.push("");
    } catch (err) {
      return `Error fetching agenda ${args.agenda_id}: ${formatError(err)}`;
    }
  } else if (args.targets && args.function_bytecodes) {
    targets = args.targets;
    bytecodes = args.function_bytecodes;
    atomicExecute = args.atomic_execute ?? false;
    lines.push(`# Proposal Analysis`);
    lines.push("");
  } else {
    return "Error: Provide either agenda_id or both targets and function_bytecodes.";
  }

  if (targets.length === 0) {
    lines.push("No execution targets found for this agenda.");
    return lines.join("\n");
  }

  // Step 2: Decode each calldata
  lines.push(`## Decoded Calls (${targets.length} target${targets.length > 1 ? "s" : ""})`);
  lines.push("");

  const decodedCalls: DecodedCall[] = [];
  let overallRisk = "LOW";

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const bytecode = bytecodes[i]!;
    const targetName = getContractName(target);
    const decoded = decodeCalldata(bytecode);

    const call: DecodedCall = {
      target,
      targetName,
      calldata: bytecode,
      functionName: decoded?.functionName || `unknown (${bytecode.slice(0, 10)})`,
      contractName: decoded?.contractName || "Unknown",
      args: decoded?.args || "(unable to decode)",
    };
    decodedCalls.push(call);

    const risk = classifyRisk(targetName, call.functionName);
    if (risk.level === "HIGH") overallRisk = "HIGH";
    else if (risk.level === "MEDIUM" && overallRisk !== "HIGH") overallRisk = "MEDIUM";

    lines.push(`### Call ${i + 1}: ${call.functionName}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Target | ${targetName} (\`${target}\`) |`);
    lines.push(`| ABI Match | ${call.contractName} |`);
    lines.push(`| Function | ${call.functionName} |`);
    lines.push(`| Arguments | ${call.args} |`);
    lines.push(`| Risk | **${risk.level}** - ${risk.reason} |`);
    lines.push("");
    lines.push("<details>");
    lines.push("<summary>Raw calldata</summary>");
    lines.push("");
    lines.push("```");
    lines.push(bytecode);
    lines.push("```");
    lines.push("</details>");
    lines.push("");
  }

  // Step 3: Simulate each call via eth_call
  lines.push(`## Simulation Results`);
  lines.push("");

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]! as Address;
    const bytecode = bytecodes[i]! as Hex;
    const call = decodedCalls[i]!;

    try {
      await publicClient.call({
        account: DAO_COMMITTEE_PROXY,
        to: target,
        data: bytecode,
      });
      lines.push(`- **Call ${i + 1}** (${call.functionName}): SUCCESS`);
    } catch (err) {
      const reason = err instanceof Error ? err.message.slice(0, 200) : String(err);
      lines.push(`- **Call ${i + 1}** (${call.functionName}): REVERTED - ${reason}`);
    }
  }
  lines.push("");

  // Step 4: Run fork test if agenda_id is available
  if (args.agenda_id) {
    lines.push(`## Fork Test`);
    lines.push("");

    try {
      const forkResult = await handleRunForkTest({
        test_pattern: "test_SimulateAgenda",
        contract_pattern: "AgendaSimulation",
        verbosity: 3,
        env_vars: { AGENDA_ID: args.agenda_id },
      });
      lines.push(forkResult);
    } catch (err) {
      lines.push(`Fork test failed: ${formatError(err)}`);
    }
    lines.push("");
  }

  // Step 5: Risk Assessment
  lines.push(`## Risk Assessment`);
  lines.push("");
  lines.push(`**Overall Risk Level: ${overallRisk}**`);
  lines.push("");

  if (atomicExecute) {
    lines.push("- Atomic execution: All calls succeed or all revert together");
  } else {
    lines.push("- Non-atomic: Each call executes independently (partial execution possible)");
  }
  lines.push("");

  for (const call of decodedCalls) {
    const risk = classifyRisk(call.targetName, call.functionName);
    lines.push(`- **${call.functionName}** on ${call.targetName}: ${risk.level} (${risk.reason})`);
  }

  return lines.join("\n");
}

export function registerAnalysisTool(server: McpServer) {
  server.tool(
    "analyze_agenda",
    "Analyze a DAO agenda or proposal. Decodes calldata, simulates execution, runs fork tests, and provides risk assessment. Provide either an on-chain agenda_id or manual targets+bytecodes.",
    {
      agenda_id: z
        .string()
        .optional()
        .describe("On-chain agenda ID number (e.g. '1', '42')"),
      targets: z
        .array(z.string())
        .optional()
        .describe("Array of target contract addresses"),
      function_bytecodes: z
        .array(z.string())
        .optional()
        .describe("Array of hex-encoded calldata for each target"),
      atomic_execute: z
        .boolean()
        .optional()
        .describe("Whether all calls should execute atomically (default: false)"),
    },
    async ({ agenda_id, targets, function_bytecodes, atomic_execute }) => {
      try {
        const text = await handleAnalyzeAgenda({ agenda_id, targets, function_bytecodes, atomic_execute });
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: `Error: ${formatError(err)}`,
          }],
          isError: true,
        };
      }
    }
  );
}
