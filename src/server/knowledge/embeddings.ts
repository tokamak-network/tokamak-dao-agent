import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";
import type { DocumentChunk } from "./schema/metadata";

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;

let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isLoading = false;
let loadPromise: Promise<FeatureExtractionPipeline> | null = null;

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

/**
 * Initialize the local embedding model
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (embeddingPipeline) return embeddingPipeline;

  if (loadPromise) return loadPromise;

  if (!isLoading) {
    isLoading = true;
    console.log("Loading local embedding model...");
    loadPromise = pipeline("feature-extraction", EMBEDDING_MODEL, {
      quantized: true,
    }).then((p) => {
      embeddingPipeline = p as FeatureExtractionPipeline;
      console.log("Local embedding model loaded");
      return embeddingPipeline;
    });
  }

  return loadPromise!;
}

/**
 * Check if embeddings are available (always true for local model)
 */
export function isEmbeddingsAvailable(): boolean {
  return true;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getEmbeddingPipeline();
  const embeddings: number[][] = [];

  // Process in batches to avoid memory issues
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    for (const text of batch) {
      const output = await extractor(text, { pooling: "mean", normalize: true });
      embeddings.push(Array.from(output.data as Float32Array));
    }
  }

  return embeddings;
}

/**
 * Embed document chunks
 */
export async function embedChunks(
  chunks: DocumentChunk[]
): Promise<EmbeddedChunk[]> {
  const texts = chunks.map((chunk) => {
    const metaPrefix = [
      `Title: ${chunk.metadata.title}`,
      `Category: ${chunk.metadata.category}`,
      `Tags: ${chunk.metadata.tags.join(", ")}`,
    ].join("\n");

    return `${metaPrefix}\n\n${chunk.content}`;
  });

  const embeddings = await generateEmbeddings(texts);

  return chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
