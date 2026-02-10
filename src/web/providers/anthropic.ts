/**
 * Anthropic provider adapter.
 *
 * Wraps the @anthropic-ai/sdk streaming API and normalises its SSE events
 * into the common StreamEvent format consumed by the agentic loop.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatProvider,
  ChatMessage,
  ContentBlock,
  StreamEvent,
  ToolDefinition,
} from "./types.ts";

export class AnthropicProvider implements ChatProvider {
  name = "anthropic" as const;
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async *createStream(params: {
    model: string;
    system: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
    maxTokens: number;
  }): AsyncIterable<StreamEvent> {
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      tools: params.tools as any,
      messages: params.messages as Anthropic.MessageParam[],
      stream: true,
    });

    for await (const event of response) {
      switch (event.type) {
        case "content_block_start":
          if (event.content_block.type === "text") {
            // Text block starts — no event needed, deltas follow.
          } else if (event.content_block.type === "tool_use") {
            yield {
              type: "tool_use_start",
              id: event.content_block.id,
              name: event.content_block.name,
            };
          }
          break;

        case "content_block_delta":
          if (event.delta.type === "text_delta") {
            yield { type: "text_delta", text: event.delta.text };
          } else if (event.delta.type === "input_json_delta") {
            yield {
              type: "input_json_delta",
              partial_json: event.delta.partial_json,
            };
          }
          break;

        case "content_block_stop":
          // The agentic loop tracks whether we're inside a tool block,
          // so a generic "end" signal suffices.
          yield { type: "tool_use_end" };
          break;

        case "message_delta":
          yield {
            type: "message_end",
            stop_reason: "stop_reason" in event.delta
              ? (event.delta as any).stop_reason
              : null,
          };
          break;
      }
    }
  }

  buildToolResultsMessage(
    results: { tool_use_id: string; content: string; is_error?: boolean }[],
  ): ChatMessage[] {
    // Anthropic bundles all tool results in a single "user" message.
    const blocks: ContentBlock[] = results.map((r) => ({
      type: "tool_result" as const,
      tool_use_id: r.tool_use_id,
      content: r.content,
      ...(r.is_error ? { is_error: true } : {}),
    }));
    return [{ role: "user", content: blocks }];
  }
}
