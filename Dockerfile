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

# Baked into the image config — the canonical, build-tool-independent signal GHCR
# reads to connect the published package to this repo. Evaluated at package
# creation, so it links freshly-created packages without relying on buildx
# annotation levels.
LABEL org.opencontainers.image.source="https://github.com/offendingcommit/openconcho"

COPY --chown=101:101 --from=builder /app/packages/web/dist /usr/share/nginx/html
# Rendered to /etc/nginx/conf.d/default.conf by the image's envsubst entrypoint.
COPY --chown=101:101 docker/nginx.conf.template /etc/nginx/templates/default.conf.template
# Writes /usr/share/nginx/html/config.js from OPENCONCHO_DEFAULT_HONCHO_URL.
# --chmod=0755 so nginx's docker-entrypoint.d actually executes it.
COPY --chown=101:101 --chmod=0755 docker/40-openconcho-config.sh /docker-entrypoint.d/40-openconcho-config.sh

# Defaults target the Honcho service in a typical Compose stack; override per deploy.
ENV HONCHO_UPSTREAM=http://api:8000 \
    OPENCONCHO_DEFAULT_HONCHO_URL=same-origin

EXPOSE 8080

# Base image entrypoint renders the template + runs config script, then nginx (UID 101).
