# Stage 1: Build Vite client
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY index.html vite.config.ts tsconfig.json ./
COPY src/client/ src/client/
RUN bun run build

# Stage 2: Runtime
FROM oven/bun:1
WORKDIR /app

# Install Foundry for fork testing
RUN apt-get update && apt-get install -y curl git && rm -rf /var/lib/apt/lists/*
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:$PATH"
RUN foundryup

# Install production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Application source
COPY src/ src/
COPY tsconfig.json ./

# Contract data (sources, ABIs, tests, libraries)
COPY contracts/src/ contracts/src/
COPY contracts/out/ contracts/out/
COPY contracts/test/ contracts/test/
COPY contracts/lib/ contracts/lib/
COPY contracts/foundry.toml contracts/foundry.toml

# On-chain data (contract registry, storage layouts)
COPY scripts/mainnet/contracts.json scripts/mainnet/contracts.json
COPY scripts/storage/ scripts/storage/

# SQLite data directory (mounted as volume in fly.toml)
RUN mkdir -p /data

# Built client from stage 1
COPY --from=build /app/dist/ dist/

# Entrypoint script (runs MCP SSE + web server)
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3333 3001

CMD ["./entrypoint.sh"]
