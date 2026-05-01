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
pnpm install
pnpm dev   # web dev server at http://localhost:5173
```

For desktop work:

```bash
pnpm --filter @openconcho/desktop dev
```

## Before opening a PR

```bash
pnpm lint           # Biome lint
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest
pnpm build          # full build
```

All four must pass. CI will block the merge otherwise.

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
pnpm generate:api
```

…after updating `openapi.json`.

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). Include the Honcho version, your OS, and reproduction steps.

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
