/**
 * read_contract_source and search_contract_code tools
 */

import { z } from "zod";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { paths } from "../paths.ts";

const CONTRACTS_SRC = paths.contractsSrc;

/**
 * Recursively list all .sol files under a directory.
 */
function listSolFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...listSolFiles(full));
    } else if (entry.endsWith(".sol")) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Find the contract directory (case-insensitive).
 */
function findContractDir(contractName: string): string | null {
  if (!existsSync(CONTRACTS_SRC)) return null;
  const entries = readdirSync(CONTRACTS_SRC);
  const match = entries.find(
    (e) => e.toLowerCase() === contractName.toLowerCase()
  );
  if (!match) return null;
  const full = join(CONTRACTS_SRC, match);
  return statSync(full).isDirectory() ? full : null;
}

export async function handleReadContractSource(args: {
  contract_name: string;
  file_path?: string;
}): Promise<string> {
  const dir = findContractDir(args.contract_name);
  if (!dir) {
    const available = existsSync(CONTRACTS_SRC)
      ? readdirSync(CONTRACTS_SRC).filter((e) => statSync(join(CONTRACTS_SRC, e)).isDirectory())
      : [];
    return `Contract "${args.contract_name}" not found.\n\nAvailable contracts:\n${available.join("\n")}`;
  }

  if (!args.file_path) {
    const solFiles = listSolFiles(dir);
    const relPaths = solFiles.map((f) => relative(dir, f));
    return `## ${args.contract_name} - Source Files\n\n${relPaths.map((p) => `- ${p}`).join("\n")}\n\nUse file_path parameter to read a specific file.`;
  }

  const fullPath = join(dir, args.file_path);
  if (!existsSync(fullPath)) {
    return `File not found: ${args.file_path}\n\nAvailable files:\n${listSolFiles(dir).map((f) => relative(dir, f)).join("\n")}`;
  }

  const source = readFileSync(fullPath, "utf-8");
  return `## ${args.contract_name}/${args.file_path}\n\n\`\`\`solidity\n${source}\n\`\`\``;
}

export async function handleSearchContractCode(args: {
  pattern: string;
  contract_name?: string;
}): Promise<string> {
  const searchDir = args.contract_name
    ? findContractDir(args.contract_name) || CONTRACTS_SRC
    : CONTRACTS_SRC;

  if (!existsSync(searchDir)) {
    return "Contracts source directory not found.";
  }

  const solFiles = listSolFiles(searchDir);
  const patternLower = args.pattern.toLowerCase();
  const matches: { file: string; line: number; text: string }[] = [];
  const MAX_MATCHES = 100;

  for (const file of solFiles) {
    if (matches.length >= MAX_MATCHES) break;
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= MAX_MATCHES) break;
      if (lines[i]!.toLowerCase().includes(patternLower)) {
        matches.push({
          file: relative(CONTRACTS_SRC, file),
          line: i + 1,
          text: lines[i]!.trim(),
        });
      }
    }
  }

  if (matches.length === 0) {
    return `No matches found for "${args.pattern}"${args.contract_name ? ` in ${args.contract_name}` : ""}.`;
  }

  const lines = matches.map((m) => `${m.file}:${m.line}: ${m.text}`);
  const header = `Found ${matches.length}${matches.length >= MAX_MATCHES ? "+" : ""} matches for "${args.pattern}":\n\n`;
  return header + lines.join("\n");
}

export function registerContractSourceTools(server: McpServer) {
  server.tool(
    "read_contract_source",
    "Read Solidity source code for a Tokamak contract. Without file_path, lists all files. With file_path, returns source code.",
    {
      contract_name: z.string().describe("Contract directory name (e.g. SeigManagerV1_3, DepositManager)"),
      file_path: z.string().optional().describe("Relative path within the contract directory (e.g. stake/managers/SeigManagerV1_3.sol)"),
    },
    async ({ contract_name, file_path }) => {
      const text = await handleReadContractSource({ contract_name, file_path });
      return { content: [{ type: "text" as const, text }] };
    }
  );

  server.tool(
    "search_contract_code",
    "Search Solidity source code across all Tokamak contracts. Returns matching lines with file paths and line numbers.",
    {
      pattern: z.string().describe("Text pattern to search for (case-insensitive substring match)"),
      contract_name: z.string().optional().describe("Limit search to a specific contract directory"),
    },
    async ({ pattern, contract_name }) => {
      const text = await handleSearchContractCode({ pattern, contract_name });
      return { content: [{ type: "text" as const, text }] };
    }
  );
}
