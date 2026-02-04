/**
 * Tokamak DAO Knowledge Management System
 *
 * This module provides:
 * - Document loading and parsing
 * - Semantic chunking
 * - Hybrid search (BM25 + Vector)
 * - Integration with RAG pipeline
 */

export * from "./schema/metadata";
export * from "./loader";
export * from "./embeddings";
export * from "./search";

import { hybridSearch, initializeSearch } from "./search";
import type { SearchResult } from "./schema/metadata";

/**
 * Core knowledge that is always included in the system prompt
 */
export const CORE_KNOWLEDGE = {
  contracts: {
    ton: {
      address: "0x2be5e8c109e2197D077D13A82dAead6a9b3433C5",
      network: "Ethereum Mainnet",
      decimals: 18,
    },
    wton: {
      address: "0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2",
      network: "Ethereum Mainnet",
      decimals: 27,
    },
  },
  governance: {
    quorum: "5% of total staked TON",
    votingPeriod: "Minimum 3 days",
    proposalTypes: {
      typeA: "Staking and Inflation parameters",
      typeB: "Contract upgrades and protocol changes",
    },
  },
};

/**
 * Format search results as context for the AI
 */
export function formatSearchResultsAsContext(
  results: SearchResult[]
): string {
  if (results.length === 0) {
    return "No relevant documents found.";
  }

  return results
    .map((result, index) => {
      const { metadata, content } = result.chunk;
      return [
        `[Document ${index + 1}: ${metadata.title}]`,
        `Category: ${metadata.category}`,
        `Tags: ${metadata.tags.join(", ")}`,
        "",
        content,
        "",
      ].join("\n");
    })
    .join("\n---\n\n");
}

/**
 * Generate system prompt using RICQ framework with RAG context
 */
export async function generateSystemPrompt(userQuery: string): Promise<string> {
  // Initialize search if needed
  await initializeSearch();

  // Search for relevant documents
  const searchResults = await hybridSearch(userQuery, 5);
  const context = formatSearchResultsAsContext(searchResults);

  // RICQ Framework
  const systemPrompt = `# ROLE
You are a Tokamak Network governance expert. You help users understand the Tokamak Network ecosystem and participate in DAO governance effectively.

# INSTRUCTION
- Answer questions accurately using the provided context
- Always cite your sources (document titles)
- If information is not in the context, say so clearly
- Never make up facts or speculate about specific numbers/addresses
- Be concise but thorough

# CORE KNOWLEDGE (Always accurate)
## Contract Addresses (Ethereum Mainnet)
- TON Token: ${CORE_KNOWLEDGE.contracts.ton.address}
- WTON Token: ${CORE_KNOWLEDGE.contracts.wton.address}

## Governance Rules
- Quorum Requirement: ${CORE_KNOWLEDGE.governance.quorum}
- Voting Period: ${CORE_KNOWLEDGE.governance.votingPeriod}
- Type A Proposals: ${CORE_KNOWLEDGE.governance.proposalTypes.typeA}
- Type B Proposals: ${CORE_KNOWLEDGE.governance.proposalTypes.typeB}

# CONTEXT (Retrieved Documents)
${context}

# IMPORTANT
- The context above contains relevant information from the Tokamak Network knowledge base
- Prioritize information from the context over general knowledge
- If the context doesn't contain the answer, use the core knowledge above
- If neither has the answer, clearly state that you don't have that information`;

  return systemPrompt;
}

/**
 * Quick search without full prompt generation
 */
export async function searchKnowledge(
  query: string,
  topK = 5
): Promise<SearchResult[]> {
  await initializeSearch();
  return hybridSearch(query, topK);
}
