/**
 * QOC criterion-based agent evaluation system.
 *
 * Orchestrates 7 criterion-specialist agents to evaluate agendas.
 * Each agent deeply analyzes one criterion, producing a single score with
 * detailed evidence. Stakeholder lenses are applied as pure math.
 */

import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ForumAgenda } from "../db/agendas.ts";
import type {
  QocCriterionEvaluation,
  QocCriterionRawResponse,
  QocAggregatedResult,
} from "./qoc-types.ts";
import { CRITERIA, CRITERION_AGENTS } from "./qoc-weights.ts";
import type { CriterionAgent, CriterionDef } from "./qoc-weights.ts";
import { aggregateCriterionBased } from "./qoc-aggregation.ts";
import {
  createCriterionEvaluation,
  getCriterionEvaluationsForAgenda,
  saveQocResult,
  clearCriterionEvaluationsForAgenda,
  clearQocResultForAgenda,
} from "../db/qoc.ts";
import { QOC_MODEL, QOC_MAX_TOKENS } from "../config.ts";

/**
 * Build system prompt for a criterion-specialist agent.
 */
function buildCriterionSystemPrompt(
  agent: CriterionAgent,
  criterionDef: CriterionDef,
): string {
  return `You are **${agent.agentName}**, a Tokamak Network DAO governance analyst specialized in evaluating **${criterionDef.label}**.

${agent.systemPromptFocus}

## Scoring Scale for ${criterionDef.label}
- **0** = ${criterionDef.scoreLow}
- **50** = ${criterionDef.scoreMid}
- **100** = ${criterionDef.scoreHigh}

## Relevant Verification Tools
The following tools could verify your analysis: ${criterionDef.verificationTools.join(", ")}

## Instructions
1. Focus EXCLUSIVELY on ${criterionDef.label} — do not evaluate other criteria
2. Provide a score from 0 to 100
3. Write detailed evidence (3-5 sentences minimum) referencing specific contract behavior, addresses, parameters, or storage slots
4. Explain your reasoning process (2-3 sentences)

## Response Format
Respond with ONLY valid JSON:
{ "score": <0-100>, "evidence": "...", "reasoning": "..." }

Do not include any text outside the JSON object.
Write all text in English.`;
}

/**
 * Build user prompt with agenda details.
 */
function buildUserPrompt(agenda: ForumAgenda): string {
  return `# Agenda #${agenda.id}: ${agenda.title}

${agenda.content}

Deadline: ${agenda.deadline}
Creator: ${agenda.creator}
${agenda.onChainAgendaId ? `On-chain agenda ID: ${agenda.onChainAgendaId}` : ""}`;
}

/**
 * Parse raw LLM response into criterion evaluation.
 */
function parseCriterionResponse(text: string): QocCriterionRawResponse | null {
  try {
    return validateCriterionResponse(JSON.parse(text));
  } catch (err) {
    console.error("[qoc-agents] JSON parse failed, trying regex extraction:", err instanceof Error ? err.message : err);
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return validateCriterionResponse(JSON.parse(match[0]));
    } catch (err) {
      console.error("[qoc-agents] regex-extracted JSON parse failed:", err instanceof Error ? err.message : err);
    }
  }

  return null;
}

function validateCriterionResponse(obj: any): QocCriterionRawResponse | null {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj.score !== "number" || obj.score < 0 || obj.score > 100) return null;
  if (typeof obj.evidence !== "string") return null;
  if (typeof obj.reasoning !== "string") return null;
  return obj as QocCriterionRawResponse;
}

/**
 * Run a single criterion agent evaluation.
 */
async function runCriterionAgent(
  agent: CriterionAgent,
  agenda: ForumAgenda,
): Promise<QocCriterionEvaluation> {
  const criterionDef = CRITERIA.find((c) => c.id === agent.criterionId);
  if (!criterionDef) {
    throw new Error(`Criterion definition not found: ${agent.criterionId}`);
  }

  const modelConfig = detectProvider(QOC_MODEL);
  const provider = await getOrCreateProvider(modelConfig.provider);

  let fullText = "";
  const events = provider.createStream({
    model: modelConfig.model,
    system: buildCriterionSystemPrompt(agent, criterionDef),
    messages: [{ role: "user", content: buildUserPrompt(agenda) }],
    tools: [],
    maxTokens: QOC_MAX_TOKENS,
  });

  for await (const event of events) {
    if (event.type === "text_delta") {
      fullText += event.text;
    }
  }

  const parsed = parseCriterionResponse(fullText.trim());
  if (!parsed) {
    console.error(
      `[qoc-agents] ${agent.agentName}: failed to parse response:`,
      fullText.slice(0, 500),
    );
    throw new Error(`Failed to parse response from ${agent.agentName}`);
  }

  const evaluation: QocCriterionEvaluation = {
    agendaId: agenda.id,
    criterionId: agent.criterionId,
    score: Math.round(Math.min(100, Math.max(0, parsed.score))),
    evidence: parsed.evidence,
    reasoning: parsed.reasoning,
    createdAt: new Date().toISOString(),
  };

  return createCriterionEvaluation(evaluation);
}

/**
 * Run full QOC evaluation for an agenda with all 7 criterion agents.
 * Returns the aggregated result with lens perspectives.
 */
export async function runQocEvaluation(
  agenda: ForumAgenda,
): Promise<QocAggregatedResult> {
  console.log(
    `[qoc-agents] starting criterion-based QOC evaluation for agenda #${agenda.id}: "${agenda.title}"`,
  );

  clearCriterionEvaluationsForAgenda(agenda.id);
  clearQocResultForAgenda(agenda.id);

  // Run all 7 criterion agents in parallel
  const results = await Promise.allSettled(
    CRITERION_AGENTS.map((agent) => runCriterionAgent(agent, agenda)),
  );

  const succeeded: QocCriterionEvaluation[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status === "fulfilled") {
      succeeded.push(r.value);
    } else {
      const agent = CRITERION_AGENTS[i];
      console.error(
        `[qoc-agents] criterion agent failed: criterion=${agent?.criterionId}, agent=${agent?.agentName}, agenda=#${agenda.id}`,
        r.reason,
      );
    }
  }

  console.log(
    `[qoc-agents] agenda #${agenda.id}: ${succeeded.length}/${CRITERION_AGENTS.length} criterion evaluations completed`,
  );

  // Aggregate and save
  const aggregated = aggregateCriterionBased(succeeded);
  aggregated.agendaId = agenda.id;
  const saved = saveQocResult(aggregated);

  console.log(
    `[qoc-agents] agenda #${agenda.id}: verdict=${saved.verdict}, score=${saved.finalScore}, hardVeto=${saved.hardVeto}`,
  );

  return saved;
}

/**
 * Run QOC evaluation for a single criterion.
 * Returns the evaluation or null if criterion not found.
 */
export async function runSingleCriterionEvaluation(
  agenda: ForumAgenda,
  criterionId: string,
): Promise<QocCriterionEvaluation | null> {
  const agent = CRITERION_AGENTS.find((a) => a.criterionId === criterionId);
  if (!agent) return null;

  const evaluation = await runCriterionAgent(agent, agenda);

  // Re-aggregate with all existing evaluations
  const allEvals = getCriterionEvaluationsForAgenda(agenda.id);
  const aggregated = aggregateCriterionBased(allEvals);
  aggregated.agendaId = agenda.id;
  saveQocResult(aggregated);

  return evaluation;
}
