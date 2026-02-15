/**
 * encode_calldata tool - Encode function calls into calldata
 *
 * Used by the Generate Calldata tab to generate targets + calldata
 * from contract name, function name, and arguments.
 */

import { z } from "zod";
import { encodeFunctionData, type Address, type Hex } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getContractByName, resolveCallAddress } from "../data/contracts.ts";
import { loadAbi } from "../data/abis.ts";
import { getDaoActionAbi, findDaoAction } from "../data/dao-actions.ts";
import { safeParseBigInt, formatError } from "./validation.ts";

/**
 * Parse a string argument into the appropriate type for viem.
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

export async function handleEncodeCalldata(args: {
  contract_name: string;
  function_name: string;
  args?: string[];
}): Promise<string> {
  // 1st: Try DAO actions registry (governance-callable functions)
  const daoAction = findDaoAction(args.contract_name);
  let abi: any[] | null = daoAction ? daoAction.abi : null;
  let abiSource = daoAction ? `DAO:${daoAction.name}` : "";
  let callAddress: Address | null = daoAction ? (daoAction.address as Address) : null;

  // 2nd: Fallback to contracts.json + contracts/out/
  const contract = getContractByName(args.contract_name);
  if (!abi) {
    if (!contract) {
      return `Contract "${args.contract_name}" not found in DAO registry or contracts.json. Use get_contract_info to search, or list_dao_actions to see callable functions.`;
    }

    const namesToTry = [args.contract_name, contract.name];
    const baseName = contract.name.replace(/V\d+_?\d*$/, "");
    if (baseName !== contract.name) namesToTry.push(baseName);

    for (const name of namesToTry) {
      abi = loadAbi(name);
      if (abi) {
        abiSource = name;
        break;
      }
    }
  }

  // Resolve call address: DAO registry address > contract registry proxy
  if (!callAddress && contract) {
    callAddress = resolveCallAddress(contract) as Address;
  }

  if (!abi) {
    return `No ABI found for "${args.contract_name}". Use list_dao_actions to see DAO-callable functions.`;
  }
  if (!callAddress) {
    return `No target address resolved for "${args.contract_name}".`;
  }

  // Find the function in ABI
  const fnAbi = abi.find(
    (item: any) => item.type === "function" && item.name === args.function_name
  );

  if (!fnAbi) {
    const writeFns = abi
      .filter((item: any) => item.type === "function" && item.stateMutability !== "view" && item.stateMutability !== "pure")
      .map((f: any) => `${f.name}(${(f.inputs || []).map((i: any) => `${i.type} ${i.name}`).join(", ")})`);
    return `Function "${args.function_name}" not found in ${abiSource} ABI.\n\nAvailable write functions:\n${writeFns.join("\n")}`;
  }

  // Validate argument count
  const expectedArgCount = fnAbi.inputs?.length || 0;
  const providedArgCount = args.args?.length || 0;
  if (providedArgCount !== expectedArgCount) {
    return `Argument count mismatch for ${args.function_name}: expected ${expectedArgCount}, got ${providedArgCount}.\n\nExpected inputs: ${fnAbi.inputs?.map((i: any) => `${i.name}: ${i.type}`).join(", ") || "(none)"}`;
  }

  // Parse arguments
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
    const calldata = encodeFunctionData({
      abi: [fnAbi],
      functionName: args.function_name,
      args: parsedArgs.length > 0 ? parsedArgs : undefined,
    });

    // Build readable summary
    const argsSummary = fnAbi.inputs?.length > 0
      ? fnAbi.inputs.map((input: any, i: number) => {
        const val = args.args?.[i] ?? "";
        return `  ${input.name} (${input.type}): ${val}`;
      }).join("\n")
      : "  (no arguments)";

    const contractName = daoAction?.name ?? contract?.name ?? args.contract_name;
    const contractAddr = contract?.address;

    const lines = [
      `## Encoded Calldata`,
      "",
      `**Contract**: ${contractName} (${abiSource} ABI)`,
      `**Target**: ${callAddress}${contractAddr && callAddress !== contractAddr ? ` (proxy for ${contractAddr})` : ""}`,
      `**Function**: ${args.function_name}`,
      "",
      `### Arguments`,
      argsSummary,
      "",
      `### Calldata`,
      "```",
      calldata,
      "```",
      "",
      `### Proposal Fragment`,
      "```json",
      JSON.stringify({
        target: callAddress,
        calldata: calldata,
        function: `${args.function_name}(${(fnAbi.inputs || []).map((i: any) => i.type).join(",")})`,
        description: `Call ${args.function_name} on ${contractName}`,
      }, null, 2),
      "```",
    ];

    return lines.join("\n");
  } catch (err) {
    return `Error encoding calldata: ${formatError(err)}`;
  }
}

export function registerEncodeTool(server: McpServer) {
  server.tool(
    "encode_calldata",
    "Encode a function call into calldata for a Tokamak Network contract. Returns the target address and hex calldata for use in DAO proposals.",
    {
      contract_name: z.string().describe("Contract name (e.g. SeigManager, DepositManager)"),
      function_name: z.string().describe("Function name to encode (e.g. setSeigPerBlock, setMinimumAmount)"),
      args: z.array(z.string()).optional().describe("Function arguments as strings (e.g. ['5000000000000000000000000000'])"),
    },
    async ({ contract_name, function_name, args }) => {
      try {
        const text = await handleEncodeCalldata({ contract_name, function_name, args });
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
