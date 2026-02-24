/**
 * 2-Phase Deliberation Protocol
 *
 * Phase 1: N criterion agents evaluate independently
 * Phase 2: Meta-agent synthesizes, detects contradictions, adjusts scores (±max_adj)
 */

import type {
  Proposal,
  CriterionEvaluation,
  AggregatedResult,
  MetaAnalysis,
  MetaAdjustment,
  DeliberationResult,
  DeliberationRound,
  LLMProvider,
  TenantConfig,
  CriterionAgentConfig,
} from "../types/index.js";
import { aggregate } from "../core/aggregation.js";
import { runFullEvaluation } from "./agents.js";

// ─── Meta-Agent Prompts ──────────────────────────────────────

function buildMetaSystemPrompt(maxAdjustment: number): string {
  return `You are a Meta-Analysis Agent for governance evaluation.
Your role is to synthesize evaluations from multiple criterion-specialist agents.

## Your Tasks
1. **Detect contradictions** — If one criterion scores very high but a related criterion scores very low, flag the unexplained gap
2. **Evaluate evidence quality** — Is each agent's evidence grounded in specific, verifiable data?
3. **Propose adjustments** — Based on contradictions and evidence quality, propose adjustments of up to ±${maxAdjustment} points per criterion
4. **Synthesize** — Provide an overall assessment of evaluation quality

## Rules
- Adjustments must be between -${maxAdjustment} and +${maxAdjustment}
- Only adjust when you have a clear, evidence-based reason
- Do not adjust all scores — only where contradictions or weak evidence warrant it
- Your synthesis should be 2-4 sentences

## Response Format (JSON only)
\`\`\`json
{
  "contradictions": ["description of contradiction 1", ...],
  "evidenceQuality": {
    "criterionId": "strong|moderate|weak — brief reason",
    ...
  },
  "adjustments": [
    {
      "criterionId": "...",
      "originalScore": 85,
      "adjustedScore": 80,
      "adjustmentReason": "..."
    }
  ],
  "synthesis": "Overall assessment..."
}
\`\`\``;
}

function buildMetaUserPrompt(
  proposal: Proposal,
  evaluations: CriterionEvaluation[],
): string {
  const sections: string[] = [];

  sections.push(`## Proposal: ${proposal.title}`);
  sections.push("");

  if (proposal.description) {
    sections.push(proposal.description.slice(0, 2000));
    sections.push("");
  }

  sections.push("## Phase 1 Evaluations");
  sections.push("");

  for (const evaluation of evaluations) {
    sections.push(`### ${evaluation.criterionId}: Score ${evaluation.score}/100`);
    sections.push(`**Evidence**: ${evaluation.evidence}`);
    sections.push(`**Reasoning**: ${evaluation.reasoning}`);
    sections.push("");
  }

  sections.push("Review these evaluations for contradictions and evidence quality. Respond with JSON only.");

  return sections.join("\n");
}

// ─── Meta-Analysis Parsing ───────────────────────────────────

function parseMetaAnalysis(text: string, maxAdj: number): MetaAnalysis | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    const contradictions: string[] = Array.isArray(parsed.contradictions)
      ? parsed.contradictions.map(String)
      : [];

    const evidenceQuality: Record<string, string> = {};
    if (parsed.evidenceQuality && typeof parsed.evidenceQuality === "object") {
      for (const [key, value] of Object.entries(parsed.evidenceQuality)) {
        evidenceQuality[key] = String(value);
      }
    }

    const adjustments: MetaAdjustment[] = [];
    if (Array.isArray(parsed.adjustments)) {
      for (const adj of parsed.adjustments) {
        if (!adj || typeof adj !== "object") continue;
        const original = Number(adj.originalScore);
        let adjusted = Number(adj.adjustedScore);

        // Enforce max adjustment
        if (Math.abs(adjusted - original) > maxAdj) {
          adjusted = original + Math.sign(adjusted - original) * maxAdj;
        }
        // Clamp to 0-100
        adjusted = Math.max(0, Math.min(100, adjusted));

        adjustments.push({
          criterionId: String(adj.criterionId),
          originalScore: original,
          adjustedScore: adjusted,
          adjustmentReason: String(adj.adjustmentReason ?? ""),
        });
      }
    }

    const synthesis = String(parsed.synthesis ?? "");

    return { contradictions, evidenceQuality, adjustments, synthesis };
  } catch {
    return null;
  }
}

// ─── Deliberation Runner ─────────────────────────────────────

export interface DeliberationOptions {
  proposal: Proposal;
  config: TenantConfig;
  criterionAgents: CriterionAgentConfig[];
  llmProvider: LLMProvider;
  model: string;
  domainKnowledge?: string;
  maxAdjustment?: number; // default 10
  maxTokens?: number;
}

/**
 * Run 2-phase deliberation:
 * Phase 1: Independent criterion evaluation
 * Phase 2: Meta-agent synthesis and score adjustment
 */
export async function runDeliberation(
  options: DeliberationOptions,
): Promise<DeliberationResult> {
  const {
    proposal,
    config,
    criterionAgents,
    llmProvider,
    model,
    domainKnowledge,
    maxAdjustment = 10,
    maxTokens,
  } = options;

  const rounds: DeliberationRound[] = [];

  // ── Phase 1: Independent evaluation ──
  const { evaluations, aggregated: phase1Result } = await runFullEvaluation({
    proposal,
    config,
    criterionAgents,
    llmProvider,
    model,
    domainKnowledge,
    maxTokens,
  });

  // Record Phase 1 rounds
  for (const evaluation of evaluations) {
    rounds.push({
      id: crypto.randomUUID(),
      proposalId: proposal.id,
      tenantId: proposal.tenantId,
      phase: 1,
      agentName: criterionAgents.find((a) => a.criterionId === evaluation.criterionId)?.agentName ?? evaluation.criterionId,
      criterionId: evaluation.criterionId,
      score: evaluation.score,
      reasoning: `${evaluation.evidence}\n\n${evaluation.reasoning}`,
      createdAt: evaluation.createdAt,
    });
  }

  // ── Phase 2: Meta-analysis ──
  const metaSystemPrompt = buildMetaSystemPrompt(maxAdjustment);
  const metaUserPrompt = buildMetaUserPrompt(proposal, evaluations);

  let metaText = "";
  const events = llmProvider.createStream({
    model,
    system: metaSystemPrompt,
    messages: [{ role: "user", content: metaUserPrompt }],
    maxTokens: maxTokens ?? 2048,
  });

  for await (const event of events) {
    if (event.type === "text_delta" && event.text) {
      metaText += event.text;
    }
  }

  const metaAnalysis = parseMetaAnalysis(metaText.trim(), maxAdjustment);

  if (!metaAnalysis) {
    // Meta-analysis failed — return Phase 1 results unchanged
    return {
      rounds,
      phase1Result,
      phase2Result: phase1Result,
      metaAnalysis: {
        contradictions: [],
        evidenceQuality: {},
        adjustments: [],
        synthesis: "Meta-analysis failed to produce valid output.",
      },
    };
  }

  // Record Phase 2 round
  rounds.push({
    id: crypto.randomUUID(),
    proposalId: proposal.id,
    tenantId: proposal.tenantId,
    phase: 2,
    agentName: "Meta-Analysis Agent",
    criterionId: null,
    score: null,
    reasoning: metaAnalysis.synthesis,
    createdAt: new Date().toISOString(),
  });

  // ── Apply adjustments ──
  const adjustedEvaluations = evaluations.map((evaluation) => {
    const adjustment = metaAnalysis.adjustments.find(
      (a) => a.criterionId === evaluation.criterionId,
    );
    if (adjustment) {
      return { ...evaluation, score: adjustment.adjustedScore };
    }
    return evaluation;
  });

  const phase2Result = aggregate(
    adjustedEvaluations,
    config,
    proposal.id,
    proposal.tenantId,
  );

  return {
    rounds,
    phase1Result,
    phase2Result,
    metaAnalysis,
  };
}
