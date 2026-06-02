# Running OpenConcho in Docker

The `@openconcho/web` SPA ships as a container: a two-stage build (Node + pnpm
builds the static bundle, then `nginx-unprivileged` serves it on port `8080` as
a non-root user) that also **reverse-proxies the Honcho API under its own
origin**, so the browser never makes a cross-origin request.

## How the proxy works

The browser issues every Honcho call same-origin to `/api/*` and names the real
upstream per request in an `X-Honcho-Upstream` header (sourced from the active
instance's base URL). nginx strips `/api`, forwards to that upstream server-side,
and returns the response. Because the browser→nginx hop is same-origin, **no CORS
applies**; the nginx→Honcho hop is server-side, where CORS is irrelevant. The
frontend stays the source of truth for which instance to talk to, so the
multi-instance switcher and the Fleet view keep working.

## Compose: dev-forward vs prod

Two Compose files, env/ports defined once in the base:

- **`docker-compose.yml`** — dev-forward: `build: .`, so it runs **your local source**.
- **`docker-compose.prod.yml`** — override that swaps the build for the **published
  image** (`ghcr.io/offendingcommit/openconcho-web:latest`, `pull_policy: always`).

```bash
make compose-up        # build from source + run        → http://localhost:8080
make compose-up-prod   # pull ghcr…:latest instead of building
make compose-down      # stop + remove
```

`make compose-up-prod` expands to
`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`. Set env
inline or via a `.env` file:

```bash
OPENCONCHO_DEFAULT_HONCHO_URL=https://honcho.example.net make compose-up-prod
```

The published image is multi-arch (amd64 + arm64); the first publish creates a
private GHCR package — make it public for unauthenticated pulls.

## Add it to an existing Honcho Compose stack

Drop the `openconcho` service into the project that runs your Honcho `api`,
pointing the seed at the api service (nginx resolves it on the compose network):

```yaml
services:
  openconcho:
    image: ghcr.io/offendingcommit/openconcho-web:latest
    environment:
      OPENCONCHO_DEFAULT_HONCHO_URL: http://api:8000
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped
```

`OPENCONCHO_DEFAULT_HONCHO_URL` seeds the UI's first instance with an absolute
URL. The browser sends that URL in the `X-Honcho-Upstream` header; nginx (on the
compose network) forwards to it — **no browser CORS, and the API token never
leaves the origin.**

## Standalone (no compose)

```bash
docker run --rm -p 8080:8080 -e OPENCONCHO_DEFAULT_HONCHO_URL=http://host.docker.internal:8000 \
  ghcr.io/offendingcommit/openconcho-web:latest
# → http://localhost:8080  ·  GET /healthz returns "ok"
```

Runtime knobs (no rebuild needed):

| Env | Default | Meaning |
|-----|---------|---------|
| `OPENCONCHO_DEFAULT_HONCHO_URL` | _(empty)_ | Absolute URL seeding the first instance; empty = configure in Settings |
| `OPENCONCHO_UPSTREAM_ALLOWLIST` | _(empty)_ | Optional SSRF guard: comma-separated host globs (e.g. `honcho.example.net,*.honcho.dev`). Empty = forward anywhere |

Hardened run adds `--read-only --cap-drop ALL --security-opt no-new-privileges`
with `--tmpfs /tmp --tmpfs /var/cache/nginx`. Note: the entrypoint writes
`config.js` and the allowlist map at start, which a read-only root blocks — under
`--read-only` either bind-mount those paths or leave the env empty and configure
the URL in Settings.

## SSRF: when to set the allowlist

The header-driven proxy forwards to whatever upstream the client names. With the
default `127.0.0.1:8080` binding only your own machine can reach nginx, so leaving
the allowlist open is fine. **Before exposing the proxy** (e.g. behind a tunnel),
set `OPENCONCHO_UPSTREAM_ALLOWLIST` to the host globs you trust — non-matching
upstreams are rejected with `403` and an `X-Honcho-Proxy-Reject: allowlist` header.

## CORS, the short version

The desktop app routes HTTP through Rust (reqwest) and bypasses browser CORS; the
web build solves it with the same-origin `/api` proxy above — **nothing to
configure on Honcho.** The proxy makes a Honcho-side `CORSMiddleware` unnecessary
regardless of which instance you point at.
