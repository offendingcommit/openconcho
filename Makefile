# Single source of truth for repo commands. CI calls these targets too,
# so anything that works in `make` locally works in `make` on a runner.
# Targets delegate to pnpm scripts, which delegate to turborepo.

.PHONY: bootstrap dev dev-web dev-desktop \
        build test test-e2e lint lint-fix typecheck check \
        ci-web ci-desktop smoke-docker \
        compose-up compose-up-prod compose-down install help

help:
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

bootstrap: ## Install deps + Playwright Chromium (run once after clone)
	pnpm bootstrap

dev: dev-desktop ## Alias for `dev-desktop`

dev-web: ## Vite dev server at http://localhost:5173
	pnpm dev:web

dev-desktop: ## Tauri desktop app
	pnpm dev:desktop

build: ## Turbo: build all packages
	pnpm build

test: ## Vitest (unit + integration)
	pnpm test

test-e2e: ## Playwright e2e (requires bootstrap)
	pnpm test:e2e

lint: ## Biome lint check
	pnpm lint

lint-fix: ## Biome lint + format auto-fix
	pnpm lint:fix

typecheck: ## tsc --noEmit across packages
	pnpm typecheck

check: ## lint + typecheck + test
	pnpm check

ci-web: ## CI: lint + typecheck + test + build for @openconcho/web
	pnpm ci:web

ci-desktop: ## CI: cargo-check for @openconcho/desktop
	pnpm ci:desktop

smoke-docker: ## Local: build the image + smoke-test the /api proxy (Docker required)
	bash docker/smoke-test.sh

compose-up: ## Run the web container from source (builds; dev-forward) at :8080
	docker compose up -d --build

compose-up-prod: ## Run the web container from the published image (pulls latest)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

compose-down: ## Stop and remove the web container
	docker compose down --remove-orphans

install: ## pnpm install (no playwright)
	pnpm install
