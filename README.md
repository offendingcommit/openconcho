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
| **Multiple instances** | Add and switch between several Honcho connections |
| **Fleet dashboard** | Cross-instance observability — workspaces/sessions/queue side-by-side with per-instance badges |
| **Workspaces** | Paginated list with per-workspace navigation |
| **Peers** | Browse peers, view representations, context, and peer cards |
| **Peer display names** | Set a friendly `display_name` (metadata) to replace raw peer ids |
| **Peer Card Seed Kits** | Author reusable peer-card kits and apply them across instances |
| **Sessions** | Paginated message history with summaries and context |
| **Conclusions** | Semantic search across conclusions with observer/subject display |
| **Dream viewer** | Browse dream/consolidation bursts with a recursive premise tree |
| **Dialectic playground** | Fan one query across all reasoning levels side-by-side |
| **Webhooks** | Manage and trigger webhooks per workspace |
| **Chat** | Conversational interface through Honcho's chat endpoint with memory context |
| **Schedule Dream** | Trigger Honcho's dream/consolidation pass on demand |
| **Demo mode** | Mask identifiers/content for screenshots and screen-sharing |
| **Dark / light mode** | Persisted per device, instant toggle |
| **Optional auth** | Token field is optional; connection health check auto-detects auth requirement |

## Download

Pre-built binaries are attached to every [GitHub Release](https://github.com/offendingcommit/openconcho/releases/latest):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `OpenConcho_*_aarch64.dmg` |
| macOS (Intel) | `OpenConcho_*_x64.dmg` |
| Linux | `openconcho_*_amd64.deb` / `openconcho_*_amd64.AppImage` / `OpenConcho-*.x86_64.rpm` |
| Windows | `OpenConcho_*_x64-setup.exe` / `OpenConcho_*_x64_en-US.msi` |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 22
- [pnpm](https://pnpm.io/) 10 (pinned via `packageManager`; `corepack enable` picks it up)
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

### Docker (web app)

The container serves the SPA and reverse-proxies the Honcho API under its own
origin: the browser calls `/api` same-origin and names the upstream in an
`X-Honcho-Upstream` header, so there's no browser CORS to configure.

Two Compose modes (the published image is `ghcr.io/offendingcommit/openconcho-web`):

```bash
# Dev-forward — build from this repo and run your local changes:
OPENCONCHO_DEFAULT_HONCHO_URL=https://honcho.example.net make up

# Production — pull the latest published image instead of building:
OPENCONCHO_DEFAULT_HONCHO_URL=https://honcho.example.net make prod

make down    # stop + remove (dev or prod)
make clean   # down + drop the locally built image
# → http://localhost:8080
```

Both modes live in one [`docker-compose.yml`](docker-compose.yml) as Compose
profiles: `make up` runs the `dev` profile (`build: .`), `make prod` runs the
`prod` profile (pulls `ghcr…:latest`). `OPENCONCHO_DEFAULT_HONCHO_URL` seeds the first instance
(absolute URL); `OPENCONCHO_UPSTREAM_ALLOWLIST` is an optional SSRF guard
(comma-separated host globs) for when you expose the proxy. Full details and env
vars are in [`docs/docker.md`](docs/docker.md).

### Kubernetes (Helm)

The chart is published as an OCI artifact to GHCR on every tagged release.

```bash
helm install openconcho oci://ghcr.io/offendingcommit/charts/openconcho \
  --version 0.14.0 \
  --create-namespace --namespace openconcho \
  --set honcho.defaultUrl=https://honcho.example.com
```

Enable an Ingress and TLS:

```bash
helm install openconcho oci://ghcr.io/offendingcommit/charts/openconcho \
  --version 0.14.0 \
  --create-namespace --namespace openconcho \
  --set honcho.defaultUrl=https://honcho.example.com \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set 'ingress.hosts[0].host=openconcho.example.com' \
  --set 'ingress.hosts[0].paths[0].path=/' \
  --set 'ingress.tls[0].secretName=openconcho-tls' \
  --set 'ingress.tls[0].hosts[0]=openconcho.example.com'
```

Full chart documentation, configuration reference, and an ArgoCD Application example are in [`charts/openconcho/README.md`](charts/openconcho/README.md).

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

- Connection details (base URL + token, one or more instances) stored in `localStorage` under `openconcho:instances`
- Theme preference stored in `localStorage` under `openconcho:theme`
- No telemetry, no analytics, no external requests beyond your configured Honcho instance

## Contributing

Open an issue first for significant changes. PRs welcome.

## License

MIT
