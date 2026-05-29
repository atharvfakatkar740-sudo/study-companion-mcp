# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data ./src/data

# Data directory for persistence (mount as volume)
RUN mkdir -p /app/data

ENV NODE_ENV=production

LABEL org.opencontainers.image.source="https://github.com/afakatkar/study-companion-mcp"
LABEL org.opencontainers.image.description="AI-powered study companion MCP server with local LLM, vector DB, and calendar sync"
LABEL org.opencontainers.image.licenses="MIT"

# MCP servers communicate over stdio
ENTRYPOINT ["node", "dist/index.js"]
