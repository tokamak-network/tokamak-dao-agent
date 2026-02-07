#!/usr/bin/env bun
/**
 * On-chain verification of contracts.json
 *
 * Checks:
 * 1. Layer2Registry - all registered Layer2 operators
 * 2. SeigManager storage - dependent contract addresses
 * 3. DAOAgendaManager - all agenda targets
 * 4. Proxy implementations - verify implementation addresses
 */

import { createPublicClient, http, type Address, type Hex, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = process.env.ALCHEMY_RPC_URL;
if (!RPC_URL) {
  console.error("Error: ALCHEMY_RPC_URL environment variable is required");
  process.exit(1);
}

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
});

// Load contracts.json
const contractsPath = path.join(import.meta.dir, "mainnet/contracts.json");
const contractsJson = JSON.parse(fs.readFileSync(contractsPath, "utf-8"));

// Load agendas.json
const agendasPath = path.join(import.meta.dir, "mainnet/agendas.json");
const agendasJson = JSON.parse(fs.readFileSync(agendasPath, "utf-8"));

// Build address lookup from contracts.json
function buildAddressLookup(): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const category of Object.keys(contractsJson)) {
    for (const contract of contractsJson[category]) {
      lookup.set(contract.address.toLowerCase(), contract.name);
    }
  }

  return lookup;
}

// ABIs for on-chain queries
const Layer2RegistryABI = parseAbi([
  "function numLayer2s() view returns (uint256)",
  "function layer2ByIndex(uint256 index) view returns (address)",
]);

const SeigManagerABI = parseAbi([
  "function ton() view returns (address)",
  "function wton() view returns (address)",
  "function powerton() view returns (address)",
  "function tot() view returns (address)",
  "function registry() view returns (address)",
  "function depositManager() view returns (address)",
  "function dao() view returns (address)",
]);

const DAOAgendaManagerABI = parseAbi([
  "function totalAgendas() view returns (uint256)",
]);

// EIP-1967 implementation slot
const EIP1967_IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;

// Contract addresses
const LAYER2_REGISTRY_PROXY = "0x7846c2248a7b4de77e9c2bae7fbb93bfc286837b" as Address;
const SEIG_MANAGER_PROXY = "0x0b55a0f463b6defb81c6063973763951712d0e5f" as Address;
const DAO_AGENDA_MANAGER = "0xcD4421d082752f363E1687544a09d5112cD4f484" as Address;

interface VerificationResult {
  source: string;
  address: string;
  name?: string;
  status: "registered" | "missing";
  role?: string;
}

async function verifyLayer2Registry(lookup: Map<string, string>): Promise<VerificationResult[]> {
  console.log("\n=== Layer2Registry Verification ===\n");

  const results: VerificationResult[] = [];

  const numLayer2s = await client.readContract({
    address: LAYER2_REGISTRY_PROXY,
    abi: Layer2RegistryABI,
    functionName: "numLayer2s",
  });

  console.log(`Total Layer2s registered: ${numLayer2s}`);

  for (let i = 0; i < Number(numLayer2s); i++) {
    const layer2Address = await client.readContract({
      address: LAYER2_REGISTRY_PROXY,
      abi: Layer2RegistryABI,
      functionName: "layer2ByIndex",
      args: [BigInt(i)],
    });

    const addressLower = layer2Address.toLowerCase();
    const name = lookup.get(addressLower);
    const status = name ? "registered" : "missing";

    results.push({
      source: "Layer2Registry",
      address: layer2Address,
      name,
      status,
      role: "Layer2 Operator",
    });

    const icon = status === "registered" ? "✓" : "✗";
    const nameStr = name || "UNKNOWN";
    console.log(`  [${i}] ${icon} ${layer2Address} - ${nameStr}`);
  }

  return results;
}

async function verifySeigManagerDependencies(lookup: Map<string, string>): Promise<VerificationResult[]> {
  console.log("\n=== SeigManager Dependencies Verification ===\n");

  const results: VerificationResult[] = [];

  const dependencies = [
    { fn: "ton", role: "TON Token" },
    { fn: "wton", role: "WTON Token" },
    { fn: "powerton", role: "PowerTON" },
    { fn: "tot", role: "TOT Token" },
    { fn: "registry", role: "Layer2Registry" },
    { fn: "depositManager", role: "DepositManager" },
    { fn: "dao", role: "DAO Contract" },
  ] as const;

  for (const dep of dependencies) {
    try {
      const address = await client.readContract({
        address: SEIG_MANAGER_PROXY,
        abi: SeigManagerABI,
        functionName: dep.fn,
      }) as Address;

      const addressLower = address.toLowerCase();
      const name = lookup.get(addressLower);
      const status = name ? "registered" : "missing";

      results.push({
        source: "SeigManager",
        address,
        name,
        status,
        role: dep.role,
      });

      const icon = status === "registered" ? "✓" : "✗";
      const nameStr = name || "UNKNOWN";
      console.log(`  ${dep.fn}(): ${icon} ${address} - ${nameStr}`);
    } catch (e) {
      console.log(`  ${dep.fn}(): ERROR - ${(e as Error).message}`);
    }
  }

  return results;
}

async function verifyAgendaTargets(lookup: Map<string, string>): Promise<VerificationResult[]> {
  console.log("\n=== DAOAgendaManager Targets Verification ===\n");

  const results: VerificationResult[] = [];
  const uniqueTargets = new Map<string, { count: number; agendaIds: number[] }>();

  // Collect all unique targets from agendas.json
  for (const agenda of agendasJson) {
    for (const target of agenda.targets) {
      const targetLower = target.toLowerCase();
      const existing = uniqueTargets.get(targetLower);
      if (existing) {
        existing.count++;
        existing.agendaIds.push(agenda.id);
      } else {
        uniqueTargets.set(targetLower, { count: 1, agendaIds: [agenda.id] });
      }
    }
  }

  console.log(`Total unique targets in agendas: ${uniqueTargets.size}`);
  console.log("");

  // Check each unique target
  const sortedTargets = Array.from(uniqueTargets.entries()).sort((a, b) => b[1].count - a[1].count);

  for (const [address, info] of sortedTargets) {
    const name = lookup.get(address);
    const status = name ? "registered" : "missing";

    results.push({
      source: "DAOAgendaManager",
      address,
      name,
      status,
      role: `Agenda target (${info.count} agendas)`,
    });

    const icon = status === "registered" ? "✓" : "✗";
    const nameStr = name || "UNKNOWN";
    const agendaStr = info.agendaIds.length <= 3
      ? `agendas: ${info.agendaIds.join(", ")}`
      : `${info.count} agendas`;
    console.log(`  ${icon} ${address} - ${nameStr} (${agendaStr})`);
  }

  return results;
}

async function verifyProxyImplementations(lookup: Map<string, string>): Promise<VerificationResult[]> {
  console.log("\n=== Proxy Implementation Verification ===\n");

  const results: VerificationResult[] = [];

  // Collect all proxies from contracts.json
  const proxies: { name: string; address: Address; expectedImpl?: string }[] = [];

  for (const category of Object.keys(contractsJson)) {
    for (const contract of contractsJson[category]) {
      if (contract.type === "proxy") {
        proxies.push({
          name: contract.name,
          address: contract.address as Address,
          expectedImpl: contract.implementation?.toLowerCase(),
        });
      }
    }
  }

  for (const proxy of proxies) {
    try {
      const implSlot = await client.getStorageAt({
        address: proxy.address,
        slot: EIP1967_IMPL_SLOT,
      });

      // Extract address from slot (last 20 bytes)
      const implAddress = `0x${implSlot!.slice(-40)}`.toLowerCase();

      const implName = lookup.get(implAddress);
      const matches = proxy.expectedImpl === implAddress;

      if (!matches && implAddress !== "0x0000000000000000000000000000000000000000") {
        results.push({
          source: "ProxyImplementation",
          address: implAddress,
          name: implName,
          status: implName ? "registered" : "missing",
          role: `Implementation of ${proxy.name}`,
        });

        const icon = implName ? "✓" : "✗";
        const nameStr = implName || "UNKNOWN";
        console.log(`  ${proxy.name} → ${icon} ${implAddress} - ${nameStr}`);

        if (proxy.expectedImpl && proxy.expectedImpl !== implAddress) {
          console.log(`    ⚠ Expected: ${proxy.expectedImpl}`);
        }
      } else if (matches) {
        console.log(`  ${proxy.name} → ✓ ${implAddress} (matches contracts.json)`);
      }
    } catch (e) {
      console.log(`  ${proxy.name}: ERROR - ${(e as Error).message}`);
    }
  }

  return results;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         contracts.json On-Chain Verification Report          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const lookup = buildAddressLookup();
  console.log(`\ncontracts.json contains ${lookup.size} addresses`);

  const allResults: VerificationResult[] = [];

  // Run all verifications
  allResults.push(...await verifyLayer2Registry(lookup));
  allResults.push(...await verifySeigManagerDependencies(lookup));
  allResults.push(...await verifyAgendaTargets(lookup));
  allResults.push(...await verifyProxyImplementations(lookup));

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                         SUMMARY                               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const missing = allResults.filter(r => r.status === "missing");
  const uniqueMissing = new Map<string, VerificationResult>();

  for (const m of missing) {
    const existing = uniqueMissing.get(m.address.toLowerCase());
    if (!existing) {
      uniqueMissing.set(m.address.toLowerCase(), m);
    } else {
      // Merge roles
      existing.role = `${existing.role}; ${m.role}`;
    }
  }

  if (uniqueMissing.size === 0) {
    console.log("✓ All on-chain addresses are registered in contracts.json!");
  } else {
    console.log(`✗ Found ${uniqueMissing.size} missing addresses:\n`);

    for (const [address, info] of uniqueMissing) {
      console.log(`  Address: ${address}`);
      console.log(`  Role: ${info.role}`);
      console.log(`  Source: ${info.source}`);
      console.log("");
    }

    // Output in JSON format for easy update
    console.log("\n--- Missing Addresses (JSON format) ---\n");
    const missingArray = Array.from(uniqueMissing.values()).map(m => ({
      address: m.address,
      role: m.role,
      source: m.source,
    }));
    console.log(JSON.stringify(missingArray, null, 2));
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
