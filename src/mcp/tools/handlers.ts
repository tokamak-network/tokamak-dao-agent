/**
 * Unified tool registry - shared between MCP server and web server
 *
 * Provides Anthropic API tool definitions and a single executeTool() dispatcher.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages.js";
import { handleGetContractInfo } from "./contract-info.ts";
import { handleReadContractSource, handleSearchContractCode } from "./contract-source.ts";
import { handleReadStorageSlot, handleReadContractState } from "./storage.ts";
import { handleQueryOnChain } from "./on-chain.ts";
import { handleFetchAgenda, handleDecodeCalldata } from "./governance.ts";
import { handleSimulateTransaction } from "./simulation.ts";

/**
 * Returns Anthropic API tool definitions for all 9 tools.
 */
export function getToolDefinitions(): Tool[] {
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
      name: "fetch_agenda",
      description:
        "Fetch a DAO agenda/proposal by ID. Returns status, votes, targets, decoded calldata, and voter list.",
      input_schema: {
        type: "object" as const,
        properties: {
          agenda_id: {
            type: "number",
            description: "Agenda ID (0-based)",
          },
          force_refresh: {
            type: "boolean",
            description: "Force on-chain refresh instead of using cache",
          },
        },
        required: ["agenda_id"],
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
  ];
}

/**
 * Execute a tool by name with the given arguments.
 * Returns the text result or throws on error.
 */
export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "get_contract_info":
      return handleGetContractInfo(args as any);
    case "read_contract_source":
      return handleReadContractSource(args as any);
    case "search_contract_code":
      return handleSearchContractCode(args as any);
    case "read_storage_slot":
      return handleReadStorageSlot(args as any);
    case "read_contract_state":
      return handleReadContractState(args as any);
    case "query_on_chain":
      return handleQueryOnChain(args as any);
    case "fetch_agenda":
      return handleFetchAgenda(args as any);
    case "decode_calldata":
      return handleDecodeCalldata(args as any);
    case "simulate_transaction":
      return handleSimulateTransaction(args as any);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
