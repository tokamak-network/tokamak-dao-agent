import { useState, useEffect, useCallback } from "react";
import { useAgentContext, type Agent } from "../contexts/AgentContext";
import { useElizaOS, type ElizaAgent } from "../contexts/ElizaOSContext";
import { AgentCreator } from "./AgentCreator";

/* ── Constants (mirrored from qoc-weights.ts for client) ──────────── */

const CRITERIA_LABELS: Record<string, string> = {
  techSafety: "Tech Safety",
  econImpact: "Economic",
  govIntegrity: "Governance",
  opsContinuity: "Operations",
  stratAlign: "Strategy",
  reversibility: "Reversibility",
  implQuality: "Impl Quality",
};

const CRITERIA_ORDER = [
  "techSafety",
  "econImpact",
  "govIntegrity",
  "opsContinuity",
  "stratAlign",
  "reversibility",
  "implQuality",
] as const;

interface AgentProfile {
  id: string;
  name: string;
  stakeholderType: string;
  stakeholderLabel: string;
  personality: string;
  description: string;
  accentColor: string;
  cssVar: string;
  weights: Record<string, number>;
}

const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "alpha",
    name: "Agent Alpha",
    stakeholderType: "ton_holder",
    stakeholderLabel: "TON Holder",
    personality: "Progressive",
    description:
      "TON holder perspective — prioritizes economic impact and strategic alignment",
    accentColor: "#3b82f6",
    cssVar: "var(--agent-alpha)",
    weights: {
      techSafety: 15,
      econImpact: 30,
      govIntegrity: 10,
      opsContinuity: 10,
      stratAlign: 20,
      reversibility: 10,
      implQuality: 5,
    },
  },
  {
    id: "beta",
    name: "Agent Beta",
    stakeholderType: "layer2_operator",
    stakeholderLabel: "L2 Operator",
    personality: "Conservative",
    description:
      "L2 operator perspective — prioritizes operational continuity and technical safety",
    accentColor: "#8b5cf6",
    cssVar: "var(--agent-beta)",
    weights: {
      techSafety: 25,
      econImpact: 10,
      govIntegrity: 10,
      opsContinuity: 30,
      stratAlign: 5,
      reversibility: 15,
      implQuality: 5,
    },
  },
  {
    id: "gamma",
    name: "Agent Gamma",
    stakeholderType: "validator",
    stakeholderLabel: "Validator",
    personality: "Aggressive",
    description:
      "Validator perspective — prioritizes technical safety and governance integrity",
    accentColor: "#22c55e",
    cssVar: "var(--agent-gamma)",
    weights: {
      techSafety: 30,
      econImpact: 15,
      govIntegrity: 20,
      opsContinuity: 10,
      stratAlign: 5,
      reversibility: 15,
      implQuality: 5,
    },
  },
  {
    id: "delta",
    name: "Agent Delta",
    stakeholderType: "foundation",
    stakeholderLabel: "Foundation",
    personality: "Defensive",
    description:
      "Foundation perspective — prioritizes strategic alignment and implementation quality",
    accentColor: "#f59e0b",
    cssVar: "var(--agent-delta)",
    weights: {
      techSafety: 10,
      econImpact: 15,
      govIntegrity: 10,
      opsContinuity: 5,
      stratAlign: 35,
      reversibility: 5,
      implQuality: 20,
    },
  },
];

/* ── Types ─────────────────────────────────────────────────────────── */

interface CredibilityRecord {
  id: number;
  agentName: string;
  agendaId: number;
  predictedVerdict: string;
  predictedScore: number;
  actualOutcome: string | null;
  scoreDelta: number;
  createdAt: string;
  resolvedAt: string | null;
}

interface MergedAgent {
  profile: AgentProfile;
  eliza: ElizaAgent | null;
}

const STAKEHOLDER_LABELS: Record<string, string> = {
  ton_holder: "TON Holder",
  layer2_operator: "Layer2 Operator",
  validator: "Validator",
  foundation: "Foundation",
};

const PERSONALITY_LABELS: Record<string, string> = {
  progressive: "Progressive",
  conservative: "Conservative",
  aggressive: "Aggressive",
  defensive: "Defensive",
};

/* ── useAgentDashboard hook ───────────────────────────────────────── */

function useAgentDashboard(elizaAgents: ElizaAgent[]) {
  const merged: MergedAgent[] = AGENT_PROFILES.map((profile) => {
    const eliza =
      elizaAgents.find(
        (e) =>
          e.name === profile.name ||
          e.characterName === profile.name,
      ) ?? null;

    return { profile, eliza };
  });

  return merged;
}

/* ── Color palette for custom agents ──────────────────────────────── */

const CUSTOM_ACCENT_COLORS = ["#ec4899", "#06b6d4", "#f97316", "#84cc16", "#a855f7"];

function customAgentToProfile(agent: Agent, index: number): AgentProfile {
  const weights: Record<string, number> = {};
  for (const p of agent.priorities) weights[p.id] = p.weight;
  return {
    id: `custom-${agent.id}`,
    name: agent.name,
    stakeholderType: agent.stakeholderType,
    stakeholderLabel: STAKEHOLDER_LABELS[agent.stakeholderType] ?? agent.stakeholderType,
    personality: PERSONALITY_LABELS[agent.personality] ?? agent.personality,
    description: "",
    accentColor: CUSTOM_ACCENT_COLORS[index % CUSTOM_ACCENT_COLORS.length],
    cssVar: "",
    weights,
  };
}

/* ── UnifiedAgentCard ─────────────────────────────────────────────── */

function UnifiedAgentCard({
  data,
  expanded,
  onToggleExpand,
  elizaAvailable,
  onStart,
  onStop,
  onDelete,
}: {
  data: MergedAgent;
  expanded: boolean;
  onToggleExpand: () => void;
  elizaAvailable: boolean;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete?: () => void;
}) {
  const { profile, eliza } = data;
  const [history, setHistory] = useState<CredibilityRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const isActive = eliza?.status === "active";
  const isUnavailable = !eliza;
  const isCustom = !!onDelete;

  const statusClass = isActive
    ? "status-connected"
    : isUnavailable
      ? "status-unavailable"
      : "status-disconnected";

  // Load credibility history on expand
  useEffect(() => {
    if (expanded && !historyLoaded) {
      fetch(
        `/api/forum/credibility/${encodeURIComponent(profile.name)}`,
      )
        .then((r) => r.json())
        .then((data) => {
          setHistory(data.history ?? []);
          setHistoryLoaded(true);
        })
        .catch(() => setHistoryLoaded(true));
    }
  }, [expanded, historyLoaded, profile.name]);

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!eliza) return;
      if (isActive) {
        onStop(eliza.id);
      } else {
        onStart(eliza.id);
      }
    },
    [eliza, isActive, onStart, onStop],
  );

  const maxWeight = Math.max(...Object.values(profile.weights), 1);

  return (
    <div
      className="agent-dash-card"
      data-agent={isCustom ? undefined : profile.id}
      style={isCustom ? { borderLeftColor: profile.accentColor } : undefined}
      onClick={onToggleExpand}
    >
      {/* Zone 1: Header */}
      <div className="agent-dash-header">
        <div className="agent-dash-name-row">
          <span className={`status-dot ${statusClass}`} />
          <span className="agent-dash-name">{profile.name}</span>
        </div>
        <div className="agent-dash-badges">
          <span className="agent-dash-badge stakeholder">
            {profile.stakeholderLabel}
          </span>
          <span className="agent-dash-badge personality">
            {profile.personality}
          </span>
          {isCustom && (
            <button
              className="agent-card-delete"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete agent"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Zone 2: Description */}
      {profile.description && (
        <div className="agent-dash-desc">{profile.description}</div>
      )}

      {/* Zone 3: Weight lens chart */}
      <div className="agent-dash-lens">
        {CRITERIA_ORDER.map((cid) => {
          const w = profile.weights[cid] ?? 0;
          return (
            <div key={cid} className="agent-dash-lens-row">
              <span className="agent-dash-lens-label">
                {CRITERIA_LABELS[cid]}
              </span>
              <div className="agent-dash-lens-track">
                <div
                  className="agent-dash-lens-bar"
                  style={{
                    width: `${(w / maxWeight) * 100}%`,
                    background: profile.accentColor,
                  }}
                />
              </div>
              <span className="agent-dash-lens-val">{w}</span>
            </div>
          );
        })}
      </div>

      {/* Zone 4: Footer — only for core agents with ElizaOS */}
      {!isCustom && (
        <div className="agent-dash-footer">
          <span />
          <button
            className={`agent-dash-toggle ${isActive ? "stop" : "start"}`}
            disabled={!elizaAvailable || isUnavailable}
            onClick={handleToggleClick}
          >
            {isUnavailable
              ? "Unavailable"
              : isActive
                ? "Stop"
                : "Start"}
          </button>
        </div>
      )}

      {/* Expanded detail panel — only when there's credibility data */}
      {expanded && history.length > 0 && (
        <div className="agent-dash-detail" onClick={(e) => e.stopPropagation()}>
          <div className="agent-dash-detail-section">
            <div className="agent-dash-detail-title">
              Credibility History
            </div>
            <ul className="agent-dash-detail-list">
              {history.slice(0, 10).map((h) => (
                <li
                  key={h.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    Agenda #{h.agendaId} &mdash;{" "}
                    {h.predictedVerdict}
                    {h.actualOutcome
                      ? ` → ${h.actualOutcome}`
                      : " (pending)"}
                  </span>
                  <span
                    style={{
                      color:
                        h.scoreDelta > 0
                          ? "var(--term-success)"
                          : h.scoreDelta < 0
                            ? "var(--term-error)"
                            : "var(--term-text-dim)",
                      fontWeight: 600,
                    }}
                  >
                    {h.resolvedAt
                      ? h.scoreDelta > 0
                        ? `+${h.scoreDelta}`
                        : `${h.scoreDelta}`
                      : "\u2014"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main AgentsTab ────────────────────────────────────────────────── */

export function AgentsTab() {
  const {
    agents: stakeholderAgents,
    loading: stakeholderLoading,
    deleteAgent,
  } = useAgentContext();
  const {
    available,
    agents: elizaAgents,
    loading: elizaLoading,
    startAgent,
    stopAgent,
  } = useElizaOS();
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const coreMerged = useAgentDashboard(elizaAgents);

  // Convert custom agents to the same MergedAgent shape
  const customMerged: MergedAgent[] = stakeholderAgents.map((agent, i) => ({
    profile: customAgentToProfile(agent, i),
    eliza: null,
  }));

  const allAgents = [...coreMerged, ...customMerged];

  if (stakeholderLoading && elizaLoading) {
    return (
      <div className="welcome-container">
        <div className="chat-welcome">
          <div className="chat-welcome-subtitle">
            Loading agents...
          </div>
        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <AgentCreator
        onCancel={() => setCreating(false)}
        onComplete={() => setCreating(false)}
      />
    );
  }

  return (
    <div className="agent-list-container">
      <div className="agent-section">
        <div className="agent-list-header">
          <div
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <h2 className="agent-list-title">DAO Agents</h2>
            {available && (
              <span className="eliza-status-badge active">
                Connected
              </span>
            )}
            {!available && (
              <span className="eliza-status-badge inactive">
                Offline
              </span>
            )}
          </div>
          <button
            className="terminal-btn"
            onClick={() => setCreating(true)}
          >
            + Create Agent
          </button>
        </div>

        <div className="agent-dash-grid">
          {allAgents.map((m) => {
            const customAgent = stakeholderAgents.find(
              (a) => `custom-${a.id}` === m.profile.id,
            );
            return (
              <UnifiedAgentCard
                key={m.profile.id}
                data={m}
                expanded={expandedId === m.profile.id}
                onToggleExpand={() =>
                  setExpandedId(
                    expandedId === m.profile.id
                      ? null
                      : m.profile.id,
                  )
                }
                elizaAvailable={available}
                onStart={startAgent}
                onStop={stopAgent}
                onDelete={
                  customAgent
                    ? () => deleteAgent(customAgent.id)
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
