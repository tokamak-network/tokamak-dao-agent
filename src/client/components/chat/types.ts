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
