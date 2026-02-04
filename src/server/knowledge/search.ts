import type { DocumentChunk, SearchResult } from "./schema/metadata";
import {
  generateEmbedding,
  embedChunks,
  cosineSimilarity,
  type EmbeddedChunk,
} from "./embeddings";
import { getAllChunks } from "./loader";

// In-memory indexes
interface BM25Index {
  documents: Map<string, DocumentChunk>;
  termFrequencies: Map<string, Map<string, number>>;
  documentFrequencies: Map<string, number>;
  documentLengths: Map<string, number>;
  avgDocLength: number;
  totalDocs: number;
}

let bm25Index: BM25Index | null = null;
let vectorIndex: EmbeddedChunk[] = [];
let isInitialized = false;

/**
 * Tokenize text for BM25
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

/**
 * Build BM25 index from chunks
 */
function buildBM25Index(chunks: DocumentChunk[]): BM25Index {
  const documents = new Map<string, DocumentChunk>();
  const termFrequencies = new Map<string, Map<string, number>>();
  const documentFrequencies = new Map<string, number>();
  const documentLengths = new Map<string, number>();
  let totalLength = 0;

  for (const chunk of chunks) {
    documents.set(chunk.id, chunk);
    const tokens = tokenize(chunk.content);
    documentLengths.set(chunk.id, tokens.length);
    totalLength += tokens.length;

    const tf = new Map<string, number>();
    const seenTerms = new Set<string>();

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);

      if (!seenTerms.has(token)) {
        seenTerms.add(token);
        documentFrequencies.set(
          token,
          (documentFrequencies.get(token) || 0) + 1
        );
      }
    }

    termFrequencies.set(chunk.id, tf);
  }

  return {
    documents,
    termFrequencies,
    documentFrequencies,
    documentLengths,
    avgDocLength: totalLength / chunks.length,
    totalDocs: chunks.length,
  };
}

/**
 * BM25 scoring function
 */
function bm25Score(
  query: string[],
  docId: string,
  index: BM25Index,
  k1 = 1.5,
  b = 0.75
): number {
  const tf = index.termFrequencies.get(docId);
  if (!tf) return 0;

  const docLength = index.documentLengths.get(docId) || 0;
  let score = 0;

  for (const term of query) {
    const termFreq = tf.get(term) || 0;
    const docFreq = index.documentFrequencies.get(term) || 0;

    if (termFreq === 0) continue;

    const idf = Math.log(
      (index.totalDocs - docFreq + 0.5) / (docFreq + 0.5) + 1
    );

    const tfNorm =
      (termFreq * (k1 + 1)) /
      (termFreq + k1 * (1 - b + (b * docLength) / index.avgDocLength));

    score += idf * tfNorm;
  }

  return score;
}

/**
 * Search using BM25
 */
function searchBM25(
  query: string,
  index: BM25Index,
  topK = 10
): Array<{ chunk: DocumentChunk; score: number }> {
  const queryTokens = tokenize(query);
  const scores: Array<{ docId: string; score: number }> = [];

  for (const docId of index.documents.keys()) {
    const score = bm25Score(queryTokens, docId, index);
    if (score > 0) {
      scores.push({ docId, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, topK).map(({ docId, score }) => ({
    chunk: index.documents.get(docId)!,
    score,
  }));
}

/**
 * Search using vector similarity (in-memory)
 */
async function searchVector(
  query: string,
  topK = 10
): Promise<Array<{ chunk: DocumentChunk; score: number }>> {
  if (vectorIndex.length === 0) return [];

  const queryEmbedding = await generateEmbedding(query);

  const scores = vectorIndex.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, topK);
}

/**
 * Reciprocal Rank Fusion (RRF) for combining results
 */
function rrfFuse(
  results1: Array<{ chunk: DocumentChunk; score: number }>,
  results2: Array<{ chunk: DocumentChunk; score: number }>,
  k = 60
): Array<{ chunk: DocumentChunk; score: number }> {
  const fusedScores = new Map<string, { chunk: DocumentChunk; score: number }>();

  results1.forEach(({ chunk }, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    fusedScores.set(chunk.id, { chunk, score: rrfScore });
  });

  results2.forEach(({ chunk }, rank) => {
    const rrfScore = 1 / (k + rank + 1);
    const existing = fusedScores.get(chunk.id);
    if (existing) {
      existing.score += rrfScore;
    } else {
      fusedScores.set(chunk.id, { chunk, score: rrfScore });
    }
  });

  return Array.from(fusedScores.values()).sort((a, b) => b.score - a.score);
}

/**
 * Initialize the search system
 */
export async function initializeSearch(): Promise<void> {
  if (isInitialized) return;

  console.log("Initializing knowledge search system...");

  const chunks = await getAllChunks();
  console.log(`Loaded ${chunks.length} chunks from knowledge base`);

  // Build BM25 index
  bm25Index = buildBM25Index(chunks);
  console.log("BM25 index built");

  // Build vector index with local embeddings
  try {
    console.log("Building vector index with local embeddings...");
    vectorIndex = await embedChunks(chunks);
    console.log("Vector index built");
  } catch (error) {
    console.warn("Failed to build vector index:", error);
    vectorIndex = [];
  }

  isInitialized = true;
  console.log("Knowledge search system initialized");
}

/**
 * Hybrid search combining BM25 and vector search
 */
export async function hybridSearch(
  query: string,
  topK = 5
): Promise<SearchResult[]> {
  if (!bm25Index) {
    await initializeSearch();
  }

  // BM25 search
  const bm25Results = searchBM25(query, bm25Index!, topK * 2);

  // Vector search
  let vectorResults: Array<{ chunk: DocumentChunk; score: number }> = [];
  if (vectorIndex.length > 0) {
    try {
      vectorResults = await searchVector(query, topK * 2);
    } catch (error) {
      console.warn("Vector search failed:", error);
    }
  }

  // Fuse results if we have both
  let fusedResults: Array<{ chunk: DocumentChunk; score: number }>;
  if (vectorResults.length > 0) {
    fusedResults = rrfFuse(bm25Results, vectorResults);
  } else {
    fusedResults = bm25Results;
  }

  return fusedResults.slice(0, topK).map(({ chunk, score }) => ({
    document: {
      metadata: chunk.metadata,
      content: chunk.content,
      filePath: "",
    },
    chunk,
    score,
    matchType: vectorResults.length > 0 ? "hybrid" : "keyword",
  }));
}

/**
 * Simple keyword search (BM25 only)
 */
export async function keywordSearch(
  query: string,
  topK = 5
): Promise<SearchResult[]> {
  if (!bm25Index) {
    await initializeSearch();
  }

  const results = searchBM25(query, bm25Index!, topK);

  return results.map(({ chunk, score }) => ({
    document: {
      metadata: chunk.metadata,
      content: chunk.content,
      filePath: "",
    },
    chunk,
    score,
    matchType: "keyword",
  }));
}
