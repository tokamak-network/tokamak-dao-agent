FROM node:23-slim

WORKDIR /app

# Install bun
RUN npm install -g bun

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Character definitions and custom plugins
COPY characters/ characters/
COPY plugins/ plugins/

# Entrypoint (patches MCP URL in character files at runtime)
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# ElizaOS data directory (mounted as volume in fly.toml)
RUN mkdir -p /app/.eliza

EXPOSE 3000

CMD ["./entrypoint.sh"]
