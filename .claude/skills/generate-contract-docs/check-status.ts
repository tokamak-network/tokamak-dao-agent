/**
 * Document Status Check Script
 * Shows RAG document statistics by category and network
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, extname, dirname, basename } from "node:path";

const DOCUMENTS_PATH = join(import.meta.dir, "../../../src/server/knowledge/documents");

interface DocStats {
  total: number;
  byCategory: Record<string, number>;
  byNetwork: Record<string, number>;
  files: { path: string; title: string; category: string }[];
}

async function readMarkdownFiles(dir: string, basePath: string = dir): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await readMarkdownFiles(fullPath, basePath)));
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist
  }
  return files;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : "Untitled";
}

function extractCategory(filePath: string, basePath: string): string {
  const rel = relative(basePath, filePath);
  const parts = rel.split("/");
  return parts[0] || "unknown";
}

function extractNetwork(filePath: string): string | null {
  if (filePath.includes("/mainnet/")) return "mainnet";
  if (filePath.includes("/sepolia/")) return "sepolia";
  return null;
}

async function getDocStats(): Promise<DocStats> {
  const stats: DocStats = {
    total: 0,
    byCategory: {},
    byNetwork: { mainnet: 0, sepolia: 0, other: 0 },
    files: [],
  };

  const files = await readMarkdownFiles(DOCUMENTS_PATH);

  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    const title = extractTitle(content);
    const category = extractCategory(filePath, DOCUMENTS_PATH);
    const network = extractNetwork(filePath);

    stats.total++;
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    if (category === "contracts") {
      if (network) {
        stats.byNetwork[network]++;
      } else {
        stats.byNetwork.other++;
      }
    }

    stats.files.push({
      path: relative(DOCUMENTS_PATH, filePath),
      title,
      category,
    });
  }

  return stats;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║            📚 RAG Document Status Report                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const stats = await getDocStats();

  // Summary
  console.log(`📊 Total Documents: ${stats.total}\n`);

  // By Category
  console.log("📂 By Category:");
  console.log("┌─────────────────┬───────┐");
  console.log("│ Category        │ Count │");
  console.log("├─────────────────┼───────┤");

  const sortedCategories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  for (const [category, count] of sortedCategories) {
    console.log(`│ ${category.padEnd(15)} │ ${count.toString().padStart(5)} │`);
  }
  console.log("└─────────────────┴───────┘\n");

  // Contract Networks
  if (stats.byCategory.contracts) {
    console.log("🌐 Contracts by Network:");
    console.log("┌─────────────────┬───────┐");
    console.log("│ Network         │ Count │");
    console.log("├─────────────────┼───────┤");

    for (const [network, count] of Object.entries(stats.byNetwork)) {
      if (count > 0) {
        console.log(`│ ${network.padEnd(15)} │ ${count.toString().padStart(5)} │`);
      }
    }
    console.log("└─────────────────┴───────┘\n");
  }

  // Recent files (last 5)
  console.log("📄 Sample Documents:");
  const sampleFiles = stats.files.slice(0, 5);
  for (const file of sampleFiles) {
    console.log(`  • ${file.path}`);
  }
  if (stats.files.length > 5) {
    console.log(`  ... and ${stats.files.length - 5} more\n`);
  }

  console.log("✅ Status: Ready for RAG queries");
}

main().catch(console.error);
