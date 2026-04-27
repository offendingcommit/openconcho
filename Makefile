.PHONY: dev build test lint lint-fix typecheck install

dev:
	pnpm --filter @openconcho/desktop dev

build:
	pnpm turbo run build

test:
	pnpm turbo run test

lint:
	pnpm turbo run lint

lint-fix:
	pnpm exec biome check --write packages/web/src/

typecheck:
	pnpm turbo run typecheck

install:
	pnpm install
