import { useState, useRef, useEffect } from "react";
import type { ChatTarget } from "./chat/types";
import { useElizaChat } from "./chat/useElizaChat";
import { AgentChatBubble } from "./chat/AgentChatBubble";

interface AgentChatPanelProps {
  target: ChatTarget;
  agentColors?: Record<string, string>;
  onClose: () => void;
}

export function AgentChatPanel({ target, agentColors, onClose }: AgentChatPanelProps) {
  const { messages, sendMessage, isLoading, isConnecting, error } = useElizaChat(target);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus();
  }, [target]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const title = target.type === "dm"
    ? target.agentName ?? "Agent Chat"
    : "Group Discussion";

  const accentColor = target.accentColor ?? "var(--term-accent)";

  return (
    <div className="agent-chat-panel">
      {/* Header */}
      <div className="agent-chat-header">
        <div className="agent-chat-header-info">
          <span className="status-dot status-connected" style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
          <span className="agent-chat-header-name">{title}</span>
          <span className="agent-dash-badge stakeholder">
            {target.type === "dm" ? "DM" : "GROUP"}
          </span>
        </div>
        <button className="agent-chat-close" onClick={onClose} title="Close chat">
          &times;
        </button>
      </div>

      {/* Messages area */}
      <div className="agent-chat-messages">
        {isConnecting && (
          <div className="agent-chat-status">Connecting to ElizaOS...</div>
        )}
        {error && (
          <div className="agent-chat-status error">{error}</div>
        )}
        {!isConnecting && !error && messages.length === 0 && (
          <div className="agent-chat-status">
            Send a message to start the conversation.
          </div>
        )}
        {messages.map((m) => (
          <AgentChatBubble key={m.id} message={m} agentColors={agentColors} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="agent-chat-input-area">
        <div className="agent-chat-input-box">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnecting ? "Connecting..." : "Type a message..."}
            disabled={isConnecting || !!error}
            rows={1}
            className="chat-input-textarea"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || isConnecting || !input.trim()}
            className="chat-send-btn"
            title="Send (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
