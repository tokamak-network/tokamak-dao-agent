/**
 * Agenda validation agents for the forum review workflow.
 * Three validators analyze each agenda before it becomes open:
 * - Format: structural quality
 * - Relevance: Tokamak Network DAO relevance
 * - Feasibility: technical/governance feasibility
 */

import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ForumAgenda } from "../db/agendas.ts";
import { updateAgendaStatus } from "../db/agendas.ts";
import { createValidation } from "../db/validations.ts";
import type { CreateValidationInput } from "../db/validations.ts";
import { VALIDATION_MODEL, VALIDATION_MAX_TOKENS } from "../config.ts";

type ValidatorType = "format" | "relevance" | "feasibility";

interface ValidatorConfig {
  type: ValidatorType;
  systemPrompt: string;
}

const VALIDATORS: ValidatorConfig[] = [
  {
    type: "format",
    systemPrompt: `You are a governance proposal format validator for Tokamak Network DAO.
Evaluate whether the agenda meets structural requirements:

1. Does the title clearly describe the proposal? (not vague like "Idea" or "Question")
2. Does the content include: purpose/background, specific proposal details, and expected outcomes?
3. Is there an actionable item that the DAO can vote on or execute?

Respond with ONLY valid JSON:
{
  "status": "pass" | "fail",
  "score": <1-10 integer>,
  "feedback": "1-3 sentences explaining your evaluation"
}

Be pragmatic — a short but clear proposal can pass. Only fail proposals that are truly incomplete or unclear.
Do not include any text outside the JSON object.`,
  },
  {
    type: "relevance",
    systemPrompt: `You are a relevance validator for Tokamak Network DAO governance proposals.
Tokamak Network is an Ethereum L2 protocol with: TON token, WTON wrapped token, SeigManager for seigniorage, DepositManager for staking, DAOCommittee for governance, Layer2 operators, and PowerTON.

Evaluate whether the agenda is relevant to Tokamak Network DAO governance:

1. Is the topic related to Tokamak Network, its tokens, contracts, governance, or ecosystem?
2. Is this NOT spam, off-topic, or unrelated to the DAO's scope?
3. Does it address something the Tokamak DAO community would care about?

Respond with ONLY valid JSON:
{
  "status": "pass" | "fail",
  "score": <1-10 integer>,
  "feedback": "1-3 sentences explaining your evaluation"
}

Be inclusive — even broad ecosystem discussions or partnership proposals are relevant.
Only fail proposals that are clearly unrelated (e.g., about a completely different project).
Do not include any text outside the JSON object.`,
  },
  {
    type: "feasibility",
    systemPrompt: `You are a feasibility validator for Tokamak Network DAO governance proposals.
The DAO can execute on-chain transactions via DAOCommittee, manage parameters of SeigManager, DepositManager, and other protocol contracts.

Evaluate whether the proposal is feasible:

1. Is the proposed action technically possible (even if complex)?
2. Is it within the DAO's authority or influence?
3. Are the expected outcomes realistic?

Respond with ONLY valid JSON:
{
  "status": "pass" | "fail",
  "score": <1-10 integer>,
  "feedback": "1-3 sentences explaining your evaluation"
}

Be generous — even ambitious proposals can pass if they are not physically impossible.
Only fail proposals that propose something clearly impossible or outside any DAO's control.
Do not include any text outside the JSON object.`,
  },
];

interface ValidatorResponse {
  status: "pass" | "fail";
  score: number;
  feedback: string;
}

function parseValidatorResponse(text: string): ValidatorResponse | null {
  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  return null;
}

async function runValidator(
  validator: ValidatorConfig,
  agenda: ForumAgenda,
): Promise<CreateValidationInput> {
  try {
    const modelConfig = detectProvider(VALIDATION_MODEL);
    const provider = await getOrCreateProvider(modelConfig.provider);

    let fullText = "";
    const events = provider.createStream({
      model: modelConfig.model,
      system: validator.systemPrompt,
      messages: [
        {
          role: "user",
          content: `# Agenda: ${agenda.title}\n\n${agenda.content}\n\nDeadline: ${agenda.deadline}\nCreator: ${agenda.creator}`,
        },
      ],
      tools: [],
      maxTokens: VALIDATION_MAX_TOKENS,
    });

    for await (const event of events) {
      if (event.type === "text_delta") {
        fullText += event.text;
      }
    }
    const parsed = parseValidatorResponse(fullText.trim());
    if (!parsed) {
      console.error(
        `[forum-validators] ${validator.type}: failed to parse response:`,
        fullText,
      );
      return {
        agendaId: agenda.id,
        validatorType: validator.type,
        status: "fail",
        feedback: "Validation error: could not parse validator response.",
      };
    }

    return {
      agendaId: agenda.id,
      validatorType: validator.type,
      status: parsed.status === "pass" ? "pass" : "fail",
      score: parsed.score,
      feedback: parsed.feedback,
    };
  } catch (err) {
    console.error(`[forum-validators] ${validator.type} LLM error:`, err);
    return {
      agendaId: agenda.id,
      validatorType: validator.type,
      status: "fail",
      feedback: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Run all 3 validators in parallel, save results, and update agenda status.
 * Designed to be called fire-and-forget.
 */
export async function runValidationWorkflow(agenda: ForumAgenda): Promise<void> {
  console.log(
    `[forum-validators] starting validation for agenda #${agenda.id}: "${agenda.title}"`,
  );

  // runValidator now catches its own errors, so all promises resolve (never reject)
  const results = await Promise.all(
    VALIDATORS.map((v) => runValidator(v, agenda)),
  );

  for (const result of results) {
    createValidation(result);
  }

  const allPass = results.every((r) => r.status === "pass");
  const newStatus = allPass ? "open" : "rejected";
  updateAgendaStatus(agenda.id, newStatus);

  const passCount = results.filter((r) => r.status === "pass").length;
  console.log(
    `[forum-validators] agenda #${agenda.id}: ${newStatus} (${passCount}/3 passed)`,
  );
}
