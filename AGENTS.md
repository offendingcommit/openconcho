# openconcho

Frontend UI for self-hosted Honcho instances — browse memories, peers, sessions, conclusions, and chat with memory context. Ships as a web app (`@openconcho/web`) and a Tauri desktop wrapper (`@openconcho/desktop`).

## Commands

`make` is the canonical interface; it shells out to pnpm scripts which shell out to turborepo. CI calls the same targets — `make help` lists everything.

| Command | Purpose |
|---------|---------|
| `make bootstrap` | Install deps + Playwright Chromium (run once after clone) |
| `make dev-web` | Vite dev server on http://localhost:5173 |
| `make dev-desktop` (or `make dev`) | Tauri desktop app |
| `make build` | Turbo: build web + desktop |
| `make lint` | Biome check |
| `make typecheck` | tsc --noEmit |
| `make test` | Vitest (unit + integration), excludes `e2e/` |
| `make test-e2e` | Playwright e2e (uncached) |
| `make check` | lint + typecheck + test |
| `pnpm --filter @openconcho/desktop cargo-check` | Local Rust/Tauri compile check before pushing desktop changes |
| `pnpm --filter @openconcho/web generate:api` | Regen `src/api/schema.d.ts` from `openapi.json` |

## Structure

| Path | Purpose |
|------|---------|
| `packages/web/` | Vite + React 19 + TanStack Router/Query SPA |
| `packages/web/src/routes/` | TanStack Router file-based routes (flat-route syntax) |
| `packages/web/src/components/` | Feature components grouped by domain |
| `packages/web/src/api/` | openapi-fetch client + TanStack Query hooks |
| `packages/web/src/lib/` | Config (localStorage) + theme utilities |
| `packages/web/src/hooks/` | Custom React hooks |
| `packages/web/src/test/` | Vitest unit/integration tests + setup |
| `packages/web/e2e/` | Playwright e2e specs |
| `packages/desktop/` | Tauri shell that bundles the built web app |
| `.claude/rules/` | Coding conventions (auto-loaded; stack-agnostic, applies to all agents) |
| `docs/` | Architecture and references |

## Code Style

Read `.claude/rules/coding-standards.md` when writing or reviewing any code file.

## Workflows

Read `.claude/rules/workflows.md` for recurring task patterns.

## Architecture

Read `docs/architecture.md` for component overview, data flow, and design decisions.

## CI policy

- PR CI only runs the web checks.
- Rust/Tauri compile-check is local-only for now because the Linux dependency setup on GitHub Actions is too slow for routine PR validation.

## Required local preflight

Before pushing any change under `packages/desktop/**` or `packages/desktop/src-tauri/**`, run:

- `pnpm --filter @openconcho/desktop cargo-check`

`make ci-web` matches current PR CI.

## Key Constraints

- **No hardcoded URLs** — connection config lives in `localStorage` under `openconcho:instances` (multi-instance store; legacy `openconcho:config` is auto-migrated)
- **Web CORS via a same-origin `/api` proxy** — the web build issues all Honcho calls to `/api/*` with an `X-Honcho-Upstream` header (the active instance's URL); nginx (docker) and a Vite middleware (dev) forward server-side. Transport is resolved by `dispatchFor` in `src/lib/dispatch.ts`: web → relative `/api` + header; Tauri → absolute URL + reqwest. Optional `OPENCONCHO_UPSTREAM_ALLOWLIST` guards the proxy when exposed.
- **Local git hooks** — `.husky/pre-commit` runs a secret scan + Biome on staged files; `.husky/pre-push` runs `pnpm check`. Your commits and pushes trigger these.
- **TanStack Router flat-route params** — always cast `params` as `as never` at `navigate()` and `<Link>` callsites
- **`framer-motion` Variants typing** — import `type Variants` and annotate objects; never use `as const` on variant objects
- **Auth is optional** — token header only sent when non-empty; `checkConnection()` detects if auth is required
- **CSS variables only** — no Tailwind color utilities for theme-aware colors; use `var(--text-1)` etc.
- **Shared deps via pnpm catalog** — version-pinned in `pnpm-workspace.yaml`; reference as `"catalog:"` in package.json
- **Conventional commits enforced** — commitlint runs in husky `commit-msg`; body lines must be ≤100 chars
- **Releases via semantic-release** — `.releaserc.json`; commits land on `main`, no manual version bumps
- **GitHub account** — push under `offendingcommit` (`gh auth switch` if needed)
- **Desktop preflight is local** — Rust/Tauri compile-check no longer runs in PR CI; run `pnpm --filter @openconcho/desktop cargo-check` before pushing any `packages/desktop/**` or `packages/desktop/src-tauri/**` change
