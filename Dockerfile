FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git libicu-dev libxml2 postgresql-client \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/ packages/
COPY server/package.json server/
COPY ui/package.json ui/
COPY cli/package.json cli/

# Force hoisting to fix ERR_MODULE_NOT_FOUND (zod) in internal plugin resolutions
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm build
RUN test -f server/dist/index.js || (echo "ERROR: server build output missing" && exit 1)

FROM base AS production
WORKDIR /app

# Ensure non-root node user can manage global installs and local volume
RUN mkdir -p /paperclip && chown -R node:node /paperclip && \
    mkdir -p /usr/local/lib/node_modules && chown -R node:node /usr/local/lib/node_modules && \
    mkdir -p /usr/local/bin && chown -R node:node /usr/local/bin

# Copy the whole workspace
COPY --chown=node:node --from=build /app /app

USER node

# Split global installs to prevent timeout/network issues and improve caching
RUN npm install --global --omit=dev @google/gemini-cli || true
RUN npm install --global --omit=dev @anthropic-ai/claude-code@latest || true
RUN npm install --global --omit=dev @openai/codex@latest || true
RUN npm install --global --omit=dev opencode-ai || true

RUN mkdir -p /paperclip/instances/default/logs

ENV NODE_ENV=production \
  HOME=/paperclip \
  HOST=0.0.0.0 \
  PORT=3100 \
  SERVE_UI=true \
  PAPERCLIP_HOME=/paperclip \
  PAPERCLIP_INSTANCE_ID=default \
  PAPERCLIP_CONFIG=/paperclip/instances/default/config.json \
  PAPERCLIP_DEPLOYMENT_MODE=local_trusted \
  PAPERCLIP_DEPLOYMENT_EXPOSURE=private

EXPOSE 3100
VOLUME ["/paperclip"]

# Use tsx loader in order to resolve workspace source paths in development or when symlinked
CMD ["node", "--import", "/app/server/node_modules/tsx/dist/loader.mjs", "/app/server/dist/index.js"]
