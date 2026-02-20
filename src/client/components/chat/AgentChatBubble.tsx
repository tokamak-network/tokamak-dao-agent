import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ElizaMessage } from "./types";

const ENTITY_ID = "00000000-da0a-4000-8000-000000000001";

interface AgentChatBubbleProps {
  message: ElizaMessage;
  agentColors?: Record<string, string>;
}

export function AgentChatBubble({ message, agentColors }: AgentChatBubbleProps) {
  const isUser = message.senderId === ENTITY_ID;

  if (isUser) {
    return (
      <div className="chat-bubble-wrapper user">
        <div className="chat-bubble user">{message.content}</div>
        <div className="bubble-meta">
          <span className="bubble-timestamp">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    );
  }

  const color = agentColors?.[message.senderId] ?? "var(--term-accent)";

  return (
    <div className="chat-bubble-wrapper assistant">
      <span className="agent-bubble-sender" style={{ color }}>
        {message.senderName}
      </span>
      <div className="chat-bubble assistant">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      </div>
      <div className="bubble-meta">
        <span className="bubble-timestamp">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
