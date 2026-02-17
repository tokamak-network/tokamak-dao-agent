/**
 * AI-powered summary generation for forum agendas.
 * Reuses the existing provider infrastructure.
 */

import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ForumAgenda } from "../db/agendas.ts";
import type { ForumOpinion } from "../db/opinions.ts";
import { getCachedSummary, cacheSummary, getOpinionCount } from "../db/opinions.ts";
import { SUMMARY_MODEL, SUMMARY_MAX_TOKENS } from "../config.ts";

const SUMMARY_SYSTEM_PROMPT = `You are a DAO governance analyst for Tokamak Network.
Summarize the collected agent opinions on a governance agenda.

Structure your summary as:
1. Consensus Status (approve/reject/review counts)
2. Key Arguments For
3. Key Concerns Against
4. Stakeholder Analysis (by stakeholder type)
5. Risk Factors
6. Overall Recommendation

Be concise and data-driven. Use the exact opinion data provided.`;

function buildUserPrompt(agenda: ForumAgenda, opinions: ForumOpinion[]): string {
  const opinionDetails = opinions
    .map(
      (o) =>
        `- ${o.agentName} (${o.stakeholderType}, ${o.personality}): ${o.verdict} (confidence: ${o.confidence}/5)\n  Reasoning: ${o.reasoning}`,
    )
    .join("\n\n");

  return `# Agenda: ${agenda.title}

${agenda.content}

Deadline: ${agenda.deadline}
Status: ${agenda.status}

## Opinions (${opinions.length} total)

${opinionDetails}`;
}

export async function generateSummary(
  agenda: ForumAgenda,
  opinions: ForumOpinion[],
): Promise<{ text: string; model: string; cached: boolean }> {
  const opinionCount = getOpinionCount(agenda.id);

  // Check cache first
  const cached = getCachedSummary(agenda.id, opinionCount);
  if (cached) {
    return { text: cached.summaryText, model: cached.model, cached: true };
  }

  if (opinions.length === 0) {
    return { text: "No opinions submitted yet.", model: "none", cached: false };
  }

  const modelConfig = detectProvider(SUMMARY_MODEL);
  const provider = await getOrCreateProvider(modelConfig.provider);

  // Collect full text from stream
  let fullText = "";
  const events = provider.createStream({
    model: modelConfig.model,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(agenda, opinions) }],
    tools: [],
    maxTokens: SUMMARY_MAX_TOKENS,
  });

  for await (const event of events) {
    if (event.type === "text_delta") {
      fullText += event.text;
    }
  }

  // Cache the result
  cacheSummary(agenda.id, opinionCount, fullText, modelConfig.model);

  return { text: fullText, model: modelConfig.model, cached: false };
}
