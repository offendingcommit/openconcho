# Contributing to OpenConcho

Thanks for your interest in helping out. This is a small, focused project — please read this before opening a PR.

## Ground rules

- **Open an issue first** for anything beyond a small fix. Discussion saves wasted work.
- **Conventional commits** are required (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). They drive [semantic-release](https://semantic-release.gitbook.io/).
- **One logical change per PR.** Easier to review, easier to revert.

## Local setup

```bash
git clone https://github.com/offendingcommit/openconcho.git
cd openconcho
make bootstrap   # installs deps + Playwright Chromium
make dev-web     # web dev server at http://localhost:5173
```

Run `make help` to see every target. Make is the canonical interface — CI calls
the same targets, so anything that passes locally will pass in CI.

Node 24 is what CI runs (`.nvmrc`); pnpm version is pinned via the
`packageManager` field — `corepack enable` and it just works.

VS Code users: workspace recommends Biome, Tauri, rust-analyzer, Tailwind,
EditorConfig, and Playwright extensions on first open.

For desktop work:

```bash
make dev-desktop   # alias: make dev
```

Tauri needs system dependencies (WebKit, etc.) — see the
[Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS.

## Before opening a PR

```bash
make check        # lint + typecheck + unit/integration tests
make test-e2e     # Playwright (requires `make bootstrap` first)
make build        # full build
```

CI will block the merge otherwise.

## Coding standards

The full standards live in [`.claude/rules/coding-standards.md`](.claude/rules/coding-standards.md). The short version:

- TypeScript strict mode; no `any`.
- No hardcoded URLs — connection config lives in `localStorage` under `openconcho:config`.
- Use CSS variables (`var(--text-1)`) for theme-aware colors, never Tailwind color utilities.
- Cast TanStack Router `params` as `as never` at navigation callsites.
- One assertion per test.

## API schema changes

`src/api/schema.d.ts` is generated. Don't edit it by hand — run:

```bash
pnpm --filter @openconcho/web generate:api
```

…after updating `openapi.json`.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include the Honcho version, your OS, and reproduction steps.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
