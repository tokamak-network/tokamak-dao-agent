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
import { handleTestTokenTransfer } from "./verification.ts";
import { handleRunForkTest } from "./fork-test.ts";
import { handleWebFetch } from "./web-fetch.ts";
import { handleEncodeCalldata } from "./encode.ts";
import { handleListDaoActions } from "./dao-actions-tool.ts";
import { handleCheckUpgradePath } from "./upgrade-path.ts";
import { handleAnalyzeAgenda } from "./agenda-analysis.ts";

/**
 * Returns Anthropic API tool definitions for all tools.
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
      name: "test_token_transfer",
      description:
        "Test if a token's transferFrom works with a DEX router/vault. Simulates approve, transferFrom, and swap on-chain. Supports known DEXes (via 'dex') or any arbitrary router address (via 'router_address').",
      input_schema: {
        type: "object" as const,
        properties: {
          token_address: {
            type: "string",
            description: "Token contract address (0x...)",
          },
          dex: {
            type: "string",
            description: "Known DEX protocol key: uniswap_v2, uniswap_v3, sushiswap, cowswap. Either 'dex' or 'router_address' is required.",
          },
          router_address: {
            type: "string",
            description: "Any DEX router/vault/settlement contract address (0x...). Use this for DEXes not in the known registry.",
          },
          router_label: {
            type: "string",
            description: "Human-readable name for the router (e.g. 'Balancer Vault'). Used in output display.",
          },
          scenarios: {
            type: "array",
            items: { type: "string" },
            description:
              "Scenarios to test: approve, transferFrom, swap (defaults to all)",
          },
        },
        required: ["token_address"],
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
    {
      name: "encode_calldata",
      description:
        "Encode a function call into calldata for a DAO proposal. Returns target address and hex calldata.",
      input_schema: {
        type: "object" as const,
        properties: {
          contract_name: {
            type: "string",
            description: "Contract name (e.g. SeigManager, DepositManager)",
          },
          function_name: {
            type: "string",
            description: "Function name to encode (e.g. setDaoSeigRate, setSeigPerBlock)",
          },
          args: {
            type: "array",
            items: { type: "string" },
            description: "Function arguments as strings (e.g. ['5000000000000000000000000000'])",
          },
        },
        required: ["contract_name", "function_name"],
      },
    },
    {
      name: "list_dao_actions",
      description:
        "List all DAO-callable contracts and their governance functions. Use to discover what functions the DAO can call via proposals.",
      input_schema: {
        type: "object" as const,
        properties: {
          contract_name: {
            type: "string",
            description: "Filter by contract name (optional). If omitted, lists all contracts.",
          },
        },
      },
    },
    {
      name: "check_upgrade_path",
      description:
        "Check if a Tokamak proxy contract can be upgraded by the DAO. " +
        "Verifies on-chain admin roles, current implementation, and upgrade function availability.",
      input_schema: {
        type: "object" as const,
        properties: {
          contract: {
            type: "string",
            description:
              "Contract name or address (0x...). Accepts proxy name, implementation name, or raw address.",
          },
        },
        required: ["contract"],
      },
    },
    {
      name: "analyze_agenda",
      description:
        "Analyze a DAO agenda or proposal. Decodes calldata, simulates execution as DAOCommitteeProxy, runs fork tests, and provides risk assessment.",
      input_schema: {
        type: "object" as const,
        properties: {
          agenda_id: {
            type: "string",
            description: "On-chain agenda ID number (e.g. '1', '42')",
          },
          targets: {
            type: "array",
            items: { type: "string" },
            description: "Array of target contract addresses",
          },
          function_bytecodes: {
            type: "array",
            items: { type: "string" },
            description: "Array of hex-encoded calldata for each target",
          },
          atomic_execute: {
            type: "boolean",
            description: "Whether all calls should execute atomically (default: false)",
          },
        },
      },
    },
    {
      name: "web_fetch",
      description:
        "Fetch data from trusted DeFi APIs. Use to look up DEX router addresses, protocol info, or token data. Allowed domains: api.llama.fi, api.etherscan.io, api.dexscreener.com, api.coingecko.com.",
      input_schema: {
        type: "object" as const,
        properties: {
          url: {
            type: "string",
            description: "HTTPS URL to fetch. Must be from an allowed domain.",
          },
        },
        required: ["url"],
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
  test_token_transfer: { token_address: string; dex?: string; router_address?: string; router_label?: string; scenarios?: string[] };
  run_fork_test: { test_pattern: string; contract_pattern?: string; verbosity?: number };
  encode_calldata: { contract_name: string; function_name: string; args?: string[] };
  list_dao_actions: { contract_name?: string };
  check_upgrade_path: { contract: string };
  analyze_agenda: { agenda_id?: string; targets?: string[]; function_bytecodes?: string[]; atomic_execute?: boolean };
  web_fetch: { url: string };
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
    case "test_token_transfer":
      return handleTestTokenTransfer(args as ToolArgsMap["test_token_transfer"]);
    case "run_fork_test":
      return handleRunForkTest(args as ToolArgsMap["run_fork_test"]);
    case "encode_calldata":
      return handleEncodeCalldata(args as ToolArgsMap["encode_calldata"]);
    case "list_dao_actions":
      return handleListDaoActions(args as ToolArgsMap["list_dao_actions"]);
    case "check_upgrade_path":
      return handleCheckUpgradePath(args as ToolArgsMap["check_upgrade_path"]);
    case "analyze_agenda":
      return handleAnalyzeAgenda(args as ToolArgsMap["analyze_agenda"]);
    case "web_fetch":
      return handleWebFetch(args as ToolArgsMap["web_fetch"]);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
