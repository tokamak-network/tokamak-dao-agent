/**
 * Extract storage layouts using forge inspect for all contracts
 *
 * Key improvement: Extract FULL inheritance chain storage layout by finding
 * the actual contract definition file (not just Storage files)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { dirname, join, basename } from "path";
import { fileURLToPath } from "url";
import { $ } from "bun";
import type { ContractsJson, ContractInfo, StorageLayout } from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONTRACTS_DIR = join(__dirname, "../../contracts/src");
const CONTRACTS_ROOT = join(__dirname, "../../contracts");
const LAYOUTS_DIR = join(__dirname, "layouts");
const CONTRACTS_JSON_PATH = join(__dirname, "../mainnet/contracts.json");

interface ContractMetadata {
  name: string;
  address: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  runs: number;
  evmVersion: string;
  proxy: boolean;
  implementation: string | null;
}

interface FoundContract {
  filePath: string;
  contractName: string;
  relativePath: string;
}

/**
 * Find all .sol files in a directory recursively
 */
function findSolFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSolFiles(fullPath));
    } else if (entry.name.endsWith(".sol")) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Extract contract names defined in a Solidity file
 */
function extractContractNames(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const matches = content.matchAll(/contract\s+(\w+)\s+(?:is|{)/g);
    return [...matches].map((m) => m[1]);
  } catch {
    return [];
  }
}

/**
 * Find the file that defines a specific contract
 * Prioritizes files that define the contract with inheritance (full layout)
 */
function findContractDefinition(contractDir: string, contractName: string): FoundContract | null {
  const solFiles = findSolFiles(contractDir);

  // First pass: exact match for contract definition
  for (const filePath of solFiles) {
    const contracts = extractContractNames(filePath);
    if (contracts.includes(contractName)) {
      // Check if this is NOT a Storage-only file (those don't have full inheritance)
      const fileName = basename(filePath);
      if (!fileName.includes("Storage") || fileName === `${contractName}.sol`) {
        return {
          filePath,
          contractName,
          relativePath: filePath.replace(CONTRACTS_ROOT + "/", ""),
        };
      }
    }
  }

  // Second pass: look for the main implementation file
  // Common patterns: Contract.sol, ContractImpl.sol in stake/managers/, contracts/, etc.
  const searchPatterns = [
    `${contractName}.sol`,
    `${contractName}Impl.sol`,
    // For proxies, look in specific directories
    `stake/managers/${contractName}.sol`,
    `contracts/${contractName}.sol`,
    `proxy/${contractName}.sol`,
  ];

  for (const pattern of searchPatterns) {
    for (const filePath of solFiles) {
      if (filePath.endsWith(pattern)) {
        const contracts = extractContractNames(filePath);
        if (contracts.includes(contractName)) {
          return {
            filePath,
            contractName,
            relativePath: filePath.replace(CONTRACTS_ROOT + "/", ""),
          };
        }
      }
    }
  }

  // Third pass: any file containing the contract (fallback)
  for (const filePath of solFiles) {
    const contracts = extractContractNames(filePath);
    if (contracts.includes(contractName)) {
      return {
        filePath,
        contractName,
        relativePath: filePath.replace(CONTRACTS_ROOT + "/", ""),
      };
    }
  }

  return null;
}

/**
 * Run forge inspect to extract storage layout
 */
async function runForgeInspect(identifier: string): Promise<StorageLayout | null> {
  try {
    const result = await $`cd ${CONTRACTS_ROOT} && forge inspect ${identifier} storage-layout --json 2>&1`.text();
    const trimmed = result.trim();

    if (trimmed.startsWith("{")) {
      const layout = JSON.parse(trimmed) as StorageLayout;
      if (layout.storage && layout.storage.length > 0) {
        return layout;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract storage layout for a contract
 */
async function extractLayout(
  contractDir: string,
  metadata: ContractMetadata
): Promise<StorageLayout | null> {
  const contractName = metadata.name;
  console.log(`    Looking for: ${contractName}`);

  // Find the contract definition file
  const found = findContractDefinition(contractDir, contractName);

  if (found) {
    console.log(`    Found: ${found.relativePath}`);
    const identifier = `${found.relativePath}:${found.contractName}`;
    const layout = await runForgeInspect(identifier);

    if (layout) {
      return layout;
    }
  }

  // Fallback: try common variations
  const variations = [
    contractName,
    contractName.replace("Proxy", ""),
    contractName.replace("V1_1", ""),
    contractName.replace("V1_2", ""),
    contractName.replace("V1_3", ""),
  ];

  for (const variation of variations) {
    const found2 = findContractDefinition(contractDir, variation);
    if (found2) {
      const identifier = `${found2.relativePath}:${found2.contractName}`;
      const layout = await runForgeInspect(identifier);
      if (layout) {
        console.log(`    Found via variation: ${variation}`);
        return layout;
      }
    }
  }

  console.log(`    ⚠️  Could not find contract definition for ${contractName}`);
  return null;
}

/**
 * Process a single contract
 */
async function processContract(contract: ContractInfo): Promise<boolean> {
  const contractDir = join(CONTRACTS_DIR, contract.name);
  const metadataPath = join(contractDir, "metadata.json");

  if (!existsSync(metadataPath)) {
    console.log(`  ⚠️  No source code downloaded for ${contract.name}`);
    return false;
  }

  const metadata = JSON.parse(readFileSync(metadataPath, "utf-8")) as ContractMetadata;
  console.log(`  Processing ${contract.name} (verified as: ${metadata.name})`);

  const layout = await extractLayout(contractDir, metadata);

  if (layout && layout.storage.length > 0) {
    const outputPath = join(LAYOUTS_DIR, `${contract.name}.json`);
    const outputData = {
      contractAddress: contract.address,
      contractName: contract.name,
      implementationName: metadata.name,
      compilerVersion: metadata.compilerVersion,
      isProxy: contract.type === "proxy",
      implementationAddress: contract.implementation || null,
      layout,
    };
    writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`    ✅ Saved layout: ${layout.storage.length} storage slots`);
    return true;
  } else if (layout) {
    console.log(`    ⚠️  Empty storage layout (interface/abstract)`);
    return false;
  }

  return false;
}

/**
 * Try to extract layout for proxy by finding implementation in same or related directory
 */
async function processProxyContract(proxy: ContractInfo, allContracts: ContractInfo[]): Promise<boolean> {
  const proxyDir = join(CONTRACTS_DIR, proxy.name);
  const metadataPath = join(proxyDir, "metadata.json");

  if (!existsSync(metadataPath)) {
    console.log(`  ⚠️  No source code for ${proxy.name}`);
    return false;
  }

  const metadata = JSON.parse(readFileSync(metadataPath, "utf-8")) as ContractMetadata;
  console.log(`  Processing proxy ${proxy.name} (verified as: ${metadata.name})`);

  // Strategy 1: Find implementation contract name from proxy name
  const implBaseName = proxy.name
    .replace("Proxy", "")
    .replace(/\d+$/, ""); // Remove trailing numbers

  // Strategy 2: Look for implementation in contracts.json
  const possibleImplNames = [
    implBaseName,
    `${implBaseName}V1_1`,
    `${implBaseName}V1_2`,
    `${implBaseName}V1_3`,
    metadata.name, // The verified contract name
  ];

  // Try to find implementation's source directory and extract its layout
  for (const implName of possibleImplNames) {
    const implDir = join(CONTRACTS_DIR, implName);
    if (existsSync(implDir)) {
      const implMetadataPath = join(implDir, "metadata.json");
      if (existsSync(implMetadataPath)) {
        const implMetadata = JSON.parse(readFileSync(implMetadataPath, "utf-8")) as ContractMetadata;
        console.log(`    Trying implementation: ${implName} (${implMetadata.name})`);

        const layout = await extractLayout(implDir, implMetadata);
        if (layout && layout.storage.length > 0) {
          const outputPath = join(LAYOUTS_DIR, `${proxy.name}.json`);
          const outputData = {
            contractAddress: proxy.address,
            contractName: proxy.name,
            implementationName: implMetadata.name,
            compilerVersion: implMetadata.compilerVersion,
            isProxy: true,
            implementationAddress: proxy.implementation,
            layout,
            linkedFrom: implName,
          };
          writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
          console.log(`    ✅ Linked to ${implName}: ${layout.storage.length} storage slots`);
          return true;
        }
      }
    }
  }

  // Strategy 3: Try extracting from proxy's own directory
  // Some proxies include the implementation code
  const layout = await extractLayout(proxyDir, metadata);
  if (layout && layout.storage.length > 0) {
    const outputPath = join(LAYOUTS_DIR, `${proxy.name}.json`);
    const outputData = {
      contractAddress: proxy.address,
      contractName: proxy.name,
      implementationName: metadata.name,
      compilerVersion: metadata.compilerVersion,
      isProxy: true,
      implementationAddress: proxy.implementation,
      layout,
    };
    writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`    ✅ Extracted from proxy source: ${layout.storage.length} storage slots`);
    return true;
  }

  console.log(`    ⚠️  Could not find implementation layout for ${proxy.name}`);
  return false;
}

async function buildContracts(): Promise<boolean> {
  console.log("Building contracts (this may show some errors for incompatible versions)...\n");
  try {
    await $`cd ${CONTRACTS_ROOT} && forge build --force 2>&1`.text();
    return true;
  } catch {
    console.log("Build completed with some errors (expected for multi-version projects)\n");
    return true; // Continue anyway
  }
}

async function main(): Promise<void> {
  console.log("=== Extracting Storage Layouts (Improved) ===\n");

  // Ensure layouts directory exists
  if (!existsSync(LAYOUTS_DIR)) {
    mkdirSync(LAYOUTS_DIR, { recursive: true });
  }

  // Build all contracts first
  await buildContracts();

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

  // Separate implementations and proxies
  const implementationContracts = allContracts.filter((c) => c.type !== "proxy");
  const proxyContracts = allContracts.filter((c) => c.type === "proxy");

  console.log(`Found ${implementationContracts.length} implementations, ${proxyContracts.length} proxies\n`);

  // Process implementations first
  console.log("=== Processing Implementation Contracts ===\n");
  let implSuccessCount = 0;
  let implFailCount = 0;

  for (let i = 0; i < implementationContracts.length; i++) {
    const contract = implementationContracts[i];
    console.log(`[${i + 1}/${implementationContracts.length}] ${contract.name}`);

    const success = await processContract(contract);
    if (success) {
      implSuccessCount++;
    } else {
      implFailCount++;
    }
  }

  // Process proxies - try to link to implementations
  console.log("\n=== Processing Proxy Contracts ===\n");
  let proxySuccessCount = 0;
  let proxyFailCount = 0;

  for (let i = 0; i < proxyContracts.length; i++) {
    const proxy = proxyContracts[i];
    console.log(`[${i + 1}/${proxyContracts.length}] ${proxy.name}`);

    const success = await processProxyContract(proxy, allContracts);
    if (success) {
      proxySuccessCount++;
    } else {
      proxyFailCount++;
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Implementations: ${implSuccessCount}/${implementationContracts.length} succeeded`);
  console.log(`Proxies: ${proxySuccessCount}/${proxyContracts.length} succeeded`);

  // List generated layout files
  const layoutFiles = readdirSync(LAYOUTS_DIR).filter((f) => f.endsWith(".json") && !f.includes("-full"));
  console.log(`\nGenerated ${layoutFiles.length} layout files in ${LAYOUTS_DIR}`);
}

main().catch(console.error);
