/**
 * Common validation utilities for MCP tools
 */

import { resolve, relative } from "path";

/**
 * Validate Ethereum address format.
 * Returns null if valid, error message if invalid.
 */
export function validateAddress(addr: string): string | null {
  if (!addr.startsWith("0x")) {
    return `Invalid address: must start with '0x' (got '${addr.slice(0, 10)}...')`;
  }
  if (addr.length !== 42) {
    return `Invalid address: must be 42 characters (got ${addr.length})`;
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return `Invalid address: contains non-hex characters`;
  }
  return null;
}

/**
 * Validate hex string format.
 * Returns null if valid, error message if invalid.
 */
export function validateHex(hex: string, label: string = "value"): string | null {
  if (!hex.startsWith("0x")) {
    return `Invalid ${label}: must start with '0x'`;
  }
  if (!/^0x[0-9a-fA-F]*$/.test(hex)) {
    return `Invalid ${label}: contains non-hex characters`;
  }
  return null;
}

/**
 * Validate storage slot value.
 * Must be non-negative and less than 2^256.
 */
export function validateSlot(slot: string): { value: bigint; error: string | null } {
  try {
    let value: bigint;
    if (slot.startsWith("0x")) {
      value = BigInt(slot);
    } else {
      if (!/^[0-9]+$/.test(slot)) {
        return { value: 0n, error: `Invalid slot: must be a number or hex (got '${slot}')` };
      }
      value = BigInt(slot);
    }
    if (value < 0n) {
      return { value: 0n, error: `Invalid slot: must be non-negative` };
    }
    // Max storage slot is 2^256 - 1
    const MAX_SLOT = 2n ** 256n - 1n;
    if (value > MAX_SLOT) {
      return { value: 0n, error: `Invalid slot: exceeds maximum (2^256 - 1)` };
    }
    return { value, error: null };
  } catch {
    return { value: 0n, error: `Invalid slot: cannot parse '${slot}' as number` };
  }
}

/**
 * Safe BigInt parsing. Returns null on failure.
 */
export function safeParseBigInt(value: string): bigint | null {
  if (!value || value.trim() === "") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Check if target path is safely within base directory.
 * Prevents path traversal attacks.
 */
export function isPathSafe(basePath: string, targetPath: string): boolean {
  const resolvedBase = resolve(basePath);
  const resolvedTarget = resolve(basePath, targetPath);

  // Target must be within base directory
  const relativePath = relative(resolvedBase, resolvedTarget);

  // If relative path starts with '..' or is absolute, it's outside base
  if (relativePath.startsWith("..") || relativePath.startsWith("/")) {
    return false;
  }

  // Also check that the resolved path actually starts with base
  return resolvedTarget.startsWith(resolvedBase + "/") || resolvedTarget === resolvedBase;
}

/**
 * Validate integer is non-negative.
 */
export function validateNonNegativeInt(value: number, label: string): string | null {
  if (!Number.isInteger(value)) {
    return `Invalid ${label}: must be an integer`;
  }
  if (value < 0) {
    return `Invalid ${label}: must be non-negative (got ${value})`;
  }
  return null;
}

/**
 * Validate block number.
 */
export function validateBlockNumber(value: number): string | null {
  if (!Number.isInteger(value)) {
    return `Invalid block_number: must be an integer`;
  }
  if (value < 1) {
    return `Invalid block_number: must be >= 1 (got ${value})`;
  }
  return null;
}

/**
 * Format unknown error to string message.
 */
export function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
