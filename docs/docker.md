# Running OpenConcho in Docker

The `@openconcho/web` SPA can be served from a container. The image is a
two-stage build: Node + pnpm builds the static bundle, then
`nginx-unprivileged` serves it on port `8080` as a non-root user.

## Build and run

```bash
docker build -t openconcho-web .
docker run --rm -p 8080:8080 openconcho-web
# → http://localhost:8080
```

Hardened run (read-only filesystem, no added capabilities):

```bash
docker run --rm -p 8080:8080 \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/cache/nginx \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  openconcho-web
```

`GET /healthz` returns `200 ok` for container health checks.

## CORS

The desktop app routes HTTP through Rust (`reqwest`), so it is **not** subject
to browser CORS. The **web build is**: it uses the browser's `fetch`, so every
request to your Honcho API is cross-origin. Honcho calls are `POST` +
`application/json` + `Authorization: Bearer`, which the browser always
**preflights** (`OPTIONS`). You must handle this one of two ways.

### Option 1 — configure Honcho's CORS (recommended)

Honcho is a FastAPI service. Allow the UI's origin via its
`CORSMiddleware` so preflight and actual requests succeed:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # the OpenConcho origin
    allow_methods=["*"],
    allow_headers=["*"],
)
```

This fits OpenConcho's model directly — the UI keeps using the absolute Honcho
URL you enter in Settings (stored in `localStorage`). Since you self-host
Honcho, you control this.

### Option 2 — same-origin reverse proxy (advanced)

Proxy the Honcho API under the same origin that serves the SPA, so the browser
sees same-origin requests and CORS never applies (the token also never crosses
origins). Uncomment the `location /honcho/` block in
[`docker/nginx.conf`](../docker/nginx.conf) and set `proxy_pass` to your Honcho
host.

Caveat: the Settings form currently validates the base URL as an **absolute**
URL (`z.string().url()`), so pointing the UI at a relative same-origin path
(`/honcho`) isn't wired yet. Until that lands, Option 1 is the supported path.
