/**
 * Contract Analysis Script
 * Fetches ABI, source code, and on-chain state from Etherscan and Alchemy
 *
 * Usage: bun run scripts/analyze-contracts.ts [network]
 * Networks: mainnet (default), sepolia
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// Network configuration
const NETWORK = process.argv[2] || "mainnet";

const NETWORK_CONFIG: Record<string, { chainId: number; etherscanBase: string; alchemyEnvVar: string }> = {
  mainnet: {
    chainId: 1,
    etherscanBase: "https://api.etherscan.io/v2/api",
    alchemyEnvVar: "ALCHEMY_RPC_URL",
  },
  sepolia: {
    chainId: 11155111,
    etherscanBase: "https://api.etherscan.io/v2/api",
    alchemyEnvVar: "ALCHEMY_SEPOLIA_URL",
  },
};

if (!NETWORK_CONFIG[NETWORK]) {
  console.error(`Unknown network: ${NETWORK}. Available: mainnet, sepolia`);
  process.exit(1);
}

// Validate required environment variables
const config = NETWORK_CONFIG[NETWORK];
const ALCHEMY_RPC_URL = process.env[config.alchemyEnvVar];
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

if (!ALCHEMY_RPC_URL) {
  console.error(`Error: ${config.alchemyEnvVar} environment variable is required`);
  process.exit(1);
}

if (!ETHERSCAN_API_KEY) {
  console.error("Error: ETHERSCAN_API_KEY environment variable is required");
  process.exit(1);
}

// Types
interface ContractInfo {
  name: string;
  address: string;
  type: string;
  docId: string;
  description: string;
  implementation?: string;
}

interface ContractData {
  coreTokens: ContractInfo[];
  simpleStakingV2: ContractInfo[];
  layerOperators: ContractInfo[];
  daoContracts: ContractInfo[];
  multiSig: ContractInfo[];
}

interface EtherscanSourceResult {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
}

interface AnalyzedContract {
  name: string;
  address: string;
  type: string;
  docId: string;
  description: string;
  implementation?: string;
  abi: unknown[];
  sourceCode: string;
  contractName: string;
  compilerVersion: string;
  isProxy: boolean;
  implementationAddress?: string;
  functions: FunctionInfo[];
  events: EventInfo[];
  stateVariables: StateVariable[];
  onChainState: Record<string, unknown>;
}

interface FunctionInfo {
  name: string;
  signature: string;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
  stateMutability: string;
  description?: string;
}

interface EventInfo {
  name: string;
  signature: string;
  inputs: { name: string; type: string; indexed: boolean }[];
}

interface StateVariable {
  name: string;
  type: string;
  value?: string;
}

// Config based on network
const { chainId: CHAIN_ID, etherscanBase: ETHERSCAN_API_BASE } = NETWORK_CONFIG[NETWORK];
const OUTPUT_DIR = join(import.meta.dir, NETWORK, "output");
const CONTRACTS_FILE = join(import.meta.dir, NETWORK, "contracts.json");

// Rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Safely parse ABI string
 */
function safeParseABI(abiString: string | undefined): unknown[] {
  if (!abiString || abiString.trim() === "" || abiString.startsWith("Contract source code not verified")) {
    return [];
  }
  try {
    return JSON.parse(abiString);
  } catch {
    return [];
  }
}

/**
 * Fetch contract source and ABI from Etherscan
 */
async function fetchContractSource(address: string): Promise<EtherscanSourceResult | null> {
  const url = `${ETHERSCAN_API_BASE}?chainid=${CHAIN_ID}&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json() as { status: string; result: EtherscanSourceResult[] };

    if (data.status === "1" && data.result.length > 0) {
      return data.result[0];
    }
    console.error(`Failed to fetch source for ${address}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching source for ${address}:`, error);
    return null;
  }
}

/**
 * Parse ABI to extract functions and events
 */
function parseABI(abiString: string): { functions: FunctionInfo[]; events: EventInfo[] } {
  const functions: FunctionInfo[] = [];
  const events: EventInfo[] = [];

  // Handle empty or invalid ABI strings
  if (!abiString || abiString.trim() === "" || abiString.startsWith("Contract source code not verified")) {
    return { functions, events };
  }

  try {
    const abi = JSON.parse(abiString) as unknown[];

    for (const item of abi) {
      if (typeof item !== "object" || item === null) continue;
      const entry = item as Record<string, unknown>;

      if (entry.type === "function") {
        const inputs = (entry.inputs as { name: string; type: string }[] || []);
        const outputs = (entry.outputs as { name: string; type: string }[] || []);
        const inputTypes = inputs.map((i) => i.type).join(",");

        functions.push({
          name: entry.name as string,
          signature: `${entry.name}(${inputTypes})`,
          inputs,
          outputs,
          stateMutability: entry.stateMutability as string || "nonpayable",
        });
      } else if (entry.type === "event") {
        const inputs = (entry.inputs as { name: string; type: string; indexed: boolean }[] || []);
        const inputTypes = inputs.map((i) => i.type).join(",");

        events.push({
          name: entry.name as string,
          signature: `${entry.name}(${inputTypes})`,
          inputs,
        });
      }
    }
  } catch (error) {
    console.error("Failed to parse ABI:", error);
  }

  return { functions, events };
}

/**
 * Call a read-only contract function via Alchemy
 */
async function callContractFunction(
  address: string,
  functionSignature: string,
  args: string[] = []
): Promise<string | null> {
  // Encode function call
  const functionSelector = functionSignature.slice(0, 10);
  const data = functionSelector + args.map((a) => a.padStart(64, "0")).join("");

  try {
    const response = await fetch(ALCHEMY_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: address, data }, "latest"],
        id: 1,
      }),
    });

    const result = await response.json() as { result?: string; error?: unknown };
    return result.result || null;
  } catch (error) {
    console.error(`Error calling ${functionSignature} on ${address}:`, error);
    return null;
  }
}

/**
 * Get basic token info (name, symbol, decimals, totalSupply)
 */
async function getTokenInfo(address: string): Promise<Record<string, unknown>> {
  const info: Record<string, unknown> = {};

  // name()
  const name = await callContractFunction(address, "0x06fdde03");
  if (name && name !== "0x") {
    try {
      // Decode string
      const hex = name.slice(2);
      const offset = parseInt(hex.slice(0, 64), 16);
      const length = parseInt(hex.slice(offset * 2, offset * 2 + 64), 16);
      const nameHex = hex.slice(offset * 2 + 64, offset * 2 + 64 + length * 2);
      info.name = Buffer.from(nameHex, "hex").toString("utf8");
    } catch {
      info.name = "Unable to decode";
    }
  }

  // symbol()
  const symbol = await callContractFunction(address, "0x95d89b41");
  if (symbol && symbol !== "0x") {
    try {
      const hex = symbol.slice(2);
      const offset = parseInt(hex.slice(0, 64), 16);
      const length = parseInt(hex.slice(offset * 2, offset * 2 + 64), 16);
      const symbolHex = hex.slice(offset * 2 + 64, offset * 2 + 64 + length * 2);
      info.symbol = Buffer.from(symbolHex, "hex").toString("utf8");
    } catch {
      info.symbol = "Unable to decode";
    }
  }

  // decimals()
  const decimals = await callContractFunction(address, "0x313ce567");
  if (decimals && decimals !== "0x") {
    info.decimals = parseInt(decimals, 16);
  }

  // totalSupply()
  const totalSupply = await callContractFunction(address, "0x18160ddd");
  if (totalSupply && totalSupply !== "0x") {
    info.totalSupply = BigInt(totalSupply).toString();
  }

  return info;
}

/**
 * Get owner/admin info
 */
async function getOwnerInfo(address: string): Promise<Record<string, unknown>> {
  const info: Record<string, unknown> = {};

  // owner()
  const owner = await callContractFunction(address, "0x8da5cb5b");
  if (owner && owner !== "0x" && owner.length >= 66) {
    info.owner = "0x" + owner.slice(-40);
  }

  // paused()
  const paused = await callContractFunction(address, "0x5c975abb");
  if (paused && paused !== "0x") {
    info.paused = paused !== "0x0000000000000000000000000000000000000000000000000000000000000000";
  }

  return info;
}

/**
 * Analyze a single contract
 */
async function analyzeContract(contract: ContractInfo): Promise<AnalyzedContract | null> {
  console.log(`Analyzing ${contract.name} (${contract.address})...`);

  // Fetch source code
  const source = await fetchContractSource(contract.address);
  if (!source) {
    console.error(`Failed to fetch source for ${contract.name}`);
    return null;
  }

  await delay(250); // Rate limiting for Etherscan API

  // Parse ABI
  const { functions, events } = parseABI(source.ABI);

  // Get on-chain state
  const onChainState: Record<string, unknown> = {};

  // Token info for token contracts
  if (contract.type === "token") {
    const tokenInfo = await getTokenInfo(contract.address);
    Object.assign(onChainState, tokenInfo);
    await delay(500);
  }

  // Owner info
  const ownerInfo = await getOwnerInfo(contract.address);
  Object.assign(onChainState, ownerInfo);

  // Check if it's a proxy and get implementation
  let implementationAddress = contract.implementation;
  if (source.Proxy === "1" && source.Implementation) {
    implementationAddress = source.Implementation;
  }

  // If proxy, also analyze implementation
  let implementationFunctions: FunctionInfo[] = [];
  let implementationEvents: EventInfo[] = [];

  if (implementationAddress && implementationAddress !== contract.address) {
    console.log(`  Fetching implementation at ${implementationAddress}...`);
    const implSource = await fetchContractSource(implementationAddress);
    if (implSource) {
      const implParsed = parseABI(implSource.ABI);
      implementationFunctions = implParsed.functions;
      implementationEvents = implParsed.events;
    }
    await delay(250);
  }

  // Merge functions and events (implementation takes precedence for proxies)
  const mergedFunctions = implementationFunctions.length > 0
    ? implementationFunctions
    : functions;
  const mergedEvents = implementationEvents.length > 0
    ? implementationEvents
    : events;

  return {
    name: contract.name,
    address: contract.address,
    type: contract.type,
    docId: contract.docId,
    description: contract.description,
    implementation: implementationAddress,
    abi: safeParseABI(source.ABI),
    sourceCode: source.SourceCode,
    contractName: source.ContractName,
    compilerVersion: source.CompilerVersion,
    isProxy: source.Proxy === "1" || contract.type === "proxy",
    implementationAddress,
    functions: mergedFunctions,
    events: mergedEvents,
    stateVariables: [], // Would require more complex source parsing
    onChainState,
  };
}

/**
 * Main analysis function
 */
async function main() {
  console.log("=== Contract Analysis Started ===\n");

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Load contracts list
  console.log(`Network: ${NETWORK} (chainId: ${CHAIN_ID})\n`);
  const contractsData = JSON.parse(await readFile(CONTRACTS_FILE, "utf-8")) as ContractData;

  const allContracts = [
    ...contractsData.coreTokens,
    ...contractsData.simpleStakingV2,
    ...contractsData.layerOperators,
    ...contractsData.daoContracts,
    ...contractsData.multiSig,
  ];

  console.log(`Found ${allContracts.length} contracts to analyze\n`);

  const results: AnalyzedContract[] = [];

  for (const contract of allContracts) {
    const result = await analyzeContract(contract);
    if (result) {
      results.push(result);

      // Save individual result
      const outputPath = join(OUTPUT_DIR, `${contract.docId}-${contract.name.toLowerCase().replace(/\s+/g, "-")}.json`);
      await writeFile(outputPath, JSON.stringify(result, null, 2));
      console.log(`  Saved to ${outputPath}\n`);
    }

    // Rate limiting between contracts
    await delay(1000);
  }

  // Save combined results
  const combinedPath = join(OUTPUT_DIR, "all-contracts.json");
  await writeFile(combinedPath, JSON.stringify(results, null, 2));
  console.log(`\n=== Analysis Complete ===`);
  console.log(`Analyzed ${results.length}/${allContracts.length} contracts`);
  console.log(`Results saved to ${OUTPUT_DIR}`);
}

// Run
main().catch(console.error);
