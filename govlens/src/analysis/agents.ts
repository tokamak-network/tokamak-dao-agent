/**
 * Criterion Agent System
 *
 * Each criterion gets a specialist AI agent that evaluates proposals
 * from its specific perspective. All agents run in parallel.
 */

import type {
  CriterionDef,
  CriterionAgentConfig,
  CriterionEvaluation,
  Proposal,
  LLMProvider,
  LLMStreamEvent,
  AggregatedResult,
  TenantConfig,
} from "../types/index.js";
import { aggregate } from "../core/aggregation.js";

// ─── Prompt Building ─────────────────────────────────────────

export function buildCriterionSystemPrompt(
  agent: CriterionAgentConfig,
  criterion: CriterionDef,
  domainKnowledge?: string,
): string {
  const sections: string[] = [];

  sections.push(`You are **${agent.agentName}**, a governance proposal evaluation specialist.`);
  sections.push("");
  sections.push(agent.systemPromptFocus);
  sections.push("");
  sections.push(`## Scoring Scale for ${criterion.label}`);
  sections.push(`- **0-25** (Low): ${criterion.scoreLow}`);
  sections.push(`- **26-74** (Mid): ${criterion.scoreMid}`);
  sections.push(`- **75-100** (High): ${criterion.scoreHigh}`);

  if (domainKnowledge) {
    sections.push("");
    sections.push("## Protocol Context");
    sections.push(domainKnowledge);
  }

  sections.push("");
  sections.push("## Instructions");
  sections.push(`1. Focus EXCLUSIVELY on **${criterion.label}**: ${criterion.description}`);
  sections.push("2. Provide a score from 0 to 100");
  sections.push("3. Write detailed evidence (3-5 sentences) referencing specific aspects of the proposal");
  sections.push("4. Explain your reasoning (2-3 sentences)");
  sections.push("");
  sections.push("## Response Format (JSON only)");
  sections.push('```json');
  sections.push('{ "score": <0-100>, "evidence": "...", "reasoning": "..." }');
  sections.push('```');

  return sections.join("\n");
}

export function buildProposalUserPrompt(proposal: Proposal): string {
  const sections: string[] = [];

  sections.push(`## Proposal: ${proposal.title}`);
  sections.push("");

  if (proposal.description) {
    sections.push("### Description");
    sections.push(proposal.description.slice(0, 4000));
    sections.push("");
  }

  sections.push("### On-Chain Data");
  sections.push(`- **Proposer**: \`${proposal.proposer}\``);
  sections.push(`- **Status**: ${proposal.status}`);

  if (proposal.targets.length > 0) {
    sections.push(`- **Targets**: ${proposal.targets.length} contract call(s)`);
    for (let i = 0; i < Math.min(proposal.targets.length, 10); i++) {
      sections.push(`  - \`${proposal.targets[i]}\` with calldata \`${proposal.calldatas[i]?.slice(0, 20)}...\``);
    }
  }

  const forVotes = proposal.forVotes.toString();
  const againstVotes = proposal.againstVotes.toString();
  const abstainVotes = proposal.abstainVotes.toString();
  sections.push(`- **Votes**: For=${forVotes}, Against=${againstVotes}, Abstain=${abstainVotes}`);

  sections.push("");
  sections.push("Evaluate this proposal from your specialist perspective. Respond with JSON only.");

  return sections.join("\n");
}

// ─── Response Parsing ────────────────────────────────────────

interface RawCriterionResponse {
  score: number;
  evidence: string;
  reasoning: string;
}

export function parseCriterionResponse(text: string): RawCriterionResponse | null {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(text);
    return validateRawResponse(parsed);
  } catch {
    // Fallback: extract JSON from text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return validateRawResponse(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validateRawResponse(obj: unknown): RawCriterionResponse | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  const score = Number(record.score);
  if (isNaN(score) || score < 0 || score > 100) return null;

  const evidence = String(record.evidence ?? "");
  const reasoning = String(record.reasoning ?? "");

  if (!evidence && !reasoning) return null;

  return { score: Math.round(score), evidence, reasoning };
}

// ─── Single Criterion Agent ──────────────────────────────────

export async function runCriterionAgent(
  proposal: Proposal,
  agent: CriterionAgentConfig,
  criterion: CriterionDef,
  llmProvider: LLMProvider,
  model: string,
  domainKnowledge?: string,
  maxTokens = 2048,
): Promise<CriterionEvaluation> {
  const systemPrompt = buildCriterionSystemPrompt(agent, criterion, domainKnowledge);
  const userPrompt = buildProposalUserPrompt(proposal);

  let fullText = "";
  const events = llmProvider.createStream({
    model,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens,
  });

  for await (const event of events) {
    if (event.type === "text_delta" && event.text) {
      fullText += event.text;
    }
  }

  const parsed = parseCriterionResponse(fullText.trim());

  if (!parsed) {
    // Return a low-confidence zero score on parse failure
    return {
      proposalId: proposal.id,
      tenantId: proposal.tenantId,
      criterionId: criterion.id,
      score: 0,
      evidence: `Agent failed to produce valid response. Raw output: ${fullText.slice(0, 200)}`,
      reasoning: "Parse failure — response was not valid JSON",
      createdAt: new Date().toISOString(),
    };
  }

  return {
    proposalId: proposal.id,
    tenantId: proposal.tenantId,
    criterionId: criterion.id,
    score: parsed.score,
    evidence: parsed.evidence,
    reasoning: parsed.reasoning,
    createdAt: new Date().toISOString(),
  };
}

// ─── Full QOC Evaluation ─────────────────────────────────────

export interface EvaluationOptions {
  proposal: Proposal;
  config: TenantConfig;
  criterionAgents: CriterionAgentConfig[];
  llmProvider: LLMProvider;
  model: string;
  domainKnowledge?: string;
  maxTokens?: number;
}

/**
 * Run all criterion agents in parallel and aggregate results.
 */
export async function runFullEvaluation(
  options: EvaluationOptions,
): Promise<{
  evaluations: CriterionEvaluation[];
  aggregated: AggregatedResult;
}> {
  const {
    proposal,
    config,
    criterionAgents,
    llmProvider,
    model,
    domainKnowledge,
    maxTokens,
  } = options;

  // Run all criterion agents in parallel
  const results = await Promise.allSettled(
    criterionAgents.map((agent) => {
      const criterion = config.criteria.find((c) => c.id === agent.criterionId);
      if (!criterion) {
        return Promise.reject(new Error(`No criterion definition for ${agent.criterionId}`));
      }
      return runCriterionAgent(
        proposal,
        agent,
        criterion,
        llmProvider,
        model,
        domainKnowledge,
        maxTokens,
      );
    }),
  );

  // Collect successful evaluations
  const evaluations: CriterionEvaluation[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      evaluations.push(result.value);
    }
  }

  // Aggregate
  const aggregated = aggregate(
    evaluations,
    config,
    proposal.id,
    proposal.tenantId,
  );

  return { evaluations, aggregated };
}
