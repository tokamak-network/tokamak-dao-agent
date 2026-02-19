/**
 * check_upgrade_path tool — Verify if a Tokamak proxy can be upgraded by the DAO
 *
 * Checks on-chain: proxy type, current implementation, admin roles, upgrade functions.
 */

import { z } from "zod";
import { type Address, type Hex, zeroHash, isAddress, getAddress } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publicClient } from "../client.ts";
import {
  getContractByName,
  getContractByAddress,
  searchContracts,
  getAllContracts,
  enrichAddress,
} from "../data/contracts.ts";
import { findDaoAction } from "../data/dao-actions.ts";
import { formatError } from "./validation.ts";
import type { ContractInfo } from "../../../scripts/storage/types.ts";

// ── Constants ──

const DAO_COMMITTEE_PROXY = "0xDD9f0cCc044B0781289Ee318e5971b0139602C26";
const DEFAULT_ADMIN_ROLE = zeroHash; // bytes32(0)

// EIP-1967 storage slots
const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;
const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103" as Hex;

// ── Inline ABIs (no compiled artifact dependency) ──

const PROXY_ABI = [
  {
    type: "function",
    name: "implementation",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "implementation2",
    inputs: [{ type: "uint256", name: "slot" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pauseProxy",
    inputs: [],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

const ACCESS_CONTROL_ABI = [
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { type: "bytes32", name: "role" },
      { type: "address", name: "account" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoleMemberCount",
    inputs: [{ type: "bytes32", name: "role" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRoleMember",
    inputs: [
      { type: "bytes32", name: "role" },
      { type: "uint256", name: "index" },
    ],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

const OWNABLE_ABI = [
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

// ── Types ──

type ProxyType = "tokamak_slot0" | "eip1967" | "unknown";

interface ProxyInfo {
  proxyAddress: Address;
  proxyName: string;
  proxyType: ProxyType;
  implementations: { slot: number; address: Address; name: string }[];
  paused: boolean | null;
  admins: Address[];
  adminSource: string; // how admins were discovered
  upgradeFunction: string;
  eip1967Admin: Address | null; // for EIP-1967 proxies
  owner: Address | null; // Ownable fallback
}

// ── Helper: safe on-chain call ──

async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

// ── Step 1: Resolve proxy from user input ──

function resolveProxy(input: string): {
  proxy: ContractInfo | null;
  address: Address | null;
  error: string | null;
} {
  const trimmed = input.trim();

  // Address input
  if (trimmed.startsWith("0x") && trimmed.length === 42) {
    if (!isAddress(trimmed)) {
      return { proxy: null, address: null, error: `Invalid address: ${trimmed}` };
    }
    const addr = getAddress(trimmed);
    const contract = getContractByAddress(addr);
    if (!contract) {
      // Not in registry — will check on-chain
      return { proxy: null, address: addr, error: null };
    }
    if (contract.type === "proxy") {
      return { proxy: contract, address: addr, error: null };
    }
    if (contract.type === "implementation") {
      // Find proxy that points to this implementation
      const proxy = getAllContracts().find(
        (c) => c.type === "proxy" && c.implementation?.toLowerCase() === addr.toLowerCase()
      );
      if (proxy) {
        return { proxy, address: proxy.address as Address, error: null };
      }
      return {
        proxy: null,
        address: null,
        error: `"${contract.name}" is an implementation contract, but no proxy found pointing to it.`,
      };
    }
    return {
      proxy: null,
      address: null,
      error: `"${contract.name}" is a ${contract.type}, not an upgradeable proxy.`,
    };
  }

  // Name input
  let contract = getContractByName(trimmed);

  // If found and is a proxy, use it directly
  if (contract?.type === "proxy") {
    return { proxy: contract, address: contract.address as Address, error: null };
  }

  // If it's an implementation, find its proxy
  if (contract?.type === "implementation") {
    const proxy = getAllContracts().find(
      (c) =>
        c.type === "proxy" &&
        c.implementation?.toLowerCase() === contract!.address.toLowerCase()
    );
    if (proxy) {
      return { proxy, address: proxy.address as Address, error: null };
    }
    // Try name-based: DepositManager → DepositManagerProxy
    const baseName = contract.name.replace(/V\d+_?\d*$/, "");
    const proxyByName = getContractByName(`${baseName}Proxy`);
    if (proxyByName?.type === "proxy") {
      return { proxy: proxyByName, address: proxyByName.address as Address, error: null };
    }
    return {
      proxy: null,
      address: null,
      error: `"${contract.name}" is an implementation contract, but no proxy found for it.`,
    };
  }

  // Not found — try appending "Proxy"
  if (!contract) {
    contract = getContractByName(`${trimmed}Proxy`);
    if (contract?.type === "proxy") {
      return { proxy: contract, address: contract.address as Address, error: null };
    }
  }

  // Search
  if (!contract) {
    const results = searchContracts(trimmed);
    const proxyResult = results.find((c) => c.type === "proxy");
    if (proxyResult) {
      return { proxy: proxyResult, address: proxyResult.address as Address, error: null };
    }
    const implResult = results.find((c) => c.type === "implementation");
    if (implResult) {
      const proxy = getAllContracts().find(
        (c) =>
          c.type === "proxy" &&
          c.implementation?.toLowerCase() === implResult.address.toLowerCase()
      );
      if (proxy) {
        return { proxy, address: proxy.address as Address, error: null };
      }
    }
    if (results.length > 0) {
      const names = results.map((c) => `- ${c.name} (${c.type})`).join("\n");
      return {
        proxy: null,
        address: null,
        error: `No proxy found for "${trimmed}". Related contracts:\n${names}`,
      };
    }
    return {
      proxy: null,
      address: null,
      error: `Contract "${trimmed}" not found in registry. Use get_contract_info to search, or provide a raw address.`,
    };
  }

  // Found but not proxy/implementation
  return {
    proxy: null,
    address: null,
    error: `"${contract.name}" is a ${contract.type}, not an upgradeable proxy.`,
  };
}

// ── Step 2: Detect proxy type ──

async function detectProxyType(
  address: Address,
  proxyName?: string
): Promise<{
  type: ProxyType;
  upgradeFunction: string;
}> {
  // Try Tokamak slot0: implementation()
  const implAddr = await safeCall(() =>
    publicClient.readContract({
      address,
      abi: PROXY_ABI,
      functionName: "implementation",
    })
  );

  if (implAddr && implAddr !== "0x0000000000000000000000000000000000000000") {
    // Tokamak slot0 pattern
    if (proxyName === "DAOCommitteeProxy") {
      return { type: "tokamak_slot0", upgradeFunction: "upgradeTo(address)" };
    }
    if (proxyName === "DAOCommitteeProxy2") {
      return { type: "tokamak_slot0", upgradeFunction: "upgradeTo2(address)" };
    }
    return { type: "tokamak_slot0", upgradeFunction: "upgradeTo(address)" };
  }

  // Special case: implementation() returns zero but name indicates a known proxy
  if (implAddr === "0x0000000000000000000000000000000000000000" && proxyName) {
    if (proxyName === "DAOCommitteeProxy2") {
      return { type: "tokamak_slot0", upgradeFunction: "upgradeTo2(address)" };
    }
  }

  // Try EIP-1967: read implementation storage slot
  const eip1967Impl = await safeCall(() =>
    publicClient.getStorageAt({ address, slot: EIP1967_IMPL_SLOT })
  );
  if (eip1967Impl && eip1967Impl !== "0x" + "00".repeat(32)) {
    return {
      type: "eip1967",
      upgradeFunction: "upgradeTo(address) or upgradeToAndCall(address,bytes)",
    };
  }

  return { type: "unknown", upgradeFunction: "N/A" };
}

// ── Step 3: Query on-chain data ──

async function queryProxyInfo(
  address: Address,
  proxyName: string,
  proxyType: ProxyType,
  upgradeFunction: string
): Promise<ProxyInfo> {
  const info: ProxyInfo = {
    proxyAddress: address,
    proxyName,
    proxyType,
    implementations: [],
    paused: null,
    admins: [],
    adminSource: "none",
    upgradeFunction,
    eip1967Admin: null,
    owner: null,
  };

  if (proxyType === "tokamak_slot0") {
    // Parallel queries
    const [impl0, impl1, paused] = await Promise.allSettled([
      publicClient.readContract({
        address,
        abi: PROXY_ABI,
        functionName: "implementation",
      }),
      publicClient.readContract({
        address,
        abi: PROXY_ABI,
        functionName: "implementation2",
        args: [1n],
      }),
      publicClient.readContract({
        address,
        abi: PROXY_ABI,
        functionName: "pauseProxy",
      }),
    ]);

    if (impl0.status === "fulfilled" && impl0.value) {
      const addr = impl0.value as Address;
      const name = getContractByAddress(addr)?.name ?? "Unknown";
      info.implementations.push({ slot: 0, address: addr, name });
    }
    if (impl1.status === "fulfilled" && impl1.value) {
      const addr = impl1.value as Address;
      if (addr !== "0x0000000000000000000000000000000000000000") {
        const name = getContractByAddress(addr)?.name ?? "Unknown";
        info.implementations.push({ slot: 1, address: addr, name });
      }
    }
    if (paused.status === "fulfilled") {
      info.paused = paused.value as boolean;
    }

    // Enumerate admins via AccessControl
    await enumerateAdmins(address, info);
  } else if (proxyType === "eip1967") {
    // Read implementation from EIP-1967 slot
    const implSlotData = await safeCall(() =>
      publicClient.getStorageAt({ address, slot: EIP1967_IMPL_SLOT })
    );
    if (implSlotData) {
      const implAddr = ("0x" + implSlotData.slice(26)) as Address;
      if (implAddr !== "0x0000000000000000000000000000000000000000") {
        const name = getContractByAddress(implAddr)?.name ?? "Unknown";
        info.implementations.push({ slot: 0, address: getAddress(implAddr), name });
      }
    }

    // Read admin from EIP-1967 admin slot
    const adminSlotData = await safeCall(() =>
      publicClient.getStorageAt({ address, slot: EIP1967_ADMIN_SLOT })
    );
    if (adminSlotData) {
      const adminAddr = ("0x" + adminSlotData.slice(26)) as Address;
      if (adminAddr !== "0x0000000000000000000000000000000000000000") {
        info.eip1967Admin = getAddress(adminAddr);
        info.admins.push(info.eip1967Admin);
        info.adminSource = "EIP-1967 admin slot";
      }
    }

    // Fallback: owner()
    if (info.admins.length === 0) {
      const ownerAddr = await safeCall(() =>
        publicClient.readContract({
          address,
          abi: OWNABLE_ABI,
          functionName: "owner",
        })
      );
      if (ownerAddr && ownerAddr !== "0x0000000000000000000000000000000000000000") {
        info.owner = ownerAddr as Address;
        info.admins.push(info.owner);
        info.adminSource = "Ownable.owner()";
      }
    }

    // Also try AccessControl
    if (info.admins.length === 0) {
      await enumerateAdmins(address, info);
    }
  }

  return info;
}

async function enumerateAdmins(address: Address, info: ProxyInfo): Promise<void> {
  // Try getRoleMemberCount first
  const count = await safeCall(() =>
    publicClient.readContract({
      address,
      abi: ACCESS_CONTROL_ABI,
      functionName: "getRoleMemberCount",
      args: [DEFAULT_ADMIN_ROLE],
    })
  );

  if (count !== null && typeof count === "bigint") {
    info.adminSource = "AccessControl.getRoleMemberCount";
    const n = Number(count);
    const memberPromises = Array.from({ length: n }, (_, i) =>
      safeCall(() =>
        publicClient.readContract({
          address,
          abi: ACCESS_CONTROL_ABI,
          functionName: "getRoleMember",
          args: [DEFAULT_ADMIN_ROLE, BigInt(i)],
        })
      )
    );
    const members = await Promise.all(memberPromises);
    for (const m of members) {
      if (m) info.admins.push(m as Address);
    }
    return;
  }

  // Fallback: check if DAO has the role
  const daoHasRole = await safeCall(() =>
    publicClient.readContract({
      address,
      abi: ACCESS_CONTROL_ABI,
      functionName: "hasRole",
      args: [DEFAULT_ADMIN_ROLE, DAO_COMMITTEE_PROXY as Address],
    })
  );

  if (daoHasRole === true) {
    info.admins.push(DAO_COMMITTEE_PROXY as Address);
    info.adminSource = "AccessControl.hasRole (DAO confirmed)";
  } else if (daoHasRole === false) {
    info.adminSource = "AccessControl.hasRole (DAO not admin)";
  } else {
    // AccessControl not supported, try owner()
    const ownerAddr = await safeCall(() =>
      publicClient.readContract({
        address,
        abi: OWNABLE_ABI,
        functionName: "owner",
      })
    );
    if (ownerAddr && ownerAddr !== "0x0000000000000000000000000000000000000000") {
      info.owner = ownerAddr as Address;
      info.admins.push(info.owner);
      info.adminSource = "Ownable.owner()";
    } else {
      info.adminSource = "Unable to determine (no AccessControl, no Ownable)";
    }
  }
}

// ── Step 4: Determine verdict ──

interface Verdict {
  canUpgrade: boolean;
  reason: string;
  isSelfUpgrade: boolean;
}

function determineVerdict(info: ProxyInfo): Verdict {
  const daoLower = DAO_COMMITTEE_PROXY.toLowerCase();

  // Self-upgrade: proxy is the DAO itself
  const isSelfUpgrade = info.proxyAddress.toLowerCase() === daoLower;

  if (info.proxyType === "unknown") {
    return {
      canUpgrade: false,
      reason: "Proxy pattern not detected. This contract may not be upgradeable.",
      isSelfUpgrade,
    };
  }

  // Check if DAO is among admins
  const daoIsAdmin = info.admins.some((a) => a.toLowerCase() === daoLower);

  if (daoIsAdmin) {
    if (isSelfUpgrade) {
      return {
        canUpgrade: true,
        reason:
          "The DAO (DAOCommitteeProxy) is the proxy itself. It can upgrade its own implementation via a DAO proposal.",
        isSelfUpgrade,
      };
    }
    return {
      canUpgrade: true,
      reason: "The DAO (DAOCommitteeProxy) has admin role on this proxy and can upgrade it via a DAO proposal.",
      isSelfUpgrade,
    };
  }

  // DAO is not admin
  if (info.admins.length > 0) {
    const adminList = info.admins.map((a) => enrichAddress(a)).join(", ");
    return {
      canUpgrade: false,
      reason: `The DAO is NOT an admin of this proxy. Current admin(s): ${adminList}. A direct request to the admin is required.`,
      isSelfUpgrade,
    };
  }

  return {
    canUpgrade: false,
    reason:
      "Could not determine admin of this proxy. The DAO may not be able to upgrade it. Manual investigation required.",
    isSelfUpgrade,
  };
}

// ── Step 5: Format output ──

function formatOutput(info: ProxyInfo, verdict: Verdict): string {
  const lines: string[] = [];

  // Verdict banner
  if (verdict.canUpgrade) {
    lines.push(`## ✅ VERDICT: CAN be upgraded by DAO`);
  } else {
    lines.push(`## ❌ VERDICT: CANNOT be upgraded by DAO`);
  }
  lines.push("");

  if (verdict.isSelfUpgrade) {
    lines.push("> **Note**: This proxy IS the DAO (DAOCommitteeProxy). Self-upgrade via proposal.");
    lines.push("");
  }

  // Properties table
  lines.push("| Property | Value |");
  lines.push("|----------|-------|");
  lines.push(`| **Proxy** | ${enrichAddress(info.proxyAddress)} |`);
  lines.push(`| **Proxy Type** | ${formatProxyType(info.proxyType)} |`);

  for (const impl of info.implementations) {
    const slotLabel = info.implementations.length > 1 ? ` (slot ${impl.slot})` : "";
    const implDisplay =
      impl.address === "0x0000000000000000000000000000000000000000"
        ? "⚠️ Zero address (uninitialized)"
        : `${enrichAddress(impl.address)}`;
    lines.push(`| **Implementation${slotLabel}** | ${implDisplay} |`);
  }
  if (info.implementations.length === 0) {
    lines.push(`| **Implementation** | ⚠️ Not detected |`);
  }

  lines.push(`| **Upgrade Function** | \`${info.upgradeFunction}\` |`);

  if (info.paused !== null) {
    lines.push(`| **Paused** | ${info.paused ? "⚠️ YES" : "No"} |`);
  }

  lines.push(`| **DAO is Admin** | ${verdict.canUpgrade ? "Yes" : "No"} |`);
  lines.push(`| **Admin Source** | ${info.adminSource} |`);
  lines.push("");

  // Admin list
  if (info.admins.length > 0) {
    lines.push(`### Admins (${info.admins.length})`);
    for (const admin of info.admins) {
      const isDao = admin.toLowerCase() === DAO_COMMITTEE_PROXY.toLowerCase();
      lines.push(`- ${enrichAddress(admin)}${isDao ? " ← **DAO**" : ""}`);
    }
    lines.push("");
  }

  // EIP-1967 ProxyAdmin note
  if (info.eip1967Admin) {
    // Check if admin is a contract (ProxyAdmin pattern)
    lines.push(`### EIP-1967 Admin`);
    lines.push(
      `The proxy admin is ${enrichAddress(info.eip1967Admin)}. ` +
        `If this is a ProxyAdmin contract, upgrades go through it (not direct calls to the proxy).`
    );
    lines.push("");
  }

  // Reasoning
  lines.push(`### Reasoning`);
  lines.push(verdict.reason);
  lines.push("");

  // Action guidance
  if (verdict.canUpgrade) {
    lines.push(`### Upgrade Procedure`);
    lines.push(`1. Deploy new implementation contract`);
    lines.push(`2. Create DAO proposal calling \`${info.upgradeFunction}\` on ${enrichAddress(info.proxyAddress)}`);
    lines.push(`3. Pass the new implementation address as argument`);
    if (info.paused) {
      lines.push(`4. ⚠️ Proxy is currently paused — may need to unpause first`);
    }

    // Check DAO action registry
    const daoAction = findDaoAction(info.proxyName);
    if (daoAction) {
      lines.push("");
      lines.push(
        `> **DAO Action Registry**: "${daoAction.name}" is registered with ${daoAction.abi.length} governance functions.`
      );
    }
  } else {
    lines.push(`### Alternative Path`);
    if (info.admins.length > 0) {
      lines.push(
        `The admin(s) listed above must perform the upgrade. Contact them directly or propose governance changes to transfer admin to the DAO.`
      );
    } else {
      lines.push(
        `Unable to determine admin. Manually inspect the proxy contract or check Etherscan for owner/admin functions.`
      );
    }
  }

  return lines.join("\n");
}

function formatProxyType(type: ProxyType): string {
  switch (type) {
    case "tokamak_slot0":
      return "Tokamak slot0 (`implementation()`)";
    case "eip1967":
      return "EIP-1967 (transparent proxy)";
    case "unknown":
      return "Unknown (no proxy pattern detected)";
  }
}

// ── Main handler ──

export async function handleCheckUpgradePath(args: {
  contract: string;
}): Promise<string> {
  // Step 1: Resolve proxy
  const resolved = resolveProxy(args.contract);

  if (resolved.error) {
    return `## Upgrade Path Check\n\n${resolved.error}`;
  }

  const proxyAddress = resolved.proxy?.address as Address ?? resolved.address!;
  const proxyName = resolved.proxy?.name ?? "Unknown";

  // Step 2: Detect proxy type
  const { type: proxyType, upgradeFunction } = await detectProxyType(
    proxyAddress,
    resolved.proxy?.name
  );

  if (proxyType === "unknown" && !resolved.proxy) {
    return [
      `## Upgrade Path Check`,
      "",
      `Address: ${proxyAddress}`,
      "",
      `**Proxy pattern not detected.** Neither Tokamak slot0 (\`implementation()\`) nor EIP-1967 storage slots contain a valid implementation address.`,
      "",
      `This address may not be a proxy, or it may use a non-standard proxy pattern.`,
    ].join("\n");
  }

  // Step 3: Query on-chain data
  const info = await queryProxyInfo(proxyAddress, proxyName, proxyType, upgradeFunction);

  // Step 4: Determine verdict
  const verdict = determineVerdict(info);

  // Step 5: Format output
  return formatOutput(info, verdict);
}

// ── MCP Registration ──

export function registerCheckUpgradePathTool(server: McpServer) {
  server.tool(
    "check_upgrade_path",
    "Check if a Tokamak proxy contract can be upgraded by the DAO. " +
      "Verifies on-chain admin roles, current implementation, and upgrade function availability.",
    {
      contract: z
        .string()
        .describe(
          "Contract name or address (0x...). Accepts proxy name, implementation name, or raw address."
        ),
    },
    async ({ contract }) => {
      try {
        const text = await handleCheckUpgradePath({ contract });
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error checking upgrade path: ${formatError(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
