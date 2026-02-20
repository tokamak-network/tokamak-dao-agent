#!/bin/sh
set -e

echo "Starting MCP SSE server on port ${MCP_SSE_PORT:-3001}..."
bun run src/mcp/server-sse.ts &

echo "Starting web server on port ${PORT:-3333}..."
exec bun run src/web/server.ts
