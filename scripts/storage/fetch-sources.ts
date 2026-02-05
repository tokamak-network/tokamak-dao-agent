/**
 * Fetch verified contract source code from Etherscan and save to contracts/src/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import type {
  ContractsJson,
  ContractInfo,
  EtherscanSourceResponse,
  MultiFileSource,
} from "./types";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
if (!ETHERSCAN_API_KEY) {
  throw new Error("ETHERSCAN_API_KEY environment variable is required");
}

const CONTRACTS_DIR = join(import.meta.dir, "../../contracts/src");
const CONTRACTS_JSON_PATH = join(import.meta.dir, "../mainnet/contracts.json");

// Rate limiting: Etherscan allows 5 calls/sec for free tier
const RATE_LIMIT_MS = 250;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSourceCode(address: string): Promise<EtherscanSourceResponse> {
  // Use Etherscan API V2 with chainid=1 for mainnet
  const url = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${address}&apikey=${ETHERSCAN_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  return response.json() as Promise<EtherscanSourceResponse>;
}

function parseSourceCode(
  result: EtherscanSourceResponse["result"][0]
): { sources: Record<string, string>; settings: MultiFileSource["settings"] | null } {
  const sourceCode = result.SourceCode;

  // Check if it's multi-file format (starts with {{ or {)
  if (sourceCode.startsWith("{{")) {
    // Double-braced JSON (Etherscan v2 format)
    const jsonStr = sourceCode.slice(1, -1); // Remove outer braces
    const parsed = JSON.parse(jsonStr) as MultiFileSource;
    const sources: Record<string, string> = {};
    for (const [path, { content }] of Object.entries(parsed.sources)) {
      sources[path] = content;
    }
    return { sources, settings: parsed.settings || null };
  } else if (sourceCode.startsWith("{")) {
    // Single-braced JSON (simpler multi-file format)
    try {
      const parsed = JSON.parse(sourceCode) as Record<string, { content: string }>;
      const sources: Record<string, string> = {};
      for (const [path, { content }] of Object.entries(parsed)) {
        sources[path] = content;
      }
      return { sources, settings: null };
    } catch {
      // Not JSON, treat as single file
      return {
        sources: { [`${result.ContractName}.sol`]: sourceCode },
        settings: null,
      };
    }
  } else {
    // Single file source
    return {
      sources: { [`${result.ContractName}.sol`]: sourceCode },
      settings: null,
    };
  }
}

function extractSolidityVersion(sourceOrVersion: string): string | null {
  // From compiler version string like "v0.5.12+commit..."
  const versionMatch = sourceOrVersion.match(/v?(\d+\.\d+\.\d+)/);
  if (versionMatch) return versionMatch[1];

  // From pragma statement
  const pragmaMatch = sourceOrVersion.match(/pragma solidity\s*[\^~>=<]*\s*(\d+\.\d+\.\d+)/);
  if (pragmaMatch) return pragmaMatch[1];

  return null;
}

function cleanFilePath(path: string): string {
  // Remove common prefixes and normalize
  return path
    .replace(/^contracts\//, "")
    .replace(/^@openzeppelin\//, "lib/openzeppelin-contracts/")
    .replace(/^\.\.\//g, "");
}

async function processContract(contract: ContractInfo): Promise<{
  success: boolean;
  contractName: string;
  version: string | null;
  files: string[];
}> {
  console.log(`\nFetching: ${contract.name} (${contract.address})`);

  try {
    const response = await fetchSourceCode(contract.address);

    if (response.status !== "1" || response.result.length === 0) {
      console.log(`  ⚠️  Not verified or no source: ${response.message}`);
      return { success: false, contractName: contract.name, version: null, files: [] };
    }

    const result = response.result[0];

    // Check if contract is verified
    if (!result.SourceCode || result.SourceCode === "") {
      console.log(`  ⚠️  No source code available`);
      return { success: false, contractName: contract.name, version: null, files: [] };
    }

    const { sources, settings } = parseSourceCode(result);
    const version = extractSolidityVersion(result.CompilerVersion);
    const files: string[] = [];

    // Create contract-specific directory
    const contractDir = join(CONTRACTS_DIR, contract.name);
    if (!existsSync(contractDir)) {
      mkdirSync(contractDir, { recursive: true });
    }

    // Save each source file
    for (const [filePath, content] of Object.entries(sources)) {
      const cleanPath = cleanFilePath(filePath);
      const fullPath = join(contractDir, cleanPath);
      const fileDir = dirname(fullPath);

      if (!existsSync(fileDir)) {
        mkdirSync(fileDir, { recursive: true });
      }

      writeFileSync(fullPath, content);
      files.push(cleanPath);
    }

    // Save contract metadata
    const metadata = {
      name: result.ContractName,
      address: contract.address,
      compilerVersion: result.CompilerVersion,
      optimizationUsed: result.OptimizationUsed === "1",
      runs: parseInt(result.Runs) || 200,
      evmVersion: result.EVMVersion || "default",
      proxy: result.Proxy === "1",
      implementation: result.Implementation || null,
      settings,
    };
    writeFileSync(join(contractDir, "metadata.json"), JSON.stringify(metadata, null, 2));

    console.log(`  ✅ Saved ${files.length} files (Solidity ${version || "unknown"})`);
    return { success: true, contractName: result.ContractName, version, files };
  } catch (error) {
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, contractName: contract.name, version: null, files: [] };
  }
}

async function main(): Promise<void> {
  console.log("=== Fetching Contract Source Code from Etherscan ===\n");

  // Load contracts.json
  const contractsJson = JSON.parse(readFileSync(CONTRACTS_JSON_PATH, "utf-8")) as ContractsJson;

  // Flatten all contracts
  const allContracts: ContractInfo[] = [
    ...contractsJson.coreTokens,
    ...contractsJson.simpleStakingV2,
    ...contractsJson.layerOperators,
    ...contractsJson.daoContracts,
    ...contractsJson.multiSig,
  ];

  console.log(`Found ${allContracts.length} contracts to fetch\n`);

  // Create contracts/src directory
  if (!existsSync(CONTRACTS_DIR)) {
    mkdirSync(CONTRACTS_DIR, { recursive: true });
  }

  // Process each contract with rate limiting
  const results: Map<string, string> = new Map(); // version -> count
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allContracts.length; i++) {
    const contract = allContracts[i];
    console.log(`[${i + 1}/${allContracts.length}]`);

    const result = await processContract(contract);

    if (result.success) {
      successCount++;
      if (result.version) {
        const count = results.get(result.version) || 0;
        results.set(result.version, count + 1);
      }
    } else {
      failCount++;
    }

    // Rate limiting
    if (i < allContracts.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total: ${allContracts.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log("\nSolidity versions used:");
  const sortedVersions = [...results.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [version, count] of sortedVersions) {
    console.log(`  ${version}: ${count} contracts`);
  }

  // Generate remappings file
  const remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/",
    "forge-std/=lib/forge-std/src/",
  ];
  writeFileSync(join(CONTRACTS_DIR, "../remappings.txt"), remappings.join("\n"));
  console.log("\nGenerated remappings.txt");
}

main().catch(console.error);
