/**
 * query_on_chain tool - Call view/pure functions on contracts
 */

import { z } from "zod";
import { type Address } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import { getContractByName, getAllContracts } from "../data/contracts.ts";
import { loadAbi, getViewFunctions } from "../data/abis.ts";

/**
 * Parse a string argument into the appropriate type for viem.
 */
function parseArg(value: string, abiType: string): any {
  if (abiType === "bool") return value === "true";
  if (abiType.startsWith("uint") || abiType.startsWith("int")) return BigInt(value);
  if (abiType === "address") return value as Address;
  if (abiType.startsWith("bytes")) return value;
  return value;
}

/**
 * Format a return value to a readable string.
 */
function formatResult(value: any): string {
  if (value === undefined || value === null) return "null";
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(formatResult).join(", ");
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([k]) => isNaN(Number(k))) // Skip numeric indices from tuples
      .map(([k, v]) => `${k}: ${formatResult(v)}`);
    return entries.length > 0 ? `{ ${entries.join(", ")} }` : String(value);
  }
  return String(value);
}

export async function handleQueryOnChain(args: {
  contract_name: string;
  function_name: string;
  args?: string[];
}): Promise<string> {
  const contract = getContractByName(args.contract_name);
  if (!contract) {
    return `Contract "${args.contract_name}" not found. Available: ${getAllContracts().map((c) => c.name).join(", ")}`;
  }

  let callAddress = contract.address as Address;
  if (contract.type === "implementation") {
    const proxy = getAllContracts().find(
      (c) => c.implementation?.toLowerCase() === contract.address.toLowerCase()
    );
    if (proxy) {
      callAddress = proxy.address as Address;
    }
  }

  const namesToTry = [args.contract_name, contract.name];
  const baseName = contract.name.replace(/V\d+_?\d*$/, "");
  if (baseName !== contract.name) namesToTry.push(baseName);

  let abi: any[] | null = null;
  let abiSource = "";
  for (const name of namesToTry) {
    abi = loadAbi(name);
    if (abi) {
      abiSource = name;
      break;
    }
  }

  if (!abi) {
    return `No ABI found for "${args.contract_name}". Compiled ABIs are in contracts/out/.`;
  }

  const fnAbi = abi.find(
    (item: any) => item.type === "function" && item.name === args.function_name
  );

  if (!fnAbi) {
    const viewFns = getViewFunctions(abi).map((f: any) => f.name);
    return `Function "${args.function_name}" not found in ${abiSource} ABI.\n\nAvailable view functions:\n${viewFns.join("\n")}`;
  }

  const parsedArgs: any[] = [];
  if (args.args && fnAbi.inputs) {
    for (let i = 0; i < args.args.length; i++) {
      const inputType = fnAbi.inputs[i]?.type || "string";
      parsedArgs.push(parseArg(args.args[i]!, inputType));
    }
  }

  try {
    const result = await publicClient.readContract({
      address: callAddress,
      abi: [fnAbi],
      functionName: args.function_name,
      args: parsedArgs.length > 0 ? parsedArgs : undefined,
    });

    const lines = [
      `## ${args.contract_name}.${args.function_name}(${args.args?.join(", ") || ""})`,
      `**Contract**: ${callAddress}${callAddress !== contract.address ? ` (proxy for ${contract.address})` : ""}`,
      `**Result**: ${formatResult(result)}`,
    ];

    return lines.join("\n");
  } catch (err) {
    throw new Error(`Error calling ${args.function_name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function registerOnChainTool(server: McpServer) {
  server.tool(
    "query_on_chain",
    "Call a view/pure function on a Tokamak Network contract. Returns the decoded result.",
    {
      contract_name: z.string().describe("Contract name (e.g. SeigManager, DAOAgendaManager, TON)"),
      function_name: z.string().describe("Function name to call (e.g. seigPerBlock, numAgendas)"),
      args: z.array(z.string()).optional().describe("Function arguments as strings (e.g. ['0x...', '42'])"),
    },
    async ({ contract_name, function_name, args }) => {
      try {
        const text = await handleQueryOnChain({ contract_name, function_name, args });
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [{
            type: "text" as const,
            text: err instanceof Error ? err.message : String(err),
          }],
          isError: true,
        };
      }
    }
  );
}
