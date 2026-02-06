/**
 * simulate_transaction tool - Simulate transactions via eth_call or Anvil fork
 */

import { z } from "zod";
import {
  decodeFunctionResult,
  keccak256,
  toBytes,
  type Address,
  type Hex,
  formatEther,
} from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import { getContractName } from "../data/contracts.ts";
import { loadAllAbis } from "../data/abis.ts";
import { validateAddress, validateHex, safeParseBigInt, validateBlockNumber } from "./validation.ts";

/**
 * Try to decode return data using known ABIs.
 */
function tryDecodeReturn(data: Hex, calldata: Hex): string | null {
  const selector = calldata.slice(0, 10);
  const allAbis = loadAllAbis();

  for (const [, abi] of allAbis) {
    for (const item of abi) {
      if (item.type !== "function") continue;
      try {
        // Quick selector check
        const sig = `${item.name}(${(item.inputs || []).map((i: any) => i.type).join(",")})`;
        const hash = keccak256(toBytes(sig));
        if (hash.slice(0, 10) !== selector) continue;

        const result = decodeFunctionResult({
          abi: [item],
          functionName: item.name,
          data,
        });
        if (typeof result === "bigint") return result.toString();
        if (Array.isArray(result)) return result.map((r) => typeof r === "bigint" ? r.toString() : String(r)).join(", ");
        return String(result);
      } catch {}
    }
  }
  return null;
}

export async function handleSimulateTransaction(args: {
  to: string;
  calldata: string;
  from?: string;
  value?: string;
  block_number?: number;
}): Promise<string> {
  // Validate 'to' address
  const toError = validateAddress(args.to);
  if (toError) {
    return `Error: ${toError}`;
  }

  // Validate 'from' address if provided
  if (args.from) {
    const fromError = validateAddress(args.from);
    if (fromError) {
      return `Error (from): ${fromError}`;
    }
  }

  // Validate calldata is valid hex
  const calldataError = validateHex(args.calldata, "calldata");
  if (calldataError) {
    return `Error: ${calldataError}`;
  }

  // Validate value if provided
  let ethValue = 0n;
  if (args.value) {
    const parsed = safeParseBigInt(args.value);
    if (parsed === null) {
      return `Error: Invalid value '${args.value}'. Must be a valid integer (wei).`;
    }
    ethValue = parsed;
  }

  // Validate block_number if provided
  if (args.block_number !== undefined) {
    const blockError = validateBlockNumber(args.block_number);
    if (blockError) {
      return `Error: ${blockError}`;
    }
  }

  const sender = (args.from || "0x0000000000000000000000000000000000000001") as Address;
  const target = args.to as Address;
  const data = args.calldata as Hex;

  const lines: string[] = [
    `## Transaction Simulation`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| To | ${getContractName(args.to)} (${args.to}) |`,
    `| From | ${sender} |`,
    `| Value | ${ethValue > 0n ? `${formatEther(ethValue)} ETH` : "0"} |`,
    `| Calldata | ${data.slice(0, 10)}... (${(data.length - 2) / 2} bytes) |`,
    args.block_number ? `| Block | ${args.block_number} |` : `| Block | latest |`,
    "",
  ];

  try {
    const gasEstimate = await publicClient.estimateGas({
      account: sender,
      to: target,
      data,
      value: ethValue,
      ...(args.block_number ? { blockNumber: BigInt(args.block_number) } : {}),
    });
    lines.push(`### Gas Estimate: ${gasEstimate.toString()}`);
    lines.push("");
  } catch (err) {
    lines.push(`### Gas Estimate: Failed (${err instanceof Error ? err.message.slice(0, 200) : "unknown error"})`);
    lines.push("");
  }

  try {
    const result = await publicClient.call({
      account: sender,
      to: target,
      data,
      value: ethValue,
      ...(args.block_number ? { blockNumber: BigInt(args.block_number) } : {}),
    });

    lines.push(`### Result: SUCCESS`);

    if (result.data) {
      lines.push(`**Return data**: ${result.data}`);
      const decoded = tryDecodeReturn(result.data, data);
      if (decoded) {
        lines.push(`**Decoded**: ${decoded}`);
      }
    }
  } catch (err: any) {
    lines.push(`### Result: REVERTED`);
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("revert")) {
      const revertMatch = message.match(/reverted with reason string '([^']+)'/);
      if (revertMatch) {
        lines.push(`**Revert reason**: ${revertMatch[1]}`);
      } else {
        lines.push(`**Error**: ${message.slice(0, 500)}`);
      }
    } else {
      lines.push(`**Error**: ${message.slice(0, 500)}`);
    }
  }

  return lines.join("\n");
}

export function registerSimulationTool(server: McpServer) {
  server.tool(
    "simulate_transaction",
    "Simulate a transaction against mainnet state using eth_call. Returns success/failure, gas estimate, and decoded return data. Does not modify state.",
    {
      to: z.string().describe("Target contract address (0x...)"),
      calldata: z.string().describe("Hex-encoded calldata (0x...)"),
      from: z.string().optional().describe("Sender address (defaults to zero address)"),
      value: z.string().optional().describe("ETH value in wei (e.g. '1000000000000000000' for 1 ETH)"),
      block_number: z.number().int().min(1).optional().describe("Block number to simulate at (defaults to latest, must be >= 1)"),
    },
    async ({ to, calldata, from, value, block_number }) => {
      const text = await handleSimulateTransaction({ to, calldata, from, value, block_number });
      return { content: [{ type: "text" as const, text }] };
    }
  );
}
