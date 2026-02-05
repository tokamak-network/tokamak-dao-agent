/**
 * Collect storage state from all contracts using their layouts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Address, Hex } from "viem";
import {
  readSlot,
  getMappingSlot,
  getNestedMappingSlot,
  readArray,
  decodeValue,
  getProxyImplementation,
  getCurrentBlock,
  client,
} from "./reader";
import type {
  ContractsJson,
  ContractInfo,
  StorageLayout,
  StorageSlot,
  StorageType,
  CollectedState,
  StorageValue,
  MappingValue,
  KnownAddresses,
} from "./types";

const LAYOUTS_DIR = join(import.meta.dir, "layouts");
const OUTPUT_DIR = join(import.meta.dir, "output");
const CONTRACTS_JSON_PATH = join(import.meta.dir, "../mainnet/contracts.json");

// JSON replacer to handle BigInt serialization
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

// Known addresses for mapping lookups
function loadKnownAddresses(contractsJson: ContractsJson): KnownAddresses {
  return {
    layer2Operators: contractsJson.layerOperators.map((c) => c.address),
    tokenAddresses: [
      contractsJson.coreTokens[0].address, // TON
      contractsJson.coreTokens[1].address, // WTON
    ],
    daoCommitteeMembers: [], // Would need to fetch from events
    registeredCandidates: [], // Would need to fetch from registry
  };
}

interface LayoutFile {
  contractAddress: string;
  contractName: string;
  implementationName: string;
  compilerVersion: string;
  isProxy: boolean;
  implementationAddress: string | null;
  layout: StorageLayout;
  linkedFrom?: string;
}

async function collectContractState(
  layoutFile: LayoutFile,
  knownAddresses: KnownAddresses,
  blockNumber: bigint
): Promise<CollectedState> {
  const address = layoutFile.contractAddress as Address;
  const layout = layoutFile.layout;

  console.log(`  Reading ${layout.storage.length} storage slots...`);

  const state: CollectedState = {
    contractAddress: address,
    contractName: layoutFile.contractName,
    blockNumber: Number(blockNumber),
    timestamp: new Date().toISOString(),
    implementationAddress: layoutFile.implementationAddress || undefined,
    simpleVariables: [],
    mappings: {},
    arrays: {},
  };

  // Check if this is a proxy and get implementation
  if (layoutFile.isProxy) {
    const impl = await getProxyImplementation(address);
    if (impl) {
      state.implementationAddress = impl;
      console.log(`    Proxy implementation: ${impl}`);
    }
  }

  // Read each storage slot
  for (const slot of layout.storage) {
    const typeInfo = layout.types[slot.type];
    if (!typeInfo) {
      console.log(`    ⚠️  Unknown type: ${slot.type} for ${slot.label}`);
      continue;
    }

    const slotNum = BigInt(slot.slot);

    if (typeInfo.encoding === "inplace") {
      // Simple variable
      try {
        const rawValue = await readSlot(address, slotNum);
        const decodedValue = decodeValue(rawValue, typeInfo, slot.offset);

        state.simpleVariables.push({
          slot: slot.slot,
          label: slot.label,
          type: typeInfo.label || slot.type,
          rawValue,
          decodedValue,
          offset: slot.offset > 0 ? slot.offset : undefined,
        });
      } catch (error) {
        console.log(`    ❌ Error reading ${slot.label}: ${error}`);
      }
    } else if (typeInfo.encoding === "mapping") {
      // Mapping - read known keys
      const mappingValues: MappingValue[] = [];
      const keyType = typeInfo.key || "";

      // Determine which keys to look up
      let keys: string[] = [];
      if (keyType.includes("address")) {
        // Try layer2 operators for staking-related contracts
        if (
          layoutFile.contractName.includes("SeigManager") ||
          layoutFile.contractName.includes("DepositManager") ||
          layoutFile.contractName.includes("Layer2")
        ) {
          keys = knownAddresses.layer2Operators;
        }
        // Add token addresses for token-related mappings
        if (slot.label.includes("balance") || slot.label.includes("allowance")) {
          keys = [...knownAddresses.layer2Operators, ...knownAddresses.tokenAddresses];
        }
      }

      // Read mapping values for known keys
      for (const key of keys.slice(0, 20)) {
        // Limit to 20 keys per mapping
        try {
          const mappingSlot = getMappingSlot(slotNum, key as Address);
          const rawValue = await readSlot(address, mappingSlot);

          // Skip zero values
          if (BigInt(rawValue) === 0n) continue;

          const valueType = layout.types[typeInfo.value || ""];
          const decodedValue = valueType
            ? decodeValue(rawValue, valueType)
            : BigInt(rawValue);

          mappingValues.push({
            key,
            value: decodedValue,
          });
        } catch (error) {
          // Silent fail for missing mapping entries
        }
      }

      if (mappingValues.length > 0) {
        state.mappings[slot.label] = mappingValues;
      }
    } else if (typeInfo.encoding === "dynamic_array") {
      // Dynamic array
      try {
        const elements = await readArray(address, slotNum, 20); // Limit to 20 elements
        const arrayValues = elements.map((raw, index) => {
          const elementType = layout.types[typeInfo.base || ""];
          const decoded = elementType
            ? decodeValue(raw, elementType)
            : BigInt(raw);
          return { index, value: decoded };
        });

        if (arrayValues.length > 0) {
          state.arrays[slot.label] = arrayValues;
        }
      } catch (error) {
        console.log(`    ⚠️  Error reading array ${slot.label}: ${error}`);
      }
    }
  }

  return state;
}

async function main(): Promise<void> {
  console.log("=== Collecting Contract Storage State ===\n");

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load contracts.json for known addresses
  const contractsJson = JSON.parse(readFileSync(CONTRACTS_JSON_PATH, "utf-8")) as ContractsJson;
  const knownAddresses = loadKnownAddresses(contractsJson);

  // Get current block number
  let blockNumber: bigint;
  try {
    blockNumber = await getCurrentBlock();
    console.log(`Current block: ${blockNumber}\n`);
  } catch (error) {
    console.error("Failed to connect to RPC. Make sure Anvil is running or ALCHEMY_RPC_URL is set.");
    console.error("Error:", error);
    process.exit(1);
  }

  // List all layout files
  const layoutFiles = readdirSync(LAYOUTS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${layoutFiles.length} layout files\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < layoutFiles.length; i++) {
    const fileName = layoutFiles[i];
    const contractName = fileName.replace(".json", "");

    console.log(`[${i + 1}/${layoutFiles.length}] ${contractName}`);

    try {
      const layoutPath = join(LAYOUTS_DIR, fileName);
      const layoutFile = JSON.parse(readFileSync(layoutPath, "utf-8")) as LayoutFile;

      // Skip if no storage slots
      if (!layoutFile.layout?.storage || layoutFile.layout.storage.length === 0) {
        console.log("  ⚠️  No storage slots defined");
        continue;
      }

      const state = await collectContractState(layoutFile, knownAddresses, blockNumber);

      // Save state to output
      const outputPath = join(OUTPUT_DIR, `${contractName}-state.json`);
      writeFileSync(outputPath, JSON.stringify(state, bigIntReplacer, 2));

      const varCount = state.simpleVariables.length;
      const mapCount = Object.keys(state.mappings).length;
      const arrCount = Object.keys(state.arrays).length;
      console.log(`  ✅ Collected: ${varCount} vars, ${mapCount} mappings, ${arrCount} arrays`);
      successCount++;
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Block number: ${blockNumber}`);
  console.log(`Contracts processed: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`\nOutput saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
