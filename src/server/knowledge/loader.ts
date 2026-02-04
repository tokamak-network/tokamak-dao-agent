import { readdir, readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import {
  type Document,
  type DocumentMetadata,
  type DocumentChunk,
  parseMetadata,
} from "./schema/metadata";

const DOCUMENTS_PATH = join(import.meta.dir, "documents");

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const [, yamlContent, body] = match;
  const metadata: Record<string, unknown> = {};

  // Simple YAML parser for our use case
  yamlContent.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Handle arrays
    if (value.startsWith("[") && value.endsWith("]")) {
      const arrayContent = value.slice(1, -1);
      metadata[key] = arrayContent
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    // Handle quoted strings
    else if (value.startsWith('"') && value.endsWith('"')) {
      metadata[key] = value.slice(1, -1);
    } else {
      metadata[key] = value;
    }
  });

  return { metadata, body: body.trim() };
}

/**
 * Recursively read all markdown files from a directory
 */
async function readMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readMarkdownFiles(fullPath)));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Load all documents from the knowledge base
 */
export async function loadDocuments(): Promise<Document[]> {
  const documents: Document[] = [];
  const files = await readMarkdownFiles(DOCUMENTS_PATH);

  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    const { metadata: rawMetadata, body } = parseFrontmatter(content);
    const metadata = parseMetadata(rawMetadata);

    documents.push({
      metadata,
      content: body,
      filePath: relative(DOCUMENTS_PATH, filePath),
    });
  }

  return documents;
}

/**
 * Load a single document by ID
 */
export async function loadDocumentById(id: string): Promise<Document | null> {
  const documents = await loadDocuments();
  return documents.find((doc) => doc.metadata.id === id) || null;
}

/**
 * Chunk document content using semantic boundaries
 * Uses ~500 words with 10% overlap, respecting heading boundaries
 */
export function chunkDocument(
  document: Document,
  maxWords = 500,
  overlapPercent = 0.1
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const content = document.content;

  // Split by headings first
  const sections = content.split(/(?=^#{1,3}\s)/m);
  let currentChunk = "";
  let chunkIndex = 0;
  let startOffset = 0;

  const addChunk = (text: string, start: number) => {
    if (text.trim()) {
      chunks.push({
        id: `${document.metadata.id}-chunk-${chunkIndex}`,
        documentId: document.metadata.id,
        content: text.trim(),
        metadata: document.metadata,
        chunkIndex,
        startOffset: start,
        endOffset: start + text.length,
      });
      chunkIndex++;
    }
  };

  for (const section of sections) {
    const words = section.split(/\s+/);

    // If section fits in current chunk
    if ((currentChunk + " " + section).split(/\s+/).length <= maxWords) {
      currentChunk += (currentChunk ? "\n\n" : "") + section;
    } else {
      // Save current chunk
      if (currentChunk) {
        addChunk(currentChunk, startOffset);
        // Calculate overlap
        const overlapWords = Math.floor(maxWords * overlapPercent);
        const currentWords = currentChunk.split(/\s+/);
        const overlapText = currentWords.slice(-overlapWords).join(" ");
        startOffset += currentChunk.length;
        currentChunk = overlapText;
      }

      // If section itself is too large, split it further
      if (words.length > maxWords) {
        let tempChunk = currentChunk;
        for (let i = 0; i < words.length; i++) {
          tempChunk += (tempChunk ? " " : "") + words[i];
          if (tempChunk.split(/\s+/).length >= maxWords) {
            addChunk(tempChunk, startOffset);
            startOffset += tempChunk.length;
            const overlapWords = Math.floor(maxWords * overlapPercent);
            const tempWords = tempChunk.split(/\s+/);
            tempChunk = tempWords.slice(-overlapWords).join(" ");
          }
        }
        currentChunk = tempChunk;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + section;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    addChunk(currentChunk, startOffset);
  }

  return chunks;
}

/**
 * Get all chunks from all documents
 */
export async function getAllChunks(): Promise<DocumentChunk[]> {
  const documents = await loadDocuments();
  const allChunks: DocumentChunk[] = [];

  for (const doc of documents) {
    allChunks.push(...chunkDocument(doc));
  }

  return allChunks;
}
