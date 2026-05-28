# Running OpenConcho in Docker

The `@openconcho/web` SPA ships as a container: a two-stage build (Node + pnpm
builds the static bundle, then `nginx-unprivileged` serves it on port `8080` as
a non-root user) that also **reverse-proxies the Honcho API under its own
origin**, so the browser never makes a cross-origin request.

## Add it to a Honcho Compose stack (recommended)

Honcho's self-hosting path is Docker Compose. Drop the `openconcho` service from
[`docker-compose.yml`](../docker-compose.yml) into the project that runs your
Honcho `api`:

```yaml
services:
  openconcho:
    image: ghcr.io/offendingcommit/openconcho-web:latest
    environment:
      HONCHO_UPSTREAM: http://api:8000        # nginx proxies /v3 + /health here
      OPENCONCHO_DEFAULT_HONCHO_URL: same-origin
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped
```

`OPENCONCHO_DEFAULT_HONCHO_URL: same-origin` makes the UI default its Honcho
base URL to its own origin, so API calls go through the proxy → **no browser
CORS, and the API token never leaves the origin.** The published image is
multi-arch (amd64 + arm64); the first publish creates a private GHCR package —
make it public if you want unauthenticated pulls.

## Standalone

```bash
docker build -t openconcho-web .
docker run --rm -p 8080:8080 -e HONCHO_UPSTREAM=http://host.docker.internal:8000 openconcho-web
# → http://localhost:8080  ·  GET /healthz returns "ok"
```

Runtime knobs (no rebuild needed):

| Env | Default | Meaning |
|-----|---------|---------|
| `HONCHO_UPSTREAM` | `http://api:8000` | Where nginx proxies `/v3` and `/health` |
| `OPENCONCHO_DEFAULT_HONCHO_URL` | `same-origin` | SPA's default base URL — `same-origin`, an absolute URL, or empty (configure in Settings) |

Hardened run adds `--read-only --cap-drop ALL --security-opt no-new-privileges`
with `--tmpfs /tmp --tmpfs /var/cache/nginx`. Note: the runtime config writes
`config.js` into the web root at start, which a read-only root blocks — under
`--read-only` either bind-mount `config.js` or leave
`OPENCONCHO_DEFAULT_HONCHO_URL` empty and set the URL in Settings.

## CORS, the short version

The desktop app routes HTTP through Rust and bypasses browser CORS; the web
build doesn't. The Compose setup above **solves CORS via the same-origin proxy**
— nothing to configure on Honcho. If instead you point the UI at a *different*
origin (absolute `OPENCONCHO_DEFAULT_HONCHO_URL` or a URL typed in Settings),
allow that origin in Honcho's FastAPI `CORSMiddleware`:

```python
app.add_middleware(CORSMiddleware, allow_origins=["https://your-ui-origin"],
                   allow_methods=["*"], allow_headers=["*"])
```
