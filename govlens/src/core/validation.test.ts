/**
 * Validation Utility Tests
 */

import { describe, test, expect } from "bun:test";
import {
  validateAddress,
  validateHex,
  validateSlot,
  validateSlug,
  validateChainId,
  validateNonNegativeInt,
  validateBlockNumber,
  safeParseBigInt,
  isPathSafe,
  formatError,
  extractRevertReason,
} from "./validation.js";

describe("validateAddress", () => {
  test("accepts valid address", () => {
    expect(validateAddress("0x1234567890abcdef1234567890abcdef12345678")).toBeNull();
  });

  test("rejects no 0x prefix", () => {
    expect(validateAddress("1234567890abcdef1234567890abcdef12345678")).not.toBeNull();
  });

  test("rejects wrong length", () => {
    expect(validateAddress("0x1234")).not.toBeNull();
  });

  test("rejects non-hex", () => {
    expect(validateAddress("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")).not.toBeNull();
  });
});

describe("validateHex", () => {
  test("accepts valid hex", () => {
    expect(validateHex("0xabcdef")).toBeNull();
    expect(validateHex("0x")).toBeNull();
  });

  test("rejects no prefix", () => {
    expect(validateHex("abcdef")).not.toBeNull();
  });
});

describe("validateSlot", () => {
  test("accepts valid slot", () => {
    const result = validateSlot("0");
    expect(result.error).toBeNull();
    expect(result.value).toBe(0n);
  });

  test("accepts hex slot", () => {
    const result = validateSlot("0xff");
    expect(result.error).toBeNull();
    expect(result.value).toBe(255n);
  });

  test("rejects negative slot", () => {
    const result = validateSlot("-1");
    expect(result.error).not.toBeNull();
  });

  test("rejects invalid string", () => {
    const result = validateSlot("not_a_number");
    expect(result.error).not.toBeNull();
  });
});

describe("validateSlug", () => {
  test("accepts valid slugs", () => {
    expect(validateSlug("aave")).toBeNull();
    expect(validateSlug("compound-v3")).toBeNull();
    expect(validateSlug("tokamak-network")).toBeNull();
  });

  test("rejects too short", () => {
    expect(validateSlug("a")).not.toBeNull();
  });

  test("rejects uppercase", () => {
    expect(validateSlug("Aave")).not.toBeNull();
  });

  test("rejects starting with hyphen", () => {
    expect(validateSlug("-aave")).not.toBeNull();
  });
});

describe("validateChainId", () => {
  test("accepts supported chains", () => {
    expect(validateChainId(1)).toBeNull();      // Ethereum
    expect(validateChainId(42161)).toBeNull();   // Arbitrum
    expect(validateChainId(10)).toBeNull();      // Optimism
    expect(validateChainId(8453)).toBeNull();    // Base
    expect(validateChainId(137)).toBeNull();     // Polygon
  });

  test("rejects unsupported chain", () => {
    expect(validateChainId(999)).not.toBeNull();
  });
});

describe("safeParseBigInt", () => {
  test("parses valid bigints", () => {
    expect(safeParseBigInt("123")).toBe(123n);
    expect(safeParseBigInt("0")).toBe(0n);
  });

  test("returns null for invalid", () => {
    expect(safeParseBigInt("")).toBeNull();
    expect(safeParseBigInt("abc")).toBeNull();
  });
});

describe("isPathSafe", () => {
  test("safe paths", () => {
    expect(isPathSafe("/base", "sub/file.txt")).toBe(true);
  });

  test("rejects traversal", () => {
    expect(isPathSafe("/base", "../etc/passwd")).toBe(false);
  });
});

describe("formatError", () => {
  test("formats Error objects", () => {
    expect(formatError(new Error("test"))).toBe("test");
  });

  test("formats strings", () => {
    expect(formatError("test")).toBe("test");
  });
});

describe("extractRevertReason", () => {
  test("extracts reason string", () => {
    const err = new Error("reverted with reason string 'insufficient balance'");
    expect(extractRevertReason(err)).toBe("insufficient balance");
  });

  test("extracts custom error", () => {
    const err = new Error("reverted with custom error 'InsufficientBalance()'");
    expect(extractRevertReason(err)).toBe("Custom error: InsufficientBalance()");
  });

  test("truncates long messages", () => {
    const err = new Error("x".repeat(500));
    expect(extractRevertReason(err).length).toBeLessThanOrEqual(300);
  });
});
