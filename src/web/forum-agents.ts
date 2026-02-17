/**
 * AI agent opinion auto-generation for forum agendas.
 * When an agenda is created, 4 agents with distinct stakeholder perspectives
 * independently analyze it and submit opinions.
 */

import { detectProvider, getOrCreateProvider } from "./providers/index.ts";
import type { ForumAgenda } from "../db/agendas.ts";
import { createOpinion } from "../db/opinions.ts";
import { OPINION_MODEL, OPINION_MAX_TOKENS } from "../config.ts";

interface AgentConfig {
  agentName: string;
  stakeholderType: string;
  personality: string;
  perspective: string;
}

const AGENTS: AgentConfig[] = [
  {
    agentName: "Agent Alpha",
    stakeholderType: "ton_holder",
    personality: "progressive",
    perspective: "Token value growth, DeFi utility",
  },
  {
    agentName: "Agent Beta",
    stakeholderType: "layer2_operator",
    personality: "conservative",
    perspective: "Network stability, operator costs",
  },
  {
    agentName: "Agent Gamma",
    stakeholderType: "validator",
    personality: "defensive",
    perspective: "Security, decentralization, validator rewards",
  },
  {
    agentName: "Agent Delta",
    stakeholderType: "foundation",
    personality: "aggressive",
    perspective: "Ecosystem growth, bold moves",
  },
];

function buildSystemPrompt(agent: AgentConfig): string {
  return `You are ${agent.agentName}, a Tokamak Network DAO governance analyst.
Stakeholder role: ${agent.stakeholderType}
Analysis style: ${agent.personality}
Focus: ${agent.perspective}

Analyze the governance agenda below and respond with ONLY valid JSON:
{
  "verdict": "APPROVE" | "REJECT" | "NEEDS_REVIEW" | "ABSTAIN",
  "reasoning": "2-4 sentences explaining your position",
  "confidence": <1-5 integer>,
  "priorities": ["priority1", "priority2"]
}

Focus on impacts relevant to your stakeholder perspective.
Do not include any text outside the JSON object.`;
}

function buildUserPrompt(agenda: ForumAgenda): string {
  return `# Agenda: ${agenda.title}

${agenda.content}

Deadline: ${agenda.deadline}
Creator: ${agenda.creator}`;
}

interface AgentResponse {
  verdict: string;
  reasoning: string;
  confidence: number;
  priorities: string[];
}

function parseAgentResponse(text: string): AgentResponse | null {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Extract JSON from markdown code block or surrounding text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  return null;
}

async function runAgent(agent: AgentConfig, agenda: ForumAgenda): Promise<void> {
  const modelConfig = detectProvider(OPINION_MODEL);
  const provider = await getOrCreateProvider(modelConfig.provider);

  let fullText = "";
  const events = provider.createStream({
    model: modelConfig.model,
    system: buildSystemPrompt(agent),
    messages: [{ role: "user", content: buildUserPrompt(agenda) }],
    tools: [],
    maxTokens: OPINION_MAX_TOKENS,
  });

  for await (const event of events) {
    if (event.type === "text_delta") {
      fullText += event.text;
    }
  }

  const parsed = parseAgentResponse(fullText.trim());
  if (!parsed) {
    console.error(`[forum-agents] ${agent.agentName}: failed to parse response:`, fullText);
    return;
  }

  createOpinion({
    agendaId: agenda.id,
    agentName: agent.agentName,
    stakeholderType: agent.stakeholderType,
    personality: agent.personality,
    verdict: parsed.verdict,
    reasoning: parsed.reasoning,
    confidence: parsed.confidence,
    priorities: parsed.priorities,
  });

  console.log(`[forum-agents] ${agent.agentName}: ${parsed.verdict} (confidence: ${parsed.confidence}/5)`);
}

/**
 * Generate opinions from all 4 AI agents for the given agenda.
 * Designed to be called fire-and-forget (no await needed).
 */
export async function generateAgentOpinions(agenda: ForumAgenda): Promise<void> {
  console.log(`[forum-agents] generating opinions for agenda #${agenda.id}: "${agenda.title}"`);

  const results = await Promise.allSettled(
    AGENTS.map((agent) => runAgent(agent, agenda)),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  if (failed > 0) {
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("[forum-agents] agent failed:", r.reason);
      }
    }
  }

  console.log(`[forum-agents] agenda #${agenda.id}: ${succeeded}/${AGENTS.length} opinions generated`);
}
