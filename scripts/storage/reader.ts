/**
 * Storage reading utilities using eth_getStorageAt
 */

import { createPublicClient, http, keccak256, encodePacked, pad, type Address, type Hex } from "viem";
import { mainnet } from "viem/chains";
import { EIP1967_SLOTS, OZ_PROXY_SLOTS, type StorageType } from "./types";

// Default to Alchemy, fallback to localhost anvil
const RPC_URL = process.env.ALCHEMY_RPC_URL || "http://127.0.0.1:8545";

export const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
});

/**
 * Read a single storage slot
 */
export async function readSlot(address: Address, slot: bigint | Hex): Promise<Hex> {
  const slotHex = typeof slot === "bigint" ? pad(`0x${slot.toString(16)}` as Hex, { size: 32 }) : slot;
  return client.getStorageAt({
    address,
    slot: slotHex,
  }) as Promise<Hex>;
}

/**
 * Calculate mapping slot: keccak256(abi.encode(key, slot))
 * For address keys: keccak256(abi.encodePacked(bytes32(key), bytes32(slot)))
 */
export function getMappingSlot(baseSlot: bigint, key: Address | bigint | Hex): Hex {
  const keyHex = typeof key === "bigint"
    ? pad(`0x${key.toString(16)}` as Hex, { size: 32 })
    : pad(key as Hex, { size: 32 });
  const slotHex = pad(`0x${baseSlot.toString(16)}` as Hex, { size: 32 });

  return keccak256(encodePacked(["bytes32", "bytes32"], [keyHex, slotHex]));
}

/**
 * Calculate nested mapping slot: keccak256(abi.encode(key2, keccak256(abi.encode(key1, slot))))
 */
export function getNestedMappingSlot(
  baseSlot: bigint,
  key1: Address | bigint | Hex,
  key2: Address | bigint | Hex
): Hex {
  const innerSlot = getMappingSlot(baseSlot, key1);
  const innerSlotBigInt = BigInt(innerSlot);
  return getMappingSlot(innerSlotBigInt, key2);
}

/**
 * Get dynamic array length from its slot
 */
export async function getArrayLength(address: Address, slot: bigint): Promise<bigint> {
  const value = await readSlot(address, slot);
  return BigInt(value);
}

/**
 * Calculate array element slot: keccak256(slot) + index
 */
export function getArrayElementSlot(baseSlot: bigint, index: number): Hex {
  const slotHex = pad(`0x${baseSlot.toString(16)}` as Hex, { size: 32 });
  const baseHash = BigInt(keccak256(slotHex));
  return pad(`0x${(baseHash + BigInt(index)).toString(16)}` as Hex, { size: 32 });
}

/**
 * Read array element at index
 */
export async function readArrayElement(
  address: Address,
  baseSlot: bigint,
  index: number
): Promise<Hex> {
  const elementSlot = getArrayElementSlot(baseSlot, index);
  return readSlot(address, elementSlot);
}

/**
 * Read all elements of a dynamic array
 */
export async function readArray(
  address: Address,
  slot: bigint,
  maxElements: number = 100
): Promise<Hex[]> {
  const length = await getArrayLength(address, slot);
  const count = Number(length) > maxElements ? maxElements : Number(length);
  const elements: Hex[] = [];

  for (let i = 0; i < count; i++) {
    const value = await readArrayElement(address, slot, i);
    elements.push(value);
  }

  return elements;
}

/**
 * Decode uint256 from storage
 */
export function decodeUint256(hex: Hex): bigint {
  return BigInt(hex);
}

/**
 * Decode address from storage (rightmost 20 bytes)
 */
export function decodeAddress(hex: Hex): Address {
  const cleanHex = hex.toLowerCase();
  return `0x${cleanHex.slice(-40)}` as Address;
}

/**
 * Decode bool from storage (0 or 1)
 */
export function decodeBool(hex: Hex): boolean {
  return BigInt(hex) !== 0n;
}

/**
 * Decode bytes32 from storage
 */
export function decodeBytes32(hex: Hex): Hex {
  return hex;
}

/**
 * Decode a packed slot with multiple variables at different offsets
 * Solidity packs multiple small variables into single slots
 */
export function decodePackedValue(hex: Hex, offset: number, numberOfBytes: number): Hex {
  // Convert to bytes array (without 0x prefix)
  const bytes = hex.slice(2);

  // Storage is big-endian, so offset 0 is at the right
  const startByte = 64 - (offset + numberOfBytes) * 2;
  const endByte = 64 - offset * 2;

  return `0x${bytes.slice(startByte, endByte)}` as Hex;
}

/**
 * Decode value based on type
 */
export function decodeValue(
  hex: Hex,
  typeInfo: StorageType,
  offset: number = 0
): string | bigint | boolean | null {
  const numberOfBytes = parseInt(typeInfo.numberOfBytes);

  // Extract packed value if needed
  const value = offset > 0 || numberOfBytes < 32
    ? decodePackedValue(hex, offset, numberOfBytes)
    : hex;

  const encoding = typeInfo.encoding;
  const label = typeInfo.label || "";

  if (encoding === "mapping" || encoding === "dynamic_array") {
    // These need special handling - return slot reference
    return `<${encoding} at slot>`;
  }

  if (label.includes("uint") || label.includes("int")) {
    return BigInt(value);
  }

  if (label === "address" || label === "t_address") {
    return decodeAddress(value);
  }

  if (label === "bool" || label === "t_bool") {
    return decodeBool(value);
  }

  if (label.includes("bytes32") || label.includes("t_bytes32")) {
    return decodeBytes32(value);
  }

  if (label.includes("string") || label.includes("bytes")) {
    // Dynamic bytes/string - complex decoding
    const length = BigInt(value);
    if (length === 0n) return "";
    // If length is odd, data is stored inline
    // If even, data is at keccak256(slot)
    return `<dynamic string/bytes, length indicator: ${length}>`;
  }

  // Default: return as bigint
  return BigInt(value);
}

/**
 * Get implementation address for proxy contracts
 */
export async function getProxyImplementation(proxyAddress: Address): Promise<Address | null> {
  // Try EIP-1967 slot first
  let implSlot = await readSlot(proxyAddress, EIP1967_SLOTS.IMPLEMENTATION as Hex);
  let impl = decodeAddress(implSlot);

  if (impl !== "0x0000000000000000000000000000000000000000") {
    return impl;
  }

  // Try OpenZeppelin legacy slot
  implSlot = await readSlot(proxyAddress, OZ_PROXY_SLOTS.IMPLEMENTATION_LEGACY as Hex);
  impl = decodeAddress(implSlot);

  if (impl !== "0x0000000000000000000000000000000000000000") {
    return impl;
  }

  return null;
}

/**
 * Get proxy admin address
 */
export async function getProxyAdmin(proxyAddress: Address): Promise<Address | null> {
  const adminSlot = await readSlot(proxyAddress, EIP1967_SLOTS.ADMIN as Hex);
  const admin = decodeAddress(adminSlot);

  if (admin !== "0x0000000000000000000000000000000000000000") {
    return admin;
  }

  return null;
}

/**
 * Read multiple slots in batch
 */
export async function readSlots(
  address: Address,
  slots: (bigint | Hex)[]
): Promise<Map<string, Hex>> {
  const results = new Map<string, Hex>();

  // Read in parallel batches
  const batchSize = 50;
  for (let i = 0; i < slots.length; i += batchSize) {
    const batch = slots.slice(i, i + batchSize);
    const promises = batch.map((slot) => readSlot(address, slot));
    const values = await Promise.all(promises);

    batch.forEach((slot, idx) => {
      const slotKey = typeof slot === "bigint" ? slot.toString() : slot;
      results.set(slotKey, values[idx]);
    });
  }

  return results;
}

/**
 * Get current block number
 */
export async function getCurrentBlock(): Promise<bigint> {
  return client.getBlockNumber();
}
