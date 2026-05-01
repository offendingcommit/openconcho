<div align="center">
  <img src="packages/web/public/favicon.svg" width="96" height="96" alt="OpenConcho" />
  <h1>OpenConcho</h1>
  <p>A fast, privacy-first desktop &amp; web UI for self-hosted <a href="https://github.com/plastic-labs/honcho">Honcho</a> instances.</p>

  <p>
    <a href="https://github.com/offendingcommit/openconcho/actions/workflows/ci.yml">
      <img src="https://github.com/offendingcommit/openconcho/actions/workflows/ci.yml/badge.svg?branch=main&event=push" alt="CI" />
    </a>
    <a href="https://github.com/offendingcommit/openconcho/releases/latest">
      <img src="https://img.shields.io/github/v/release/offendingcommit/openconcho?display_name=tag&sort=semver" alt="Latest release" />
    </a>
    <a href="https://github.com/offendingcommit/openconcho/releases">
      <img src="https://img.shields.io/github/downloads/offendingcommit/openconcho/total?color=blue" alt="Downloads" />
    </a>
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue" alt="Platforms" />
    <a href="LICENSE">
      <img src="https://img.shields.io/github/license/offendingcommit/openconcho?color=green" alt="License" />
    </a>
  </p>
</div>

---

Browse memories, peers, sessions, and conclusions — or chat with full memory context — directly against your own Honcho instance. All connection details stay in your browser; nothing leaves except requests to the URL you configure.

## Features

| | |
|---|---|
| **Dashboard** | Workspace count and queue status, auto-refreshes every 10 s |
| **Workspaces** | Paginated list with per-workspace navigation |
| **Peers** | Browse peers, view representations, context, and peer cards |
| **Sessions** | Paginated message history with summaries and context |
| **Conclusions** | Semantic search across conclusions with observer/subject display |
| **Webhooks** | Manage and trigger webhooks per workspace |
| **Chat** | Conversational interface through Honcho's chat endpoint with memory context |
| **Schedule Dream** | Trigger Honcho's dream/consolidation pass on demand |
| **Dark / light mode** | Persisted per device, instant toggle |
| **Optional auth** | Token field is optional; connection health check auto-detects auth requirement |

## Download

Pre-built binaries are attached to every [GitHub Release](https://github.com/offendingcommit/openconcho/releases/latest):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `OpenConcho_*_aarch64.dmg` |
| macOS (Intel) | `OpenConcho_*_x64.dmg` |
| Linux | `openconcho_*_amd64.deb` / `openconcho_*_amd64.AppImage` |
| Windows | `OpenConcho_*_x64-setup.exe` / `OpenConcho_*_x64_en-US.msi` |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9
- A running [Honcho](https://github.com/plastic-labs/honcho) instance (local or remote)

### Web app

```bash
git clone https://github.com/offendingcommit/openconcho.git
cd openconcho
pnpm install
pnpm dev
```

Open http://localhost:5173 and enter your Honcho URL when prompted.

### Desktop app (Tauri)

Additional prerequisites: [Rust](https://rustup.rs/) stable + [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
git clone https://github.com/offendingcommit/openconcho.git
cd openconcho
pnpm install
pnpm --filter @openconcho/desktop dev
```

### Connecting to your instance

1. Enter the base URL of your Honcho instance (e.g. `http://localhost:8000`)
2. Optionally enter an API token if your instance requires auth
3. Click **Test connection** — the UI reports whether auth is needed
4. Click **Save** — you're in

### Production build

```bash
pnpm build                                    # web only → packages/web/dist/
pnpm --filter @openconcho/desktop build       # desktop → packages/desktop/src-tauri/target/release/bundle/
```

## Stack

| Layer | Library |
|---|---|
| Desktop shell | [Tauri v2](https://v2.tauri.app/) |
| Framework | React 19 + Vite 8 |
| Routing | TanStack Router v1 (file-based) |
| Data fetching | TanStack Query v5 |
| API client | openapi-fetch (typed from `openapi.json`) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Animation | framer-motion |
| Icons | lucide-react |
| Lint / format | Biome 2 |
| Tests | Vitest 4 + Testing Library |
| Releases | semantic-release (conventional commits) |

## Development

```bash
pnpm dev              # Vite dev server (web, http://localhost:5173)
pnpm test             # Vitest test suite
pnpm lint:fix         # Biome lint + format
pnpm typecheck        # TypeScript strict check
pnpm generate:api     # Regenerate src/api/schema.d.ts from openapi.json
```

### Regenerating API types

When your Honcho instance is updated, pull a fresh schema and regenerate:

```bash
curl http://your-honcho-url/openapi.json -o packages/web/openapi.json
pnpm --filter @openconcho/web generate:api
```

## Privacy

- Base URL and token stored in `localStorage` under `openconcho:config`
- Theme preference stored in `localStorage` under `openconcho:theme`
- No telemetry, no analytics, no external requests beyond your configured Honcho instance

## Contributing

Open an issue first for significant changes. PRs welcome.

## License

MIT
