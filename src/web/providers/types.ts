/**
 * Provider-agnostic types for multi-model chat support.
 *
 * These types decouple the agentic loop in server.ts from any specific
 * AI SDK, allowing Anthropic, OpenAI, and compatible providers to share
 * the same streaming and tool-execution pipeline.
 */

/** JSON-Schema-based tool definition (matches Anthropic's native format). */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

/** Role-tagged message flowing through the agentic loop. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

/** Union of content block types that appear inside messages. */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, any> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

/** A tool call extracted from the streamed response. */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

/** Normalised streaming events emitted by every provider adapter. */
export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; id: string; name: string }
  | { type: "input_json_delta"; partial_json: string }
  | { type: "tool_use_end" }
  | { type: "message_end"; stop_reason: string | null };

/** The contract every provider adapter must satisfy. */
export interface ChatProvider {
  /** The provider name (e.g. "anthropic", "openai"). */
  name: string;

  /**
   * Create a streaming response and yield normalised events.
   *
   * The provider is responsible for mapping its native SDK events to
   * the common StreamEvent union so the agentic loop stays provider-agnostic.
   */
  createStream(params: {
    model: string;
    system: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
    maxTokens: number;
  }): AsyncIterable<StreamEvent>;

  /**
   * Build tool-result messages in the format expected by this provider.
   *
   * Anthropic bundles all results in a single user message, while OpenAI
   * requires one "tool" message per result — the adapter hides this.
   */
  buildToolResultsMessage(
    results: { tool_use_id: string; content: string; is_error?: boolean }[],
  ): ChatMessage[];
}
