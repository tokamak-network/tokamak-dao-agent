/**
 * Test document loader with new contract docs
 */

import { loadDocuments, chunkDocument } from "../src/server/knowledge/loader";

async function test() {
  console.log("=== Testing Document Loader ===\n");

  const docs = await loadDocuments();
  console.log("Total documents loaded:", docs.length);

  const contracts = docs.filter(d => d.metadata.category === "contracts");
  console.log("\nContract documents:", contracts.length);

  console.log("\nContract list:");
  for (const doc of contracts) {
    console.log(`  - ${doc.metadata.id}: ${doc.metadata.title}`);
  }

  // Test chunking
  console.log("\n=== Testing Chunking ===\n");
  const tonDoc = contracts.find(d => d.metadata.id === "con-001");
  if (tonDoc) {
    const chunks = chunkDocument(tonDoc);
    console.log(`TON document chunks: ${chunks.length}`);
    console.log(`First chunk preview (${chunks[0]?.content.length} chars):`);
    console.log(chunks[0]?.content.slice(0, 200) + "...\n");
  }

  // Test SeigManager
  const seigDoc = contracts.find(d => d.metadata.id === "con-011");
  if (seigDoc) {
    const chunks = chunkDocument(seigDoc);
    console.log(`SeigManager document chunks: ${chunks.length}`);
  }

  console.log("\n=== Test Complete ===");
}

test().catch(console.error);
