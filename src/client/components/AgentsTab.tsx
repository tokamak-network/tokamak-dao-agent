import { useState } from "react";
import { useAgentContext, type Agent } from "../contexts/AgentContext";
import { useElizaOS, type ElizaAgent } from "../contexts/ElizaOSContext";
import { AgentCreator } from "./AgentCreator";

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

/* ── ElizaOS Agent Card ──────────────────────────────────────────────── */

function ElizaAgentCard({
  agent,
  onStart,
  onStop,
}: {
  agent: ElizaAgent;
  onStart: () => void;
  onStop: () => void;
}) {
  const isActive = agent.status === "active";

  return (
    <div className="agent-card">
      <div className="agent-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`status-dot ${isActive ? "status-connected" : "status-disconnected"}`} />
          <h3 className="agent-card-name">{agent.name || agent.characterName || "Unnamed"}</h3>
        </div>
        <span className={`eliza-status-badge ${isActive ? "active" : "inactive"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {agent.bio && (
        <div className="eliza-agent-bio">
          {typeof agent.bio === "string"
            ? agent.bio.length > 120
              ? agent.bio.slice(0, 120) + "..."
              : agent.bio
            : Array.isArray(agent.bio)
              ? (agent.bio as string[]).join(" ").slice(0, 120)
              : ""}
        </div>
      )}

      <div className="agent-card-badges">
        <span className="eliza-source">ElizaOS</span>
      </div>

      <button
        className={`eliza-toggle-btn ${isActive ? "stop" : "start"}`}
        onClick={isActive ? onStop : onStart}
      >
        {isActive ? "Stop" : "Start"}
      </button>
    </div>
  );
}

/* ── Stakeholder Agent Card (existing) ───────────────────────────────── */

function StakeholderCard({ agent, onDelete }: { agent: Agent; onDelete: () => void }) {
  return (
    <div className="agent-card">
      <div className="agent-card-header">
        <h3 className="agent-card-name">{agent.name}</h3>
        <button className="agent-card-delete" onClick={onDelete} title="Delete agent">&times;</button>
      </div>
      <div className="agent-card-badges">
        <span className="agent-badge stakeholder">{STAKEHOLDER_LABELS[agent.stakeholderType]}</span>
        <span className={`agent-badge personality-${agent.personality}`}>
          {PERSONALITY_LABELS[agent.personality]}
        </span>
      </div>
      <div className="agent-card-priorities">
        {agent.priorities.slice(0, 3).map((p) => (
          <div key={p.id} className="agent-card-priority">
            <span>{p.label}</span>
            <span className="agent-card-weight">{"*".repeat(p.weight)}</span>
          </div>
        ))}
        {agent.priorities.length > 3 && (
          <div className="agent-card-more">+{agent.priorities.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

/* ── Main AgentsTab ──────────────────────────────────────────────────── */

export function AgentsTab() {
  const { agents: stakeholderAgents, loading: stakeholderLoading, deleteAgent } = useAgentContext();
  const { available, agents: elizaAgents, loading: elizaLoading, startAgent, stopAgent, refresh } = useElizaOS();
  const [creating, setCreating] = useState(false);

  if (stakeholderLoading && elizaLoading) {
    return (
      <div className="welcome-container">
        <div className="chat-welcome">
          <div className="chat-welcome-subtitle">Loading agents...</div>
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
      {/* ── ElizaOS Section ───────────────────────────────────────── */}
      <div className="agent-section">
        <div className="agent-list-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 className="agent-list-title">Live Agents</h2>
            {available && (
              <span className="eliza-status-badge active">Connected</span>
            )}
          </div>
          {available && (
            <button className="terminal-btn" onClick={refresh}>
              Refresh
            </button>
          )}
        </div>

        {!available ? (
          <div className="eliza-offline-banner">
            <div className="eliza-offline-icon">!</div>
            <div>
              <strong>ElizaOS Not Connected</strong>
              <p>Start ElizaOS on port 3000 to manage live AI agents.</p>
            </div>
          </div>
        ) : elizaAgents.length === 0 ? (
          <div className="eliza-offline-banner" style={{ borderColor: "var(--term-border)" }}>
            No agents found in ElizaOS.
          </div>
        ) : (
          <div className="agent-list-grid">
            {elizaAgents.map((agent) => (
              <ElizaAgentCard
                key={agent.id}
                agent={agent}
                onStart={() => startAgent(agent.id)}
                onStop={() => stopAgent(agent.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="agent-section-divider" />

      {/* ── Stakeholder Section ──────────────────────────────────── */}
      <div className="agent-section">
        <div className="agent-list-header">
          <h2 className="agent-list-title">Stakeholder Agents</h2>
          <button className="terminal-btn" onClick={() => setCreating(true)}>
            + Create New Agent
          </button>
        </div>

        {stakeholderAgents.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--term-text-muted)", padding: "24px 0", fontSize: 14 }}>
            No stakeholder agents yet. Create one to analyze DAO proposals from different perspectives.
          </div>
        ) : (
          <div className="agent-list-grid">
            {stakeholderAgents.map((agent) => (
              <StakeholderCard key={agent.id} agent={agent} onDelete={() => deleteAgent(agent.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
