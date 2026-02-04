/**
 * Document metadata schema for knowledge management system
 */

export type DocumentCategory =
  | "governance"
  | "proposals"
  | "contracts"
  | "tokenomics"
  | "technical"
  | "community";

export type DocumentStatus = "active" | "deprecated" | "archived";

export interface DocumentMetadata {
  id: string;
  title: string;
  category: DocumentCategory;
  status: DocumentStatus;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  version: string;
  tags: string[];
  relatedDocs: string[]; // Array of document IDs
  sourceUrl?: string;
}

export interface Document {
  metadata: DocumentMetadata;
  content: string;
  filePath: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: DocumentMetadata;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
}

export interface SearchResult {
  document: Document;
  chunk: DocumentChunk;
  score: number;
  matchType: "keyword" | "semantic" | "hybrid";
}

/**
 * Parse YAML frontmatter from markdown document
 */
export function parseMetadata(
  frontmatter: Record<string, unknown>
): DocumentMetadata {
  return {
    id: String(frontmatter.id || ""),
    title: String(frontmatter.title || ""),
    category: (frontmatter.category as DocumentCategory) || "technical",
    status: (frontmatter.status as DocumentStatus) || "active",
    createdAt: String(frontmatter.created_at || new Date().toISOString()),
    updatedAt: String(frontmatter.updated_at || new Date().toISOString()),
    version: String(frontmatter.version || "1.0"),
    tags: Array.isArray(frontmatter.tags)
      ? frontmatter.tags.map(String)
      : [],
    relatedDocs: Array.isArray(frontmatter.related_docs)
      ? frontmatter.related_docs.map(String)
      : [],
    sourceUrl: frontmatter.source_url
      ? String(frontmatter.source_url)
      : undefined,
  };
}

/**
 * Serialize metadata to YAML frontmatter format
 */
export function serializeMetadata(metadata: DocumentMetadata): string {
  const lines = [
    "---",
    `id: "${metadata.id}"`,
    `title: "${metadata.title}"`,
    `category: "${metadata.category}"`,
    `status: "${metadata.status}"`,
    `created_at: "${metadata.createdAt}"`,
    `updated_at: "${metadata.updatedAt}"`,
    `version: "${metadata.version}"`,
    `tags: [${metadata.tags.map((t) => `"${t}"`).join(", ")}]`,
    `related_docs: [${metadata.relatedDocs.map((d) => `"${d}"`).join(", ")}]`,
  ];

  if (metadata.sourceUrl) {
    lines.push(`source_url: "${metadata.sourceUrl}"`);
  }

  lines.push("---");
  return lines.join("\n");
}
