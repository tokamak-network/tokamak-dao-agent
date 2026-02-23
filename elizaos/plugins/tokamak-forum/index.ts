/**
 * ElizaOS Plugin: Tokamak Forum Integration
 *
 * Receives webhook notifications for new DAO agendas,
 * analyzes them using MCP tools, and submits persona-based opinions.
 *
 * Data flow:
 *   POST /api/forum/agenda (agenda created)
 *     → webhook notification → this plugin's /webhook/new-agenda
 *     → MCP tool calls for on-chain analysis
 *     → LLM generates persona-based opinion
 *     → POST /api/forum/agenda/:id/opinion
 */

import type { Plugin, IAgentRuntime, Route } from "@elizaos/core";

const FORUM_BASE_URL = process.env.FORUM_BASE_URL || "http://localhost:3333/api/forum";

/**
 * Analyze an agenda using the agent's MCP tools and submit an opinion.
 */
async function analyzeAndSubmitOpinion(
  runtime: IAgentRuntime,
  agenda: { id: number; title: string; content: string; deadline: string },
): Promise<void> {
  const agentName = runtime.character.username || runtime.character.name;
  const stakeholderType = runtime.character.bio?.[0] || "";
  const personality = runtime.character.bio?.[1] || "";

  // Build analysis prompt incorporating character knowledge and style
  const knowledge = (runtime.character.knowledge || []).join("\n- ");
  const styleGuidelines = (runtime.character.style?.all || []).join("\n- ");

  const analysisPrompt = `You are a Tokamak Network DAO governance participant.

## Your Role
${stakeholderType}
${personality}

## Knowledge
- ${knowledge}

## Response Style
- ${styleGuidelines}

## Agenda to Analyze
Title: ${agenda.title}
Content: ${agenda.content}
Deadline: ${agenda.deadline}

## Instructions
Please provide your opinion on this agenda in the following format:

1. **Verdict** (one of: approve/reject/abstain)
2. **Reasoning** (3-5 sentences referencing on-chain data)
3. **Confidence** (1-5, higher when supported by on-chain verification)
4. **Priorities** (top 3 factors considered for this agenda)

Use MCP tools to query relevant on-chain data before writing your opinion.`;

  try {
    // Use runtime's message completion to generate analysis with MCP tool access
    const response = await runtime.useModel({
      prompt: analysisPrompt,
      maxTokens: 2000,
    });

    const responseText = typeof response === "string" ? response : String(response);

    // Parse the LLM response into structured opinion
    const opinion = parseOpinionResponse(responseText);

    // Submit opinion to forum API
    const submitRes = await fetch(`${FORUM_BASE_URL}/agenda/${agenda.id}/opinion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentName,
        stakeholderType: extractStakeholderType(stakeholderType),
        personality: extractPersonality(personality),
        verdict: opinion.verdict,
        reasoning: opinion.reasoning,
        confidence: opinion.confidence,
        priorities: opinion.priorities,
      }),
    });

    if (!submitRes.ok) {
      const errorBody = await submitRes.text();
      console.error(`[tokamak-forum] Failed to submit opinion for agenda ${agenda.id}: ${submitRes.status} ${errorBody}`);
    } else {
      console.log(`[tokamak-forum] ${agentName} submitted opinion for agenda ${agenda.id}: ${opinion.verdict}`);
    }
  } catch (err) {
    console.error(`[tokamak-forum] Error analyzing agenda ${agenda.id}:`, err);
  }
}

/**
 * Parse LLM response into structured opinion fields.
 */
function parseOpinionResponse(text: string): {
  verdict: string;
  reasoning: string;
  confidence: number;
  priorities: { id: string; label: string; weight: number }[];
} {
  // Extract verdict (forum API requires uppercase: APPROVE, REJECT, NEEDS_REVIEW, ABSTAIN)
  let verdict = "ABSTAIN";
  const verdictMatch = text.match(/Verdict[：:]\s*(approve|reject|abstain|needs_review)/i);
  if (verdictMatch) {
    verdict = verdictMatch[1].toUpperCase();
  } else if (text.includes("approve") || text.includes("in favor")) {
    verdict = "APPROVE";
  } else if (text.includes("reject") || text.includes("oppose")) {
    verdict = "REJECT";
  }

  // Extract confidence
  let confidence = 3;
  const confMatch = text.match(/Confidence[：:]\s*(\d)/i);
  if (confMatch) {
    confidence = Math.min(5, Math.max(1, parseInt(confMatch[1])));
  }

  // Extract priorities from numbered/bulleted list after "Priorities"
  const priorities: { id: string; label: string; weight: number }[] = [];
  const prioritySection = text.split(/Priorities/i)[1];
  if (prioritySection) {
    const lines = prioritySection.split("\n").filter((l) => l.trim().match(/^[\d\-\*•]/));
    lines.slice(0, 3).forEach((line, i) => {
      const label = line.replace(/^[\d\.\-\*•\s]+/, "").trim();
      if (label) {
        priorities.push({
          id: `priority_${i + 1}`,
          label: label.slice(0, 100),
          weight: 3 - i, // 3, 2, 1
        });
      }
    });
  }

  // Use full text as reasoning (excluding parsed sections for cleanliness)
  const reasoning = text
    .replace(/Priorities[\s\S]*$/i, "")
    .replace(/Confidence[：:]\s*\d/i, "")
    .trim()
    .slice(0, 2000);

  return { verdict, reasoning, confidence, priorities };
}

function extractStakeholderType(bio: string): string {
  if (bio.includes("TON") && bio.includes("holder")) return "ton_holder";
  if (bio.includes("operator") || bio.includes("Layer 2")) return "l2_operator";
  if (bio.includes("validator")) return "validator";
  if (bio.includes("foundation")) return "foundation";
  return "other";
}

function extractPersonality(bio: string): string {
  if (bio.includes("Progressive") || bio.includes("active ecosystem expansion")) return "progressive";
  if (bio.includes("Conservative") || bio.includes("proven solutions")) return "conservative";
  if (bio.includes("Defensive") || bio.includes("security vulnerabilities")) return "defensive";
  if (bio.includes("Aggressive") || bio.includes("bold")) return "aggressive";
  return "neutral";
}

// ── Plugin Routes ─────────────────────────────────────────────────────

const webhookRoute: Route = {
  type: "POST",
  path: "/webhook/new-agenda",
  handler: async (req: any, res: any, runtime: IAgentRuntime) => {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const agenda = body.data || body;

      if (!agenda.id || !agenda.title) {
        res.status(400).json({ error: "Invalid agenda data: id and title required" });
        return;
      }

      // Respond immediately, process async
      res.status(202).json({ status: "accepted", agendaId: agenda.id });

      // Fire-and-forget analysis
      analyzeAndSubmitOpinion(runtime, agenda).catch((err) =>
        console.error(`[tokamak-forum] Background analysis failed:`, err),
      );
    } catch (err) {
      console.error("[tokamak-forum] Webhook handler error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  },
};

// ── Plugin Actions ────────────────────────────────────────────────────

const analyzeAgendaAction = {
  name: "ANALYZE_AGENDA",
  description: "Analyzes DAO agendas and submits persona-based opinions",
  similes: ["analyze proposal", "review agenda", "analyze agenda", "submit opinion"],
  validate: async (_runtime: IAgentRuntime, message: any) => {
    const text = message.content?.text || "";
    return text.includes("agenda") || text.includes("proposal");
  },
  handler: async (runtime: IAgentRuntime, message: any, state: any) => {
    const text = message.content?.text || "";

    // Try to extract agenda ID from message
    const idMatch = text.match(/(?:agenda|proposal)\s*#?(\d+)/i);
    if (!idMatch) {
      return { text: "Please specify an agenda ID. Example: 'agenda #1 analyze'" };
    }

    const agendaId = parseInt(idMatch[1]);

    // Fetch agenda from forum API
    const res = await fetch(`${FORUM_BASE_URL}/agenda/${agendaId}`);
    if (!res.ok) {
      return { text: `Agenda #${agendaId} not found.` };
    }

    const agenda = (await res.json()) as { id: number; title: string; content: string; deadline: string };

    await analyzeAndSubmitOpinion(runtime, agenda);

    return { text: `Analysis and opinion submission for agenda #${agendaId} "${agenda.title}" completed.` };
  },
  examples: [
    [
      { user: "user", content: { text: "analyze agenda #5" } },
      { user: "agent", content: { text: "Analysis and opinion submission for agenda #5 completed." } },
    ],
  ],
};

// ── Plugin Definition ─────────────────────────────────────────────────

export const tokamakForumPlugin: Plugin = {
  name: "tokamak-forum",
  description: "Tokamak DAO forum integration: receives agenda webhooks, analyzes, and submits opinions",
  routes: [webhookRoute],
  actions: [analyzeAgendaAction],
};

export default tokamakForumPlugin;
