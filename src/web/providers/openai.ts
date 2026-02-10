/**
 * OpenAI provider adapter.
 *
 * Wraps the openai SDK streaming API and normalises its delta chunks
 * into the common StreamEvent format consumed by the agentic loop.
 *
 * Also handles message format conversion:
 *  - system prompt → { role: "system" } message
 *  - tool definitions: input_schema → parameters (function calling format)
 *  - assistant tool_calls / tool results → OpenAI message shapes
 */

import type {
  ChatProvider,
  ChatMessage,
  ContentBlock,
  StreamEvent,
  ToolDefinition,
} from "./types.ts";

export class OpenAIProvider implements ChatProvider {
  name = "openai" as const;
  private client: any; // OpenAI instance — typed as any to avoid import-time crash if not installed

  constructor() {
    // Dynamic require so we fail with a clear message if openai is not installed.
    try {
      const { default: OpenAI } = require("openai");
      this.client = new OpenAI();
    } catch {
      throw new Error(
        'OpenAI SDK not installed. Run "bun add openai" to use OpenAI models.',
      );
    }
  }

  async *createStream(params: {
    model: string;
    system: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
    maxTokens: number;
  }): AsyncIterable<StreamEvent> {
    const openaiMessages: any[] = [
      { role: "system", content: params.system },
      ...params.messages.map(toOpenAIMessage),
    ];

    const openaiTools = params.tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const stream = await this.client.chat.completions.create({
      model: params.model,
      max_tokens: params.maxTokens,
      messages: openaiMessages,
      tools: openaiTools,
      stream: true,
    });

    // Track in-flight tool calls by index (OpenAI streams them by index).
    const toolCalls = new Map<number, { id: string; name: string }>();

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;

      // Text content
      if (delta?.content) {
        yield { type: "text_delta", text: delta.content };
      }

      // Tool call chunks
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;

          // First chunk for this tool call — emit start
          if (tc.id && tc.function?.name) {
            toolCalls.set(idx, { id: tc.id, name: tc.function.name });
            yield { type: "tool_use_start", id: tc.id, name: tc.function.name };
          }

          // Argument fragments
          if (tc.function?.arguments) {
            yield {
              type: "input_json_delta",
              partial_json: tc.function.arguments,
            };
          }
        }
      }

      // Finish reason
      if (choice.finish_reason) {
        // Emit tool_use_end for each tracked tool call
        for (const [idx] of toolCalls) {
          yield { type: "tool_use_end" };
        }
        toolCalls.clear();

        yield {
          type: "message_end",
          stop_reason:
            choice.finish_reason === "tool_calls" ? "tool_use" : choice.finish_reason,
        };
      }
    }
  }

  buildToolResultsMessage(
    results: { tool_use_id: string; content: string; is_error?: boolean }[],
  ): ChatMessage[] {
    // OpenAI requires one { role: "tool" } message per tool result.
    // We wrap each in a ChatMessage with a single tool_result block so the
    // agentic loop can treat them uniformly; toOpenAIMessage() unwraps them
    // when building the next API call.
    return results.map((r) => ({
      role: "user" as const,
      content: [
        {
          type: "tool_result" as const,
          tool_use_id: r.tool_use_id,
          content: r.content,
          ...(r.is_error ? { is_error: true } : {}),
        },
      ],
    }));
  }
}

// ── Message format conversion ─────────────────────────────────────────

/** Convert a provider-agnostic ChatMessage to OpenAI's message format. */
function toOpenAIMessage(msg: ChatMessage): any {
  // Simple text message
  if (typeof msg.content === "string") {
    return { role: msg.role, content: msg.content };
  }

  const blocks = msg.content as ContentBlock[];

  // Assistant message with tool_use blocks → OpenAI tool_calls
  if (msg.role === "assistant") {
    const textParts = blocks.filter((b) => b.type === "text");
    const toolParts = blocks.filter((b) => b.type === "tool_use");

    const result: any = { role: "assistant" };
    result.content = textParts.length
      ? textParts.map((b: any) => b.text).join("")
      : null;

    if (toolParts.length) {
      result.tool_calls = toolParts.map((b: any) => ({
        id: b.id,
        type: "function",
        function: {
          name: b.name,
          arguments: JSON.stringify(b.input),
        },
      }));
    }
    return result;
  }

  // User message with tool_result blocks → OpenAI { role: "tool" } messages
  const toolResults = blocks.filter((b) => b.type === "tool_result");
  if (toolResults.length === 1) {
    const r = toolResults[0] as any;
    return {
      role: "tool",
      tool_call_id: r.tool_use_id,
      content: r.content,
    };
  }

  // Fallback: plain text concatenation
  return {
    role: msg.role,
    content: blocks
      .map((b: any) => b.text || b.content || "")
      .join(""),
  };
}
