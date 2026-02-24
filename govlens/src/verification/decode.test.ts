/**
 * Calldata Decoding Tests
 */

import { describe, test, expect } from "bun:test";
import { decodeCalldata, decodeProposalCalldatas } from "./decode.js";
import type { Hex } from "viem";

describe("decodeCalldata", () => {
  test("decodes ERC20 transfer", () => {
    // transfer(address, uint256)
    // 0xa9059cbb + address (32 bytes) + amount (32 bytes)
    const data =
      "0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000000000000000064" as Hex;
    const result = decodeCalldata(data);
    expect(result).not.toBeNull();
    expect(result!.functionName).toBe("transfer");
  });

  test("decodes ERC20 approve", () => {
    const data =
      "0x095ea7b30000000000000000000000001234567890abcdef1234567890abcdef12345678ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" as Hex;
    const result = decodeCalldata(data);
    expect(result).not.toBeNull();
    expect(result!.functionName).toBe("approve");
  });

  test("returns unknown for unrecognized selector", () => {
    const data = "0xdeadbeef0000000000000000000000000000000000000000000000000000000000000001" as Hex;
    const result = decodeCalldata(data);
    expect(result).not.toBeNull();
    expect(result!.functionName).toBe("unknown_0xdeadbeef");
  });

  test("returns null for empty calldata", () => {
    expect(decodeCalldata("0x" as Hex)).toBeNull();
  });

  test("returns null for too short calldata", () => {
    expect(decodeCalldata("0xabcd" as Hex)).toBeNull();
  });
});

describe("decodeProposalCalldatas", () => {
  test("decodes array of calldatas", () => {
    const calldatas: Hex[] = [
      "0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000000000000000064",
      "0x095ea7b30000000000000000000000001234567890abcdef1234567890abcdef12345678ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    ];
    const results = decodeProposalCalldatas(calldatas);
    expect(results).toHaveLength(2);
    expect(results[0]!.functionName).toBe("transfer");
    expect(results[1]!.functionName).toBe("approve");
  });
});
