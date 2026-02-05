/**
 * read_storage_slot and read_contract_state tools
 */

import { z } from "zod";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { pad, type Address, type Hex } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import { getContractByName, getAllContracts } from "../data/contracts.ts";
import type { StorageLayout, StorageType } from "../../../scripts/storage/types.ts";
import {
  getMappingSlot,
  decodeValue,
  decodeAddress,
  decodePackedValue,
} from "../../../scripts/storage/reader.ts";

const LAYOUTS_DIR = join(import.meta.dir, "../../../scripts/storage/layouts");

interface LayoutFile {
  contractAddress: string;
  contractName: string;
  implementationName: string;
  isProxy: boolean;
  implementationAddress: string | null;
  layout: StorageLayout;
}

function loadLayout(contractName: string): LayoutFile | null {
  if (!existsSync(LAYOUTS_DIR)) return null;
  const files = readdirSync(LAYOUTS_DIR);
  const match = files.find(
    (f) => f.toLowerCase() === `${contractName.toLowerCase()}.json`
  );
  if (!match) return null;
  return JSON.parse(readFileSync(join(LAYOUTS_DIR, match), "utf-8"));
}

async function readSlotDirect(address: Address, slot: Hex): Promise<Hex> {
  return publicClient.getStorageAt({
    address,
    slot,
  }) as Promise<Hex>;
}

function decodeSimpleValue(hex: Hex, typeInfo: StorageType, offset: number = 0): string {
  try {
    const val = decodeValue(hex, typeInfo, offset);
    if (val === null) return "null";
    if (typeof val === "bigint") return val.toString();
    return String(val);
  } catch {
    return hex;
  }
}

export async function handleReadStorageSlot(args: {
  address: string;
  slot: string;
  decode_as?: "uint256" | "address" | "bool" | "bytes32" | "raw";
  mapping_key?: string;
}): Promise<string> {
  let slotHex: Hex;
  if (args.slot.startsWith("0x")) {
    slotHex = pad(args.slot as Hex, { size: 32 });
  } else {
    slotHex = pad(`0x${BigInt(args.slot).toString(16)}` as Hex, { size: 32 });
  }

  if (args.mapping_key) {
    const baseSlot = BigInt(slotHex);
    slotHex = getMappingSlot(baseSlot, args.mapping_key as Address);
  }

  const rawValue = await readSlotDirect(args.address as Address, slotHex);
  const lines = [`**Slot**: ${slotHex}`, `**Raw**: ${rawValue}`];

  if (args.decode_as && args.decode_as !== "raw") {
    let decoded: string;
    switch (args.decode_as) {
      case "uint256":
        decoded = BigInt(rawValue).toString();
        break;
      case "address":
        decoded = decodeAddress(rawValue);
        break;
      case "bool":
        decoded = BigInt(rawValue) !== 0n ? "true" : "false";
        break;
      case "bytes32":
        decoded = rawValue;
        break;
    }
    lines.push(`**Decoded (${args.decode_as})**: ${decoded}`);
  }

  return lines.join("\n");
}

export async function handleReadContractState(args: {
  contract_name: string;
  variables?: string[];
}): Promise<string> {
  const contract = getContractByName(args.contract_name);
  if (!contract) {
    const available = getAllContracts().map((c) => c.name);
    return `Contract "${args.contract_name}" not found.\n\nAvailable: ${available.join(", ")}`;
  }

  const layout = loadLayout(args.contract_name);
  if (!layout) {
    const available = existsSync(LAYOUTS_DIR)
      ? readdirSync(LAYOUTS_DIR).map((f) => f.replace(".json", ""))
      : [];
    return `No storage layout found for "${args.contract_name}".\n\nAvailable layouts: ${available.join(", ")}`;
  }

  const readAddress = (
    layout.isProxy && contract.type === "implementation"
      ? getAllContracts().find(
          (c) => c.implementation?.toLowerCase() === contract.address.toLowerCase()
        )?.address
      : contract.address
  ) || contract.address;

  const storageSlots = layout.layout.storage;
  const filteredSlots = args.variables
    ? storageSlots.filter((s) => args.variables!.some((v) => s.label.toLowerCase() === v.toLowerCase()))
    : storageSlots;

  const lines: string[] = [
    `## ${args.contract_name} Storage State`,
    `**Address**: ${readAddress}`,
    "",
  ];

  for (const slot of filteredSlots) {
    const typeInfo = layout.layout.types[slot.type];
    if (!typeInfo) continue;

    if (!args.variables && (typeInfo.encoding === "mapping" || typeInfo.encoding === "dynamic_array")) {
      lines.push(`- **${slot.label}** (slot ${slot.slot}): <${typeInfo.encoding}> — use read_storage_slot with mapping_key`);
      continue;
    }

    if (typeInfo.encoding === "mapping" || typeInfo.encoding === "dynamic_array") {
      lines.push(`- **${slot.label}** (slot ${slot.slot}): <${typeInfo.encoding}> — use read_storage_slot with mapping_key`);
      continue;
    }

    try {
      const slotHex = pad(`0x${BigInt(slot.slot).toString(16)}` as Hex, { size: 32 });
      const rawValue = await readSlotDirect(readAddress as Address, slotHex);
      const decoded = decodeSimpleValue(rawValue, typeInfo, slot.offset);
      lines.push(`- **${slot.label}** (slot ${slot.slot}): ${decoded} [${typeInfo.label || slot.type}]`);
    } catch (err) {
      lines.push(`- **${slot.label}** (slot ${slot.slot}): error reading`);
    }
  }

  return lines.join("\n");
}

export function registerStorageTools(server: McpServer) {
  server.tool(
    "read_storage_slot",
    "Read a raw storage slot from any Ethereum contract. Optionally decode the value.",
    {
      address: z.string().describe("Contract address (0x...)"),
      slot: z.string().describe("Storage slot number or hex (e.g. '5' or '0x05')"),
      decode_as: z.enum(["uint256", "address", "bool", "bytes32", "raw"]).optional().describe("How to decode the raw value"),
      mapping_key: z.string().optional().describe("If the slot is a mapping, provide the key to compute the actual slot"),
    },
    async ({ address, slot, decode_as, mapping_key }) => {
      const text = await handleReadStorageSlot({ address, slot, decode_as, mapping_key });
      return { content: [{ type: "text" as const, text }] };
    }
  );

  server.tool(
    "read_contract_state",
    "Read and decode all storage variables of a known Tokamak contract using its storage layout.",
    {
      contract_name: z.string().describe("Contract name (e.g. SeigManager, DepositManager, DAOAgendaManager)"),
      variables: z.array(z.string()).optional().describe("Specific variable names to read. If omitted, reads all simple (non-mapping, non-array) variables."),
    },
    async ({ contract_name, variables }) => {
      const text = await handleReadContractState({ contract_name, variables });
      return { content: [{ type: "text" as const, text }] };
    }
  );
}
