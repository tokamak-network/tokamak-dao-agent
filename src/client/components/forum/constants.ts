export const STAKEHOLDER_LABELS: Record<string, string> = {
  ton_holder: "TON Holder",
  layer2_operator: "Layer2 Operator",
  validator: "Validator",
  foundation: "Foundation",
};

export const PERSONALITY_LABELS: Record<string, string> = {
  progressive: "Progressive",
  conservative: "Conservative",
  aggressive: "Aggressive",
  defensive: "Defensive",
};

export const VERDICT_COLORS: Record<string, string> = {
  APPROVE: "var(--term-success)",
  REJECT: "var(--term-error)",
  NEEDS_REVIEW: "var(--term-warning)",
  ABSTAIN: "var(--term-text-muted)",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Reviewing",
  rejected: "Rejected",
  open: "Open",
  closed: "Closed",
  archived: "Archived",
};

export const FALLBACK_AGENT_NAMES = [
  "Agent Alpha",
  "Agent Beta",
  "Agent Gamma",
  "Agent Delta",
];

export const WIZARD_SUGGESTIONS = [
  "Change the DAO seigniorage rate",
  "Approve TON from the DAO vault",
  "Update the minimum staking amount",
  "Change the agenda creation fee",
];
