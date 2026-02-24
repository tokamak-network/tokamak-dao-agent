/**
 * LLM Provider Abstraction
 *
 * Supports Anthropic and OpenAI with a unified streaming interface.
 * Provider is auto-detected from environment variables.
 */

import type { LLMProvider, LLMStreamEvent } from "../types/index.js";

// ─── Anthropic Provider ──────────────────────────────────────

class AnthropicProvider implements LLMProvider {
  private client: any;

  constructor(apiKey: string) {
    // Dynamic import to avoid hard dependency
    const Anthropic = require("@anthropic-ai/sdk").default;
    this.client = new Anthropic({ apiKey });
  }

  async *createStream(params: {
    model: string;
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    maxTokens: number;
  }): AsyncIterable<LLMStreamEvent> {
    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        yield { type: "text_delta", text: event.delta.text };
      }
    }

    yield { type: "done" };
  }
}

// ─── OpenAI Provider ─────────────────────────────────────────

class OpenAIProvider implements LLMProvider {
  private client: any;

  constructor(apiKey: string, baseUrl?: string) {
    const OpenAI = require("openai").default;
    this.client = new OpenAI({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });
  }

  async *createStream(params: {
    model: string;
    system: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    maxTokens: number;
  }): AsyncIterable<LLMStreamEvent> {
    const messages = [
      { role: "system" as const, content: params.system },
      ...params.messages,
    ];

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      max_tokens: params.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        yield { type: "text_delta", text: delta.content };
      }
    }

    yield { type: "done" };
  }
}

// ─── Provider Detection ──────────────────────────────────────

interface ProviderConfig {
  provider: LLMProvider;
  model: string;
}

let _cached: ProviderConfig | null = null;

export function getLLMProvider(): ProviderConfig {
  if (_cached) return _cached;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const model = process.env.GOVLENS_MODEL ?? process.env.QOC_MODEL;

  if (anthropicKey) {
    _cached = {
      provider: new AnthropicProvider(anthropicKey),
      model: model ?? "claude-sonnet-4-20250514",
    };
  } else if (openaiKey) {
    _cached = {
      provider: new OpenAIProvider(openaiKey, process.env.OPENAI_BASE_URL),
      model: model ?? "gpt-4o",
    };
  } else {
    throw new Error(
      "No LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
    );
  }

  return _cached;
}

/**
 * Reset cached provider (for testing).
 */
export function resetProvider(): void {
  _cached = null;
}
