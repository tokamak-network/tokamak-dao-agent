/**
 * Unified tool registry - shared between MCP server and web server
 *
 * Provides Anthropic API tool definitions and a single executeTool() dispatcher.
 */

import type { ToolDefinition } from "../../web/providers/types.ts";
import { handleGetContractInfo } from "./contract-info.ts";
import { handleReadContractSource, handleSearchContractCode } from "./contract-source.ts";
import { handleReadStorageSlot, handleReadContractState } from "./storage.ts";
import { handleQueryOnChain } from "./on-chain.ts";
import { handleDecodeCalldata } from "./governance.ts";
import { handleSimulateTransaction } from "./simulation.ts";
import { handleVerifyTokenCompatibility } from "./verification.ts";
import { handleRunForkTest } from "./fork-test.ts";

/**
 * Returns Anthropic API tool definitions for all 10 tools.
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "get_contract_info",
      description:
        "Search Tokamak Network contracts by name or address. Returns address, type, proxy relationships, and related contracts.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Contract name (partial match) or address (0x...)",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "read_contract_source",
      description:
        "Read Solidity source code for a Tokamak contract. Without file_path, lists all files. With file_path, returns source code.",
      input_schema: {
        type: "object" as const,
        properties: {
          contract_name: {
            type: "string",
            description: "Contract directory name (e.g. SeigManagerV1_3, DepositManager)",
          },
          file_path: {
            type: "string",
            description: "Relative path within the contract directory",
          },
        },
        required: ["contract_name"],
      },
    },
    {
      name: "search_contract_code",
      description:
        "Search Solidity source code across all Tokamak contracts. Returns matching lines with file paths and line numbers.",
      input_schema: {
        type: "object" as const,
        properties: {
          pattern: {
            type: "string",
            description: "Text pattern to search for (case-insensitive substring match)",
          },
          contract_name: {
            type: "string",
            description: "Limit search to a specific contract directory",
          },
        },
        required: ["pattern"],
      },
    },
    {
      name: "read_storage_slot",
      description:
        "Read a raw storage slot from any Ethereum contract. Optionally decode the value.",
      input_schema: {
        type: "object" as const,
        properties: {
          address: {
            type: "string",
            description: "Contract address (0x...)",
          },
          slot: {
            type: "string",
            description: "Storage slot number or hex (e.g. '5' or '0x05')",
          },
          decode_as: {
            type: "string",
            enum: ["uint256", "address", "bool", "bytes32", "raw"],
            description: "How to decode the raw value",
          },
          mapping_key: {
            type: "string",
            description: "If the slot is a mapping, provide the key to compute the actual slot",
          },
        },
        required: ["address", "slot"],
      },
    },
    {
      name: "read_contract_state",
      description:
        "Read and decode all storage variables of a known Tokamak contract using its storage layout.",
      input_schema: {
        type: "object" as const,
        properties: {
          contract_name: {
            type: "string",
            description: "Contract name (e.g. SeigManager, DepositManager, DAOAgendaManager)",
          },
          variables: {
            type: "array",
            items: { type: "string" },
            description: "Specific variable names to read. If omitted, reads all simple variables.",
          },
        },
        required: ["contract_name"],
      },
    },
    {
      name: "query_on_chain",
      description:
        "Call a view/pure function on a Tokamak Network contract. Returns the decoded result.",
      input_schema: {
        type: "object" as const,
        properties: {
          contract_name: {
            type: "string",
            description: "Contract name (e.g. SeigManager, DAOAgendaManager, TON)",
          },
          function_name: {
            type: "string",
            description: "Function name to call (e.g. seigPerBlock, numAgendas)",
          },
          args: {
            type: "array",
            items: { type: "string" },
            description: "Function arguments as strings",
          },
        },
        required: ["contract_name", "function_name"],
      },
    },
    {
      name: "decode_calldata",
      description:
        "Decode raw calldata (transaction data) using known Tokamak contract ABIs. Returns function name and parameters.",
      input_schema: {
        type: "object" as const,
        properties: {
          calldata: {
            type: "string",
            description: "Hex-encoded calldata (0x...)",
          },
          target_address: {
            type: "string",
            description: "Target contract address for context",
          },
        },
        required: ["calldata"],
      },
    },
    {
      name: "simulate_transaction",
      description:
        "Simulate a transaction against mainnet state using eth_call. Returns success/failure, gas estimate, and decoded return data.",
      input_schema: {
        type: "object" as const,
        properties: {
          to: {
            type: "string",
            description: "Target contract address (0x...)",
          },
          calldata: {
            type: "string",
            description: "Hex-encoded calldata (0x...)",
          },
          from: {
            type: "string",
            description: "Sender address (defaults to zero address)",
          },
          value: {
            type: "string",
            description: "ETH value in wei",
          },
          block_number: {
            type: "number",
            description: "Block number to simulate at (defaults to latest)",
          },
        },
        required: ["to", "calldata"],
      },
    },
    {
      name: "verify_token_compatibility",
      description:
        "Verify if a token is compatible with a DEX by simulating approve, transferFrom, and swap on-chain. " +
        "BEFORE calling: 1) Confirm the DEX exists on Ethereum mainnet (web search), " +
        "2) Find the router address from official docs, " +
        "3) Determine V2 or V3 interface. " +
        "If the DEX does not exist, do NOT call this tool.",
      input_schema: {
        type: "object" as const,
        properties: {
          token_address: {
            type: "string",
            description: "Token contract address (0x...)",
          },
          router_address: {
            type: "string",
            description: "DEX router contract address (0x...) — discovered by the agent via web search",
          },
          dex_name: {
            type: "string",
            description: "DEX display name (e.g. 'SushiSwap', 'Uniswap V2')",
          },
          dex_version: {
            type: "string",
            enum: ["v2", "v3"],
            description: "Router interface version: 'v2' (swapExactTokensForTokens) or 'v3' (exactInputSingle). Defaults to 'v2'.",
          },
          scenarios: {
            type: "array",
            items: { type: "string" },
            description:
              "Scenarios to test: approve, transferFrom, swap (defaults to all)",
          },
        },
        required: ["token_address", "router_address", "dex_name"],
      },
    },
    {
      name: "run_fork_test",
      description:
        "Run Foundry fork tests against Ethereum mainnet. Verifies on-chain behavior with real state.",
      input_schema: {
        type: "object" as const,
        properties: {
          test_pattern: {
            type: "string",
            description:
              "Test function name pattern (e.g. 'test_TON_UniswapV2')",
          },
          contract_pattern: {
            type: "string",
            description: "Contract name pattern to filter",
          },
          verbosity: {
            type: "number",
            description: "Output verbosity 1-5 (default: 3)",
          },
        },
        required: ["test_pattern"],
      },
    },
  ];
}

/**
 * Type-safe argument map for each tool handler.
 * Keeps executeTool free of `as any` casts while adding compile-time checks.
 */
interface ToolArgsMap {
  get_contract_info: { query: string };
  read_contract_source: { contract_name: string; file_path?: string };
  search_contract_code: { pattern: string; contract_name?: string };
  read_storage_slot: { address: string; slot: string; decode_as?: "uint256" | "address" | "bool" | "bytes32" | "raw"; mapping_key?: string };
  read_contract_state: { contract_name: string; variables?: string[] };
  query_on_chain: { contract_name: string; function_name: string; args?: string[] };
  decode_calldata: { calldata: string; target_address?: string };
  simulate_transaction: { to: string; calldata: string; from?: string; value?: string; block_number?: number };
  verify_token_compatibility: { token_address: string; router_address: string; dex_name: string; dex_version?: string; scenarios?: string[] };
  run_fork_test: { test_pattern: string; contract_pattern?: string; verbosity?: number };
}

/**
 * Execute a tool by name with the given arguments.
 * Returns the text result or throws on error.
 */
export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "get_contract_info":
      return handleGetContractInfo(args as ToolArgsMap["get_contract_info"]);
    case "read_contract_source":
      return handleReadContractSource(args as ToolArgsMap["read_contract_source"]);
    case "search_contract_code":
      return handleSearchContractCode(args as ToolArgsMap["search_contract_code"]);
    case "read_storage_slot":
      return handleReadStorageSlot(args as ToolArgsMap["read_storage_slot"]);
    case "read_contract_state":
      return handleReadContractState(args as ToolArgsMap["read_contract_state"]);
    case "query_on_chain":
      return handleQueryOnChain(args as ToolArgsMap["query_on_chain"]);
    case "decode_calldata":
      return handleDecodeCalldata(args as ToolArgsMap["decode_calldata"]);
    case "simulate_transaction":
      return handleSimulateTransaction(args as ToolArgsMap["simulate_transaction"]);
    case "verify_token_compatibility":
      return handleVerifyTokenCompatibility(args as ToolArgsMap["verify_token_compatibility"]);
    case "run_fork_test":
      return handleRunForkTest(args as ToolArgsMap["run_fork_test"]);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
