/**
 * Centralized configuration constants shared across MCP tools and web server.
 */

// Contract source
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_SEARCH_MATCHES = 100;

// Fork test
export const FORK_TEST_TIMEOUT_MS = 120_000; // 2 minutes
export const FORK_TEST_MAX_OUTPUT = 3000;

// Web server
export const MAX_TOOL_ROUNDS = 250;
export const MAX_TOOL_RESULT_CHARS = 12_000;
export const MAX_TOOL_RESULT_DISPLAY_CHARS = 8_000;
export const CHAT_MAX_TOKENS = 16_384;
// Supports provider prefix: "openai:gpt-4o", "anthropic:claude-sonnet-4-5-20250929"
export const DEFAULT_CHAT_MODEL = "gpt-5.2";

// Forum summary
export const SUMMARY_MODEL = process.env.SUMMARY_MODEL || "gemini-3-flash";
export const SUMMARY_MAX_TOKENS = 2048;

// Forum agent opinions
export const OPINION_MODEL = process.env.OPINION_MODEL || "gemini-3-flash";
export const OPINION_MAX_TOKENS = 1024;

// Forum translation
export const TRANSLATE_MODEL = process.env.TRANSLATE_MODEL || "gemini-3-flash";
export const TRANSLATE_MAX_TOKENS = 4096;

// Mode-specific model overrides (used when no per-request model is specified)
export const MODE_MODELS: Record<string, string> = {
  chat: "gpt-5.2",
  analyze_proposal: "gpt-5.2-pro",
  make_proposal: "gpt-5.2",
};
