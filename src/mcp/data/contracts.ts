/**
 * contracts.json loader and search utilities
 */

import { readFileSync } from "fs";
import type { ContractInfo, ContractsJson } from "../../../scripts/storage/types.ts";
import { paths } from "../paths.ts";

const CONTRACTS_PATH = paths.contractsJson;

let _contractsJson: ContractsJson | null = null;
let _allContracts: ContractInfo[] | null = null;
let _addressMap: Map<string, ContractInfo> | null = null;

function load(): ContractsJson {
  if (!_contractsJson) {
    _contractsJson = JSON.parse(readFileSync(CONTRACTS_PATH, "utf-8")) as ContractsJson;
  }
  return _contractsJson;
}

export function getAllContracts(): ContractInfo[] {
  if (!_allContracts) {
    const json = load();
    _allContracts = [
      ...json.coreTokens,
      ...json.simpleStakingV2,
      ...json.layerOperators,
      ...json.daoContracts,
      ...json.multiSig,
    ];
  }
  return _allContracts;
}

function getAddressMap(): Map<string, ContractInfo> {
  if (!_addressMap) {
    _addressMap = new Map();
    for (const c of getAllContracts()) {
      _addressMap.set(c.address.toLowerCase(), c);
    }
  }
  return _addressMap;
}

/**
 * Search contracts by name (fuzzy) or address (exact).
 */
export function searchContracts(query: string): ContractInfo[] {
  const q = query.toLowerCase().trim();

  // Exact address match
  if (q.startsWith("0x") && q.length === 42) {
    const found = getAddressMap().get(q);
    return found ? [found] : [];
  }

  // Name search (case-insensitive substring)
  const all = getAllContracts();
  return all.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
  );
}

/**
 * Get a single contract by exact name (case-insensitive).
 */
export function getContractByName(name: string): ContractInfo | undefined {
  const q = name.toLowerCase();
  return getAllContracts().find((c) => c.name.toLowerCase() === q);
}

/**
 * Get contract name from address.
 */
export function getContractName(address: string): string {
  const found = getAddressMap().get(address.toLowerCase());
  return found ? found.name : address;
}

/**
 * Find related contracts (e.g., proxy ↔ implementation).
 */
export function findRelatedContracts(contract: ContractInfo): ContractInfo[] {
  const all = getAllContracts();
  const related: ContractInfo[] = [];

  if (contract.type === "proxy" && contract.implementation) {
    const impl = getAddressMap().get(contract.implementation.toLowerCase());
    if (impl) related.push(impl);
  }

  // Find proxies pointing to this implementation
  if (contract.type === "implementation") {
    for (const c of all) {
      if (c.implementation?.toLowerCase() === contract.address.toLowerCase()) {
        related.push(c);
      }
    }
  }

  // Find contracts with similar base name
  const baseName = contract.name
    .replace(/Proxy\d?$/, "")
    .replace(/V\d+_?\d*$/, "")
    .replace(/_.*$/, "");
  if (baseName.length > 2) {
    for (const c of all) {
      if (c.address === contract.address) continue;
      if (c.name.startsWith(baseName)) {
        if (!related.find((r) => r.address === c.address)) {
          related.push(c);
        }
      }
    }
  }

  return related;
}
