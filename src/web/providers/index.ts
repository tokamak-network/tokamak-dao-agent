/**
 * Provider detection and lazy instantiation.
 *
 * Model names are auto-detected by prefix (claude -> anthropic, gpt/o1/o3/o4 -> openai).
 * Explicit prefix overrides are supported: "openai:model-name", "anthropic:model-name".
 */

import type { ChatProvider } from "./types.ts";

export type ProviderName = "anthropic" | "openai";

export interface ModelConfig {
  provider: ProviderName;
  model: string; // model name with prefix stripped
}

/**
 * Detect the provider from a model string.
 *
 * Examples:
 *   "claude-sonnet-4-5-20250929" → { provider: "anthropic", model: "claude-sonnet-4-5-20250929" }
 *   "gpt-4o"                     → { provider: "openai",    model: "gpt-4o" }
 *   "openai:gpt-4o-mini"         → { provider: "openai",    model: "gpt-4o-mini" }
 *   "anthropic:claude-opus"      → { provider: "anthropic",  model: "claude-opus" }
 *   "unknown-model"              → { provider: "anthropic",  model: "unknown-model" } (fallback)
 */
export function detectProvider(model: string): ModelConfig {
  // Explicit prefix
  const prefixMatch = model.match(/^(anthropic|openai):(.+)$/);
  if (prefixMatch) {
    return { provider: prefixMatch[1] as ProviderName, model: prefixMatch[2]! };
  }

  // Auto-detect by model name
  if (/^claude/i.test(model)) return { provider: "anthropic", model };
  if (/^(gpt|o1|o3|o4|chatgpt)/i.test(model)) return { provider: "openai", model };

  // Default to openai (LiteLLM-compatible) for non-Claude models
  return { provider: "openai", model };
}

/** Cache of instantiated providers (one per provider name). */
const providerCache = new Map<ProviderName, Promise<ChatProvider>>();

/**
 * Get or create a provider instance (cached).
 * Uses dynamic import() so the unused SDK is never loaded.
 */
export function getOrCreateProvider(name: ProviderName): Promise<ChatProvider> {
  let cached = providerCache.get(name);
  if (!cached) {
    cached = createProviderImpl(name);
    providerCache.set(name, cached);
  }
  return cached;
}

/** @deprecated Use getOrCreateProvider for cached access. */
export async function createProvider(name: ProviderName): Promise<ChatProvider> {
  return getOrCreateProvider(name);
}

async function createProviderImpl(name: ProviderName): Promise<ChatProvider> {
  switch (name) {
    case "anthropic": {
      const { AnthropicProvider } = await import("./anthropic.ts");
      return new AnthropicProvider();
    }
    case "openai": {
      const { OpenAIProvider } = await import("./openai.ts");
      return new OpenAIProvider();
    }
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
