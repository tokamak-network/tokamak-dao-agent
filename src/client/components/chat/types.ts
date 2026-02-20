export interface ToolCall {
  id?: string;
  name: string;
  result?: string;
  isError?: boolean;
  isRunning: boolean;
}

export interface MessagePart {
  type: "text" | "tool_call" | "thinking";
  content?: string;
  toolCall?: ToolCall;
}

export interface Message {
  role: "user" | "assistant";
  content: string; // plain text for user, used for API history
  parts: MessagePart[]; // structured parts for display
  timestamp: Date;
}

/* ── ElizaOS Chat types ─────────────────────────────────────────── */

export interface ElizaMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  channelId: string;
  createdAt: string;
}

export interface ChatTarget {
  type: "dm" | "group";
  agentId?: string;       // DM only
  agentIds?: string[];    // Group only
  agentName?: string;     // DM agent display name
  channelId?: string;     // resolved after setup
  accentColor?: string;
}
