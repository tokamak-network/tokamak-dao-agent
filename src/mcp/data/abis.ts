/**
 * ABI loader from compiled contract artifacts (contracts/out/)
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

const OUT_DIR = join(import.meta.dir, "../../../contracts/out");

let _abiCache: Map<string, any[]> | null = null;

/**
 * Load ABI for a specific contract name.
 * Searches contracts/out/{ContractName}.sol/{ContractName}.json
 */
export function loadAbi(contractName: string): any[] | null {
  const filePath = join(OUT_DIR, `${contractName}.sol`, `${contractName}.json`);
  if (!existsSync(filePath)) return null;

  try {
    const json = JSON.parse(readFileSync(filePath, "utf-8"));
    return json.abi || null;
  } catch {
    return null;
  }
}

/**
 * Load all ABIs from contracts/out/ into a map.
 * Key: contract name, Value: ABI array
 */
export function loadAllAbis(): Map<string, any[]> {
  if (_abiCache) return _abiCache;
  _abiCache = new Map();

  if (!existsSync(OUT_DIR)) return _abiCache;

  for (const entry of readdirSync(OUT_DIR)) {
    if (!entry.endsWith(".sol")) continue;
    const dir = join(OUT_DIR, entry);
    if (!statSync(dir).isDirectory()) continue;

    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const json = JSON.parse(readFileSync(join(dir, file), "utf-8"));
        if (json.abi && Array.isArray(json.abi)) {
          const name = file.replace(".json", "");
          if (!_abiCache.has(name)) {
            _abiCache.set(name, json.abi);
          }
        }
      } catch {}
    }
  }

  return _abiCache;
}

/**
 * Get view/pure functions from an ABI.
 */
export function getViewFunctions(abi: any[]): any[] {
  return abi.filter(
    (item: any) =>
      item.type === "function" &&
      (item.stateMutability === "view" || item.stateMutability === "pure")
  );
}
