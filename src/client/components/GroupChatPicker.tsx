import { useState } from "react";
import type { ElizaAgent } from "../contexts/ElizaOSContext";

interface GroupChatPickerProps {
  agents: ElizaAgent[];
  onStart: (agentIds: string[], name: string) => void;
  onCancel: () => void;
}

export function GroupChatPicker({ agents, onStart, onCancel }: GroupChatPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const activeAgents = agents.filter((a) => a.status === "active");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    const ids = Array.from(selected);
    const names = activeAgents
      .filter((a) => selected.has(a.id))
      .map((a) => a.name)
      .join(", ");
    onStart(ids, `Discussion: ${names}`);
  };

  return (
    <div className="group-chat-picker-overlay" onClick={onCancel}>
      <div className="group-chat-picker" onClick={(e) => e.stopPropagation()}>
        <h3 className="group-chat-picker-title">Start Group Chat</h3>
        <p className="group-chat-picker-desc">
          Select 2 or more active agents for a governance discussion.
        </p>

        <div className="group-chat-picker-list">
          {activeAgents.length === 0 && (
            <div className="agent-chat-status">No active agents available.</div>
          )}
          {activeAgents.map((agent) => (
            <label key={agent.id} className="group-chat-picker-item">
              <input
                type="checkbox"
                checked={selected.has(agent.id)}
                onChange={() => toggle(agent.id)}
              />
              <span className="group-chat-picker-name">{agent.name}</span>
            </label>
          ))}
        </div>

        <div className="group-chat-picker-actions">
          <button className="terminal-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="agent-deploy-btn"
            disabled={selected.size < 2}
            onClick={handleStart}
          >
            Start Chat ({selected.size} selected)
          </button>
        </div>
      </div>
    </div>
  );
}
