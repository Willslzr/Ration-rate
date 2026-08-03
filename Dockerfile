# syntax=docker/dockerfile:1.7

# Playwright/Chromium note (see section 2 justification below the runner stage):
# this image does NOT install Chromium's OS dependencies. Every active target
# in packages/api/src/targets.config.ts is 'html' (Cheerio, no browser
# needed) — none currently need JS execution to expose their rate.
# Installing Chromium's dependencies would add ~300+MB for a code path that
# no active target uses. If a real 'spa' target is ever activated, add before
# the runner's final layers:
#   RUN pnpm --filter @ratio/api exec playwright install --with-deps chromium

# Two Node versions on purpose: the toolchain stages need pnpm (pinned to
# pnpm@11 via packageManager), which requires Node >=22.13 (it uses the
# node:sqlite builtin internally, only available from Node 22.5+/stable in
# 22.13+). The shipped app itself only needs Node >=20 (this project's
# engines.node) and the runner stage never invokes pnpm — it runs the Prisma
# CLI's JS bundle and our compiled app directly via plain `node` — so the
# final runtime image still targets node:20-slim as specified.
ARG BUILD_NODE_VERSION=22-slim
ARG RUNTIME_NODE_VERSION=20-slim

FROM node:${BUILD_NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# openssl is required by Prisma's schema/migrate engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# ---- deps: resolve the pnpm store from the lockfile alone, so this layer is ----
# ---- cached across builds until pnpm-lock.yaml itself changes.              ----
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm fetch

# ---- build: install from the fetched store, generate the PostgreSQL-targeted ----
# ---- Prisma client, and compile core + api.                                  ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile
RUN pnpm --filter @ratio/api exec prisma generate --config=prisma.postgresql.config.ts
RUN pnpm --filter @ratio/core run build
RUN pnpm --filter @ratio/api run build

# Not pruning devDependencies here on purpose: `pnpm prune --prod` operates
# relative to the root package.json, which has no "dependencies" of its own
# (only devDependencies), so it deletes the entire shared .pnpm store instead
# of just the workspace's devDependencies — breaking every package's symlinks.
# `pnpm deploy` (the tool actually meant for this) re-triggers a native
# module install for better-sqlite3, which fails here without network access
# to prebuild-install's binary host or a C++ toolchain for a source build.
# Shipping devDependencies costs some image size but is simple and correct.

# ---- runner: production artifacts only, non-root user, HEALTHCHECK. ----
FROM node:${RUNTIME_NODE_VERSION} AS runner
ENV NODE_ENV=production
WORKDIR /app

# openssl is required by Prisma's schema engine, used here for `migrate deploy`
# at container startup (see docker-entrypoint.sh).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/core/package.json ./packages/core/package.json
COPY --from=build --chown=node:node /app/packages/core/dist ./packages/core/dist
COPY --from=build --chown=node:node /app/packages/api/package.json ./packages/api/package.json
COPY --from=build --chown=node:node /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=build --chown=node:node /app/packages/api/dist ./packages/api/dist
COPY --from=build --chown=node:node /app/packages/api/prisma ./packages/api/prisma
COPY --from=build --chown=node:node /app/packages/api/prisma.postgresql.config.ts ./packages/api/prisma.postgresql.config.ts
COPY --chown=node:node docker-entrypoint.sh ./

EXPOSE 3000
USER node

# node:20-slim has no curl/wget; Node's own native fetch avoids installing one.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
