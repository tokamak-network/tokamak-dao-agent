#!/bin/sh
set -e

# Replace MCP SSE URL in character files if ELIZAOS_MCP_URL is set
if [ -n "$ELIZAOS_MCP_URL" ]; then
  echo "Patching character files with MCP URL: $ELIZAOS_MCP_URL"
  for f in characters/*.json; do
    sed -i "s|http://localhost:3001/sse|$ELIZAOS_MCP_URL|g" "$f"
  done
fi

echo "Starting ElizaOS..."
exec bunx elizaos start \
  --character characters/ton-holder-progressive.json \
  --character characters/l2-operator-conservative.json \
  --character characters/validator-defensive.json \
  --character characters/foundation-aggressive.json
