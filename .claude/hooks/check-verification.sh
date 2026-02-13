#!/bin/bash
# UserPromptSubmit hook: detect on-chain verification keywords and inject reminder
#
# Reads the hook input from stdin (JSON with "prompt" field).
# If token/DEX keywords are found, outputs plain text context to remind
# the agent to use verification tools before answering.

set -euo pipefail

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))" 2>/dev/null || echo "")

# Convert to lowercase for matching
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# Keywords that suggest on-chain verification is needed (includes Korean equivalents for i18n)
KEYWORDS="trade|swap|uniswap|sushiswap|transferfrom|dex|exchange|compatible|tradeable|tradable"

if echo "$PROMPT_LOWER" | grep -qiE "$KEYWORDS"; then
  # Plain text stdout is injected as additionalContext by Claude Code
  echo "⚠️ MANDATORY VERIFICATION REQUIRED: This question is about on-chain behavior. You MUST call test_token_transfer or run_fork_test MCP tools BEFORE writing any answer. Speculation is FORBIDDEN. Do NOT answer based on code reading alone — run the verification tools first, then answer based on their results only."
fi
