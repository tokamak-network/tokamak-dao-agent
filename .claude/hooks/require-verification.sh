#!/bin/bash
# Stop hook: block the agent from finishing if it didn't run verification tools
# when the user's prompt required on-chain verification.

INPUT=$(cat)

# Use a single python3 call to do all the logic — avoids stdin/variable issues
RESULT=$(HOOK_INPUT="$INPUT" python3 << 'PYEOF'
import json, re, sys, os

input_data = json.loads(os.environ.get("HOOK_INPUT", "{}"))

# 1. Prevent infinite loops
if input_data.get("stop_hook_active", False):
    print("allow")
    sys.exit(0)

# 2. Get transcript path
transcript_path = input_data.get("transcript_path", "")
if not transcript_path or not os.path.isfile(transcript_path):
    print("allow")
    sys.exit(0)

# 3. Read transcript
try:
    with open(transcript_path, "r") as f:
        content = f.read()
        lines = content.strip().split("\n")
except:
    print("allow")
    sys.exit(0)

# 4. Find the last user message
keywords = r"거래|스왑|가능|호환|trade|swap|uniswap|sushiswap|transferfrom|dex|거래소|교환|유니스왑|스시스왑|compatible|tradeable|tradable"
has_keywords = False

for line in reversed(lines):
    try:
        entry = json.loads(line)
        msg_type = entry.get("type", entry.get("role", ""))
        if msg_type in ("human", "user"):
            msg_content = entry.get("content", "")
            if isinstance(msg_content, list):
                msg_content = " ".join(
                    c.get("text", "") for c in msg_content if isinstance(c, dict)
                )
            if re.search(keywords, msg_content, re.IGNORECASE):
                has_keywords = True
            break
    except:
        continue

if not has_keywords:
    print("allow")
    sys.exit(0)

# 5. Check if verification tools were called anywhere in the transcript
verification_tools = ["verify_token_compatibility", "run_fork_test", "simulate_transaction"]
for tool in verification_tools:
    if tool in content:
        print("allow")
        sys.exit(0)

# 6. Verification was required but not performed
print("block")
PYEOF
)

if [ "$RESULT" = "block" ]; then
  echo "STOP BLOCKED: You answered a question about on-chain behavior (token trading, DEX compatibility, transaction success) WITHOUT calling verification tools. This is a violation of the #1 project rule. You MUST call verify_token_compatibility or run_fork_test MCP tools NOW, then answer based on the results. Do NOT speculate based on code reading or ERC-20 assumptions." >&2
  exit 2
fi

exit 0
