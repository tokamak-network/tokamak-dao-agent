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
export const MAX_TOOL_ROUNDS = 50;
export const MAX_TOOL_RESULT_CHARS = 12_000;
export const MAX_TOOL_RESULT_DISPLAY_CHARS = 8_000;
export const CHAT_MAX_TOKENS = 16_384;
export const DEFAULT_CHAT_MODEL = "claude-sonnet-4-5-20250929";
