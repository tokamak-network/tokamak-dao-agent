/**
 * decode_calldata tool
 */

import { z } from "zod";
import {
  decodeFunctionData,
  type Hex,
} from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getContractName, enrichAddress } from "../data/contracts.ts";
import { loadAllAbis } from "../data/abis.ts";

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
              let val = typeof a === "bigint" ? a.toString() : String(a);
              if (input?.type === "address" && /^0x[0-9a-fA-F]{40}$/.test(val)) {
                val = enrichAddress(val);
              }
              return `  ${name}: ${val}`;
            })
            .join("\n")
        : "  (no arguments)";

      results.push({
        contractName,
        functionName: decoded.functionName,
        args: argsStr,
      });
    } catch {
      // Expected: most ABIs won't match the selector — skip silently
    }
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
