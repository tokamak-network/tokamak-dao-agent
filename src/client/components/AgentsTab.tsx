import { useState } from "react";
import { useAgentContext, type Agent } from "../contexts/AgentContext";
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

function AgentCard({ agent, onDelete }: { agent: Agent; onDelete: () => void }) {
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

export function AgentsTab() {
  const { agents, loading, deleteAgent } = useAgentContext();
  const [creating, setCreating] = useState(false);

  if (loading) {
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

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="welcome-container">
        <div className="chat-welcome">
          <div className="chat-welcome-title phosphor-glow">Stakeholder Agents</div>
          <div className="chat-welcome-subtitle">
            Create AI agents with unique personalities to analyze DAO proposals from different perspectives
          </div>
          <button className="agent-deploy-btn" onClick={() => setCreating(true)}>
            Deploy Your First Agent
          </button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="agent-list-container">
      <div className="agent-list-header">
        <h2 className="agent-list-title">Your Agents</h2>
        <button className="terminal-btn" onClick={() => setCreating(true)}>
          + Create New Agent
        </button>
      </div>
      <div className="agent-list-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onDelete={() => deleteAgent(agent.id)} />
        ))}
      </div>
    </div>
  );
}
