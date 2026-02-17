/**
 * Input validation for forum endpoints.
 * Convention: returns null if valid, error string if invalid.
 */

const STAKEHOLDER_TYPES = [
  "ton_holder",
  "layer2_operator",
  "validator",
  "foundation",
] as const;

const PERSONALITIES = [
  "progressive",
  "conservative",
  "aggressive",
  "defensive",
] as const;

const VERDICTS = ["APPROVE", "REJECT", "NEEDS_REVIEW", "ABSTAIN"] as const;

export function validateAgendaInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Request body is required";

  const { title, content, deadline } = body;

  if (typeof title !== "string" || title.length < 1 || title.length > 200) {
    return "title must be 1-200 characters";
  }
  if (typeof content !== "string" || content.length < 1 || content.length > 10000) {
    return "content must be 1-10000 characters";
  }
  if (typeof deadline !== "string") {
    return "deadline is required (ISO 8601 format)";
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return "deadline must be a valid ISO 8601 date";
  }
  if (deadlineDate <= new Date()) {
    return "deadline must be in the future";
  }

  if (body.onChainAgendaId !== undefined && typeof body.onChainAgendaId !== "number") {
    return "onChainAgendaId must be a number";
  }
  if (body.creator !== undefined && typeof body.creator !== "string") {
    return "creator must be a string";
  }

  return null;
}

export function validateOpinionInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Request body is required";

  const { agentName, stakeholderType, personality, verdict, reasoning, confidence } = body;

  if (typeof agentName !== "string" || agentName.length < 1 || agentName.length > 100) {
    return "agentName must be 1-100 characters";
  }
  if (!STAKEHOLDER_TYPES.includes(stakeholderType)) {
    return `stakeholderType must be one of: ${STAKEHOLDER_TYPES.join(", ")}`;
  }
  if (!PERSONALITIES.includes(personality)) {
    return `personality must be one of: ${PERSONALITIES.join(", ")}`;
  }
  if (!VERDICTS.includes(verdict)) {
    return `verdict must be one of: ${VERDICTS.join(", ")}`;
  }
  if (typeof reasoning !== "string" || reasoning.length < 1 || reasoning.length > 5000) {
    return "reasoning must be 1-5000 characters";
  }
  if (typeof confidence !== "number" || !Number.isInteger(confidence) || confidence < 1 || confidence > 5) {
    return "confidence must be an integer between 1 and 5";
  }

  return null;
}

export function validateAgentInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Request body is required";

  const { id, name, stakeholderType, personality, priorities } = body;

  if (typeof id !== "string" || id.length < 1) {
    return "id is required";
  }
  if (typeof name !== "string" || name.length < 1 || name.length > 100) {
    return "name must be 1-100 characters";
  }
  if (!STAKEHOLDER_TYPES.includes(stakeholderType)) {
    return `stakeholderType must be one of: ${STAKEHOLDER_TYPES.join(", ")}`;
  }
  if (!PERSONALITIES.includes(personality)) {
    return `personality must be one of: ${PERSONALITIES.join(", ")}`;
  }
  if (!Array.isArray(priorities) || priorities.length < 3 || priorities.length > 5) {
    return "priorities must be an array of 3-5 items";
  }
  for (const p of priorities) {
    if (!p || typeof p !== "object") return "each priority must be an object";
    if (typeof p.id !== "string" || !p.id) return "each priority must have an id";
    if (typeof p.label !== "string" || !p.label) return "each priority must have a label";
    if (typeof p.weight !== "number" || !Number.isInteger(p.weight) || p.weight < 1 || p.weight > 5) {
      return "each priority weight must be an integer between 1 and 5";
    }
  }

  return null;
}

export function validateWebhookInput(body: any): string | null {
  if (!body || typeof body !== "object") return "Request body is required";

  const { url } = body;
  if (typeof url !== "string") return "url is required";

  try {
    new URL(url);
  } catch {
    return "url must be a valid URL";
  }

  return null;
}
