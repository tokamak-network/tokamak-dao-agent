/**
 * query_on_chain tool - Call view/pure functions on contracts
 */

import { z } from "zod";
import { type Address } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import { getContractByName, getAllContracts } from "../data/contracts.ts";
import { loadAbi, getViewFunctions } from "../data/abis.ts";
import { safeParseBigInt } from "./validation.ts";

/**
 * Parse a string argument into the appropriate type for viem.
 * Returns { value, error } to handle parsing failures gracefully.
 */
function parseArg(value: string, abiType: string, argName: string): { value: any; error: string | null } {
  if (abiType === "bool") {
    return { value: value === "true", error: null };
  }
  if (abiType.startsWith("uint") || abiType.startsWith("int")) {
    const parsed = safeParseBigInt(value);
    if (parsed === null) {
      return { value: null, error: `Cannot parse '${value}' as ${abiType} for argument '${argName}'` };
    }
    return { value: parsed, error: null };
  }
  if (abiType === "address") {
    return { value: value as Address, error: null };
  }
  if (abiType.startsWith("bytes")) {
    return { value: value, error: null };
  }
  return { value: value, error: null };
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

  // Validate argument count
  const expectedArgCount = fnAbi.inputs?.length || 0;
  const providedArgCount = args.args?.length || 0;
  if (providedArgCount !== expectedArgCount) {
    return `Argument count mismatch for ${args.function_name}: expected ${expectedArgCount}, got ${providedArgCount}.\n\nExpected inputs: ${fnAbi.inputs?.map((i: any) => `${i.name}: ${i.type}`).join(", ") || "(none)"}`;
  }

  const parsedArgs: any[] = [];
  if (args.args && fnAbi.inputs) {
    for (let i = 0; i < args.args.length; i++) {
      const input = fnAbi.inputs[i];
      const inputType = input?.type || "string";
      const inputName = input?.name || `arg${i}`;
      const result = parseArg(args.args[i]!, inputType, inputName);
      if (result.error) {
        return `Error parsing arguments: ${result.error}`;
      }
      parsedArgs.push(result.value);
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
