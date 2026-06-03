# Single source of truth for repo commands. CI calls these targets too,
# so anything that works in `make` locally works in `make` on a runner.
# Targets delegate to pnpm scripts, which delegate to turborepo.

.PHONY: bootstrap dev dev-web dev-desktop \
        build test test-e2e lint lint-fix typecheck check \
        ci-web ci-desktop smoke-docker \
        up prod down clean install help

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

up: ## Run the web container from source (dev profile, builds) at :8080
	docker compose --profile dev up -d --build

prod: ## Run the web container from the published image (prod profile, pulls latest)
	docker compose --profile prod up -d

down: ## Stop + remove the web container (either profile)
	docker compose --profile dev --profile prod down --remove-orphans

clean: down ## down + remove the locally built image
	-docker image rm openconcho-web:local

install: ## pnpm install (no playwright)
	pnpm install
