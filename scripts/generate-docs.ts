/**
 * Document Generation Script
 * Generates RAG-optimized markdown documents from analyzed contract data
 *
 * Usage: bun run scripts/generate-docs.ts [network]
 * Networks: mainnet (default), sepolia
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, basename } from "node:path";

// Network configuration
const NETWORK = process.argv[2] || "mainnet";
const VALID_NETWORKS = ["mainnet", "sepolia"];

if (!VALID_NETWORKS.includes(NETWORK)) {
  console.error(`Unknown network: ${NETWORK}. Available: ${VALID_NETWORKS.join(", ")}`);
  process.exit(1);
}

// Types
interface FunctionInfo {
  name: string;
  signature: string;
  inputs: { name: string; type: string }[];
  outputs: { name: string; type: string }[];
  stateMutability: string;
  description?: string;
}

interface EventInfo {
  name: string;
  signature: string;
  inputs: { name: string; type: string; indexed: boolean }[];
}

interface AnalyzedContract {
  name: string;
  address: string;
  type: string;
  docId: string;
  description: string;
  implementation?: string;
  abi: unknown[];
  sourceCode: string;
  contractName: string;
  compilerVersion: string;
  isProxy: boolean;
  implementationAddress?: string;
  functions: FunctionInfo[];
  events: EventInfo[];
  stateVariables: { name: string; type: string; value?: string }[];
  onChainState: Record<string, unknown>;
}

const INPUT_DIR = join(import.meta.dir, NETWORK, "output");
const OUTPUT_DIR = join(import.meta.dir, "..", "src", "server", "knowledge", "documents", "contracts", NETWORK);

/**
 * Get today's date in ISO format
 */
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Generate tags based on contract type and name
 */
function generateTags(contract: AnalyzedContract): string[] {
  const tags = ["contract", contract.type];

  // Add name-based tags
  const nameLower = contract.name.toLowerCase();
  if (nameLower.includes("token") || nameLower === "ton" || nameLower === "wton") {
    tags.push("token", "erc20");
  }
  if (nameLower.includes("seig") || nameLower.includes("staking")) {
    tags.push("staking", "seigniorage", "rewards");
  }
  if (nameLower.includes("deposit")) {
    tags.push("deposit", "withdrawal", "staking");
  }
  if (nameLower.includes("dao") || nameLower.includes("committee") || nameLower.includes("agenda")) {
    tags.push("governance", "dao", "voting");
  }
  if (nameLower.includes("vault")) {
    tags.push("treasury", "vault");
  }
  if (nameLower.includes("registry")) {
    tags.push("registry");
  }
  if (nameLower.includes("factory")) {
    tags.push("factory", "deployment");
  }
  if (nameLower.includes("swap")) {
    tags.push("swap", "exchange");
  }
  if (contract.isProxy) {
    tags.push("proxy", "upgradeable");
  }

  return [...new Set(tags)];
}

/**
 * Generate related docs based on contract relationships
 */
function generateRelatedDocs(contract: AnalyzedContract, allContracts: AnalyzedContract[]): string[] {
  const related: string[] = [];

  // If it's a proxy, link to implementation
  if (contract.isProxy && contract.implementationAddress) {
    const impl = allContracts.find(
      (c) => c.address.toLowerCase() === contract.implementationAddress?.toLowerCase()
    );
    if (impl) {
      related.push(impl.docId);
    }
  }

  // If it's an implementation, link to proxy
  const proxy = allContracts.find(
    (c) => c.implementationAddress?.toLowerCase() === contract.address.toLowerCase()
  );
  if (proxy) {
    related.push(proxy.docId);
  }

  // Link tokens to staking contracts
  const nameLower = contract.name.toLowerCase();
  if (nameLower === "ton" || nameLower === "wton") {
    const stakingContracts = allContracts.filter((c) =>
      c.name.toLowerCase().includes("seig") ||
      c.name.toLowerCase().includes("deposit")
    );
    related.push(...stakingContracts.map((c) => c.docId));
  }

  // Link staking to DAO
  if (nameLower.includes("seig") || nameLower.includes("deposit")) {
    const daoContracts = allContracts.filter((c) =>
      c.name.toLowerCase().includes("dao")
    );
    related.push(...daoContracts.map((c) => c.docId));
  }

  return [...new Set(related)].slice(0, 5); // Limit to 5 related docs
}

/**
 * Categorize function by its purpose
 */
function categorizeFunctions(functions: FunctionInfo[]): Record<string, FunctionInfo[]> {
  const categories: Record<string, FunctionInfo[]> = {
    "View Functions": [],
    "State-Changing Functions": [],
    "Admin Functions": [],
    "Token Operations": [],
    "Staking Operations": [],
    "Governance Operations": [],
  };

  for (const fn of functions) {
    // Skip internal functions
    if (fn.name.startsWith("_")) continue;

    const nameLower = fn.name.toLowerCase();

    // Admin functions
    if (
      nameLower.includes("owner") ||
      nameLower.includes("admin") ||
      nameLower.includes("set") ||
      nameLower.includes("pause") ||
      nameLower.includes("unpause") ||
      nameLower.includes("upgrade")
    ) {
      categories["Admin Functions"].push(fn);
    }
    // Token operations
    else if (
      nameLower.includes("transfer") ||
      nameLower.includes("approve") ||
      nameLower.includes("allowance") ||
      nameLower.includes("mint") ||
      nameLower.includes("burn")
    ) {
      categories["Token Operations"].push(fn);
    }
    // Staking operations
    else if (
      nameLower.includes("stake") ||
      nameLower.includes("deposit") ||
      nameLower.includes("withdraw") ||
      nameLower.includes("claim") ||
      nameLower.includes("seig")
    ) {
      categories["Staking Operations"].push(fn);
    }
    // Governance operations
    else if (
      nameLower.includes("vote") ||
      nameLower.includes("proposal") ||
      nameLower.includes("agenda") ||
      nameLower.includes("execute") ||
      nameLower.includes("committee")
    ) {
      categories["Governance Operations"].push(fn);
    }
    // View vs state-changing
    else if (fn.stateMutability === "view" || fn.stateMutability === "pure") {
      categories["View Functions"].push(fn);
    } else {
      categories["State-Changing Functions"].push(fn);
    }
  }

  // Remove empty categories
  for (const key of Object.keys(categories)) {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  }

  return categories;
}

/**
 * Format a function for documentation
 */
function formatFunction(fn: FunctionInfo): string {
  const inputs = fn.inputs.map((i) => `${i.type} ${i.name}`).join(", ");
  const outputs = fn.outputs.map((o) => o.type).join(", ");

  let result = `#### \`${fn.name}\`\n\n`;
  result += "```solidity\n";
  result += `function ${fn.name}(${inputs})`;
  if (fn.stateMutability !== "nonpayable") {
    result += ` ${fn.stateMutability}`;
  }
  if (outputs) {
    result += ` returns (${outputs})`;
  }
  result += "\n```\n\n";

  if (fn.inputs.length > 0) {
    result += "**Parameters:**\n";
    for (const input of fn.inputs) {
      result += `- \`${input.name}\`: \`${input.type}\`\n`;
    }
    result += "\n";
  }

  if (fn.outputs.length > 0) {
    result += "**Returns:**\n";
    for (const output of fn.outputs) {
      const name = output.name || "result";
      result += `- \`${name}\`: \`${output.type}\`\n`;
    }
    result += "\n";
  }

  return result;
}

/**
 * Format an event for documentation
 */
function formatEvent(event: EventInfo): string {
  const inputs = event.inputs
    .map((i) => `${i.indexed ? "indexed " : ""}${i.type} ${i.name}`)
    .join(", ");

  let result = `#### \`${event.name}\`\n\n`;
  result += "```solidity\n";
  result += `event ${event.name}(${inputs})\n`;
  result += "```\n\n";

  if (event.inputs.length > 0) {
    result += "**Parameters:**\n";
    for (const input of event.inputs) {
      result += `- \`${input.name}\`: \`${input.type}\`${input.indexed ? " (indexed)" : ""}\n`;
    }
    result += "\n";
  }

  return result;
}

/**
 * Format on-chain state for documentation
 */
function formatOnChainState(state: Record<string, unknown>): string {
  if (Object.keys(state).length === 0) {
    return "*No on-chain state available*\n";
  }

  let result = "";
  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined && value !== null) {
      let displayValue = String(value);

      // Format large numbers
      if (typeof value === "string" && /^\d{10,}$/.test(value)) {
        try {
          const bn = BigInt(value);
          displayValue = `${bn.toLocaleString()} (${value})`;
        } catch {
          // Keep original
        }
      }

      result += `- **${key}**: \`${displayValue}\`\n`;
    }
  }
  return result || "*No on-chain state available*\n";
}

/**
 * Generate markdown document for a contract
 */
function generateDocument(contract: AnalyzedContract, allContracts: AnalyzedContract[]): string {
  const today = getToday();
  const tags = generateTags(contract);
  const relatedDocs = generateRelatedDocs(contract, allContracts);

  // Frontmatter
  let doc = `---
id: "${contract.docId}"
title: "${contract.name} Contract"
category: "contracts"
status: "active"
created_at: "${today}"
updated_at: "${today}"
version: "1.0"
tags: [${tags.map((t) => `"${t}"`).join(", ")}]
related_docs: [${relatedDocs.map((d) => `"${d}"`).join(", ")}]
source_url: "https://etherscan.io/address/${contract.address}"
---

# ${contract.name}

## Overview

${contract.description}

${contract.isProxy ? `This is an upgradeable proxy contract. The implementation logic is at \`${contract.implementationAddress}\`.` : ""}

## Contract Information

| Property | Value |
|----------|-------|
| **Network** | Ethereum Mainnet |
| **Address** | \`${contract.address}\` |
| **Contract Name** | ${contract.contractName || contract.name} |
| **Compiler Version** | ${contract.compilerVersion || "Unknown"} |
| **Type** | ${contract.type}${contract.isProxy ? " (Proxy)" : ""} |
${contract.implementationAddress ? `| **Implementation** | \`${contract.implementationAddress}\` |\n` : ""}

## On-Chain State

${formatOnChainState(contract.onChainState)}

`;

  // Functions
  if (contract.functions.length > 0) {
    doc += "## Functions\n\n";

    const categorized = categorizeFunctions(contract.functions);

    for (const [category, fns] of Object.entries(categorized)) {
      if (fns.length > 0) {
        doc += `### ${category}\n\n`;
        for (const fn of fns.slice(0, 10)) {
          // Limit to 10 per category
          doc += formatFunction(fn);
        }
        if (fns.length > 10) {
          doc += `*...and ${fns.length - 10} more functions*\n\n`;
        }
      }
    }
  }

  // Events
  if (contract.events.length > 0) {
    doc += "## Events\n\n";

    for (const event of contract.events.slice(0, 15)) {
      // Limit to 15 events
      doc += formatEvent(event);
    }
    if (contract.events.length > 15) {
      doc += `*...and ${contract.events.length - 15} more events*\n\n`;
    }
  }

  // Integration notes
  doc += `## Integration

### Related Contracts

`;

  if (relatedDocs.length > 0) {
    for (const docId of relatedDocs) {
      const related = allContracts.find((c) => c.docId === docId);
      if (related) {
        doc += `- **${related.name}** (\`${related.address}\`): ${related.description}\n`;
      }
    }
  } else {
    doc += "*No directly related contracts identified*\n";
  }

  doc += `
### Usage Examples

\`\`\`typescript
// Import ethers or viem
import { ethers } from 'ethers';

// Connect to the contract
const contract = new ethers.Contract(
  "${contract.address}",
  ABI, // Import from generated ABI
  provider
);
\`\`\`

---

*This document was auto-generated from on-chain data. Last updated: ${today}*
`;

  return doc;
}

/**
 * Main generation function
 */
async function main() {
  console.log("=== Document Generation Started ===\n");
  console.log(`Network: ${NETWORK}\n`);

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Load all analyzed contracts
  const allContracts: AnalyzedContract[] = [];

  try {
    const files = await readdir(INPUT_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json") && f !== "all-contracts.json");

    for (const file of jsonFiles) {
      const filePath = join(INPUT_DIR, file);
      const content = await readFile(filePath, "utf-8");
      const contract = JSON.parse(content) as AnalyzedContract;
      allContracts.push(contract);
    }
  } catch (error) {
    console.error("Failed to load analyzed contracts:", error);
    console.log("Tip: Run analyze-contracts.ts first");
    process.exit(1);
  }

  console.log(`Found ${allContracts.length} analyzed contracts\n`);

  // Generate documents
  let generated = 0;
  for (const contract of allContracts) {
    console.log(`Generating doc for ${contract.name}...`);

    const document = generateDocument(contract, allContracts);
    const filename = `${contract.docId}-${contract.name.toLowerCase().replace(/\s+/g, "-")}.md`;
    const outputPath = join(OUTPUT_DIR, filename);

    await writeFile(outputPath, document);
    console.log(`  Saved to ${outputPath}`);
    generated++;
  }

  console.log(`\n=== Generation Complete ===`);
  console.log(`Generated ${generated} documents in ${OUTPUT_DIR}`);
}

// Run
main().catch(console.error);
