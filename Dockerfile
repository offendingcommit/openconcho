# OpenConcho web SPA — self-hosted Honcho dashboard.
#
# Multi-stage build:
#   1. node:22-alpine + pnpm builds the @openconcho/web SPA to packages/web/dist
#   2. nginx-unprivileged serves the static bundle as non-root (UID 101) on
#      port 8080 — runs cleanly under read-only filesystem + cap_drop ALL.

# ---------- Builder stage ----------
FROM node:22-alpine AS builder

RUN corepack enable \
 && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# Copy workspace/lockfile/manifests first for layer-cache efficiency.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc .pnpmfile.cjs ./
COPY packages/web/package.json packages/web/
COPY packages/desktop/package.json packages/desktop/

# Install only the web filter's transitive deps (skips the Tauri Rust toolchain).
RUN pnpm install --frozen-lockfile --filter @openconcho/web...

# Copy remaining sources + build.
COPY . .
RUN pnpm --filter @openconcho/web build

# ---------- Runtime stage ----------
# Unprivileged variant runs as UID 101 with no root setup steps, so it works
# under a read-only filesystem with cap_drop ALL.
FROM nginxinc/nginx-unprivileged:alpine

COPY --chown=101:101 --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY --chown=101:101 docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Base image CMD runs nginx in the foreground as UID 101.
