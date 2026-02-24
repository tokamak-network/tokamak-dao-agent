/**
 * Validation Utilities
 *
 * Protocol-agnostic validators for EVM addresses, hex values,
 * storage slots, and other common inputs.
 */

import { resolve, relative } from "node:path";

// ─── Address Validation ──────────────────────────────────────

export function validateAddress(addr: string): string | null {
  if (!addr.startsWith("0x")) return "Invalid address: must start with '0x'";
  if (addr.length !== 42) return "Invalid address: must be 42 characters";
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr))
    return "Invalid address: contains non-hex characters";
  return null;
}

// ─── Hex Validation ──────────────────────────────────────────

export function validateHex(hex: string, label = "value"): string | null {
  if (!hex.startsWith("0x"))
    return `Invalid ${label}: must start with '0x'`;
  if (!/^0x[0-9a-fA-F]*$/.test(hex))
    return `Invalid ${label}: contains non-hex characters`;
  return null;
}

// ─── Slot Validation ─────────────────────────────────────────

export function validateSlot(
  slot: string,
): { value: bigint; error: string | null } {
  try {
    const value = BigInt(slot);
    if (value < 0n) return { value: 0n, error: "Slot must be non-negative" };
    const MAX_SLOT = 2n ** 256n - 1n;
    if (value > MAX_SLOT)
      return { value: 0n, error: "Slot exceeds maximum (2^256 - 1)" };
    return { value, error: null };
  } catch {
    return { value: 0n, error: `Cannot parse slot '${slot}'` };
  }
}

// ─── Numeric Validation ──────────────────────────────────────

export function validateNonNegativeInt(
  value: number,
  label: string,
): string | null {
  if (!Number.isInteger(value)) return `Invalid ${label}: must be integer`;
  if (value < 0) return `Invalid ${label}: must be non-negative`;
  return null;
}

export function validateBlockNumber(value: number): string | null {
  if (!Number.isInteger(value))
    return "Invalid block_number: must be integer";
  if (value < 1) return "Invalid block_number: must be >= 1";
  return null;
}

export function safeParseBigInt(value: string): bigint | null {
  if (!value || value.trim() === "") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

// ─── Path Safety ─────────────────────────────────────────────

export function isPathSafe(basePath: string, targetPath: string): boolean {
  const resolvedBase = resolve(basePath);
  const resolvedTarget = resolve(basePath, targetPath);
  const relativePath = relative(resolvedBase, resolvedTarget);
  return !relativePath.startsWith("..") && !relativePath.startsWith("/");
}

// ─── Error Formatting ────────────────────────────────────────

export function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function extractRevertReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const reasonMatch = message.match(
    /reverted with reason string ['"]([^'"]+)['"]/,
  );
  if (reasonMatch) return reasonMatch[1]!;
  const customMatch = message.match(
    /reverted with custom error ['"]([^'"]+)['"]/,
  );
  if (customMatch) return `Custom error: ${customMatch[1]}`;
  return message.slice(0, 300);
}

// ─── Tenant Slug Validation ──────────────────────────────────

export function validateSlug(slug: string): string | null {
  if (slug.length < 2) return "Slug must be at least 2 characters";
  if (slug.length > 64) return "Slug must be at most 64 characters";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug))
    return "Slug must be lowercase alphanumeric with hyphens, not starting/ending with hyphen";
  return null;
}

// ─── Chain ID Validation ─────────────────────────────────────

const SUPPORTED_CHAIN_IDS = new Set([1, 42161, 10, 8453, 137]);

export function validateChainId(chainId: number): string | null {
  if (!Number.isInteger(chainId)) return "Chain ID must be an integer";
  if (!SUPPORTED_CHAIN_IDS.has(chainId))
    return `Unsupported chain ID: ${chainId}. Supported: ${[...SUPPORTED_CHAIN_IDS].join(", ")}`;
  return null;
}
