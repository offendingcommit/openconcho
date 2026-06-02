# Header-Driven `/api` Proxy for Web CORS — Design

- **Date:** 2026-06-02
- **Status:** Approved (design) — pending spec review
- **Scope:** One concern — eliminate browser CORS for the web build by routing
  Honcho API calls through a same-origin, header-driven reverse proxy. Preserve
  existing Fleet aggregation. No new aggregation features (deferred).

## Problem

The web build (`@openconcho/web`) talks to Honcho directly from the browser. When
the configured instance URL is a different origin than the page (e.g. a self-hosted
Honcho at `https://honcho.example.net` while the UI runs on
`http://localhost:8080`), the browser issues a CORS preflight on the `Authorization`
header and the request fails — Honcho ships no `CORSMiddleware`.

The desktop (Tauri) build is unaffected: it routes fetch through Rust/`reqwest`
(`packages/web/src/lib/http.ts`), which has no browser same-origin policy.

The repo already had a partial mitigation (a static `^~ /v3/` nginx proxy keyed to a
single `HONCHO_UPSTREAM`), but it (a) supported only one backend and (b) was bypassed
the moment a user typed an absolute URL into Settings — which is the bug that surfaced.

### Evidence gathered

- Browser → `honcho.example.net` is reachable; the CORS error proves the
  request reached Honcho and only the browser policy check failed.
- A Docker container under Colima **also** reaches the tailnet: `docker run ...
  curl https://honcho.example.net/health` returned **HTTP 200**, connected over the
  tailnet on `:443` with TLS verified. So a container-side proxy is viable on this
  host (Colima forwards container egress through the host's tailnet routing).

## Decisions

1. **Coexist by runtime mode.** Tauri keeps absolute-URL + `reqwest`. The web build
   (docker **and** `make dev-web`) routes through a same-origin `/api` proxy. One
   build; behavior chosen at runtime by `isTauri()`.
2. **Header-driven routing.** The browser names the target upstream per request via
   an `X-Honcho-Upstream` header (sourced from the active/scoped instance's
   `baseUrl`). The proxy is a stateless forwarder; the frontend stays the single
   source of truth for instances. No server-side slug→upstream map.
3. **SSRF posture: optional allowlist, open by default.** Unset
   `OPENCONCHO_UPSTREAM_ALLOWLIST` ⇒ forward anywhere (safe for the default
   `127.0.0.1:8080` binding). Set it (host globs) before exposing the proxy (e.g.
   behind `cloudflared`) to reject non-matching upstreams.
4. **Aggregation: preserve, don't extend.** The existing Fleet dashboard
   (`compareQueries.ts`, `fleetAggregates.ts`, `FleetDashboard`/`FleetRow`) must keep
   working identically. New cross-instance merge/dedup/search is explicitly a
   **non-goal** of this PR.

## Architecture

```
WEB (docker + dev):
  browser ──same-origin──▶ /api/v3/...                (openapi-fetch base = "/api")
    X-Honcho-Upstream: https://honcho.example.net   (from instance.baseUrl)
    Authorization: Bearer …                                  (unchanged, when set)
        │  proxy: validate header, allowlist-check, strip "/api",
        │         proxy_pass $upstream, set SNI/Host, drop routing header
        ▼
  https://honcho.example.net/v3/...          (server-side hop — no CORS)

TAURI:
  webview ──reqwest──▶ https://honcho.example.net/v3/...   (unchanged)
```

**Why a custom header is free here:** `X-Honcho-Upstream` rides a *same-origin*
request (browser → `/api`), so it triggers no CORS preflight. Preflight only fires
cross-origin — the exact condition this design removes.

**Why the instance store is unchanged:** instances still persist an absolute
`baseUrl` (`z.string().url()` stays valid). We change only *how a request is
dispatched*, not what is stored. In web mode the instance URL stops being the fetch
target and becomes the header value.

## Components

### A. Centralized dispatch helper (new) — `src/lib/dispatch.ts`

Single source of truth for "how to issue a request for an instance," replacing four
ad-hoc constructions.

```ts
export const API_PREFIX = "/api";
export const UPSTREAM_HEADER = "X-Honcho-Upstream";

export interface Dispatch {
  baseUrl: string;                       // "/api" (web) | instance.baseUrl (tauri)
  headers: Record<string, string>;       // Content-Type, Authorization?, X-Honcho-Upstream?
  fetch: typeof globalThis.fetch;        // globalThis.fetch (web) | tauriFetch (tauri)
}

export function dispatchFor(
  instance: Pick<Instance, "baseUrl" | "token">,
): Dispatch;
```

- **Web:** `baseUrl = API_PREFIX`; headers include `UPSTREAM_HEADER =
  normalizedUpstream(instance.baseUrl)` (trailing slash stripped) and `Authorization`
  when `token` is non-empty; `fetch = globalThis.fetch`.
- **Tauri:** `baseUrl = instance.baseUrl`; no upstream header; `fetch = tauriFetch`.

`API_PREFIX` and `UPSTREAM_HEADER` are named constants (WIOCHE) referenced by both
the frontend and documented for the proxy.

### B. Consumers of the helper (the four dispatch sites)

| Site | File | Change |
|------|------|--------|
| Active-instance client | `src/api/client.ts` | build client from `dispatchFor(loadConfig())` |
| Scoped client (Fleet/compare, seed-kits) | `src/api/scopedClient.ts` | build client from `dispatchFor(instance)` |
| Connection health check | `src/lib/config.ts` `checkConnection` | fetch `${baseUrl}/v3/workspaces/list` via `dispatchFor` (hits `/api/...` in web) |
| Discovery name probe | `src/lib/discovery.ts` `suggestNameForInstance` | same, via `dispatchFor` |

`compareQueries.ts` and `fleetAggregates.ts` need **no changes** — they go through
`createScopedClient`, so the transport swap is invisible to them. `FleetRow.tsx:114`
uses `instance.baseUrl` only to render a hostname label (cosmetic) — untouched.

### C. nginx proxy — `docker/nginx.conf.template`

Replace the `^~ /v3/` and `= /health` upstream blocks with one header-driven block:

```nginx
resolver 127.0.0.11 ipv6=off valid=10s;

# Rendered by the entrypoint from OPENCONCHO_UPSTREAM_ALLOWLIST.
# Unset → default 1 (open). Set → 1 only for matching hosts, else 0.
# (map block injected here)

location ^~ /api/ {
    set $upstream $http_x_honcho_upstream;
    if ($upstream = "")      { return 421; }   # misdirected: no target named
    if ($allow_upstream = 0) { return 403; }   # allowlist reject
    rewrite ^/api/(.*)$ /$1 break;             # strip /api, keep /v3/...
    proxy_pass               $upstream;
    proxy_ssl_server_name    on;               # SNI for HTTPS upstreams
    proxy_set_header Host    $proxy_host;       # upstream host, not localhost:8080
    proxy_set_header X-Honcho-Upstream "";      # never leak routing header upstream
}
```

`Authorization` and other client headers pass through by nginx default. The
container's own `/healthz` liveness endpoint is unchanged.

### D. Vite dev parity — `vite.config.ts`

A `configureServer` middleware mirrors nginx for `make dev-web`: read
`X-Honcho-Upstream`, forward `/api/*` (prefix stripped) to it, drop the routing
header, apply the same allowlist if configured. Result: dev behaves identically to
the docker image (local/CI parity).

### E. Config / env — `docker/40-openconcho-config.sh`, `docker-compose.yml`

- `OPENCONCHO_DEFAULT_HONCHO_URL` keeps seeding the first instance, now an **absolute
  URL only**. Drop the `same-origin` sentinel (glue for the retired `/v3` proxy) from
  `src/lib/runtimeConfig.ts`.
- **Retire `HONCHO_UPSTREAM`** from compose — the upstream now comes from the header.
- New optional `OPENCONCHO_UPSTREAM_ALLOWLIST` (comma-separated host globs, e.g.
  `honcho.example.net,*.honcho.dev`). The entrypoint renders it into the
  nginx `map` for `$allow_upstream`; unset ⇒ map default 1.

## Data flow (Fleet aggregation, web mode)

```
FleetDashboard → useScoped*(instanceA) → createScopedClient(A) → dispatchFor(A)
                                            POST /api/v3/...  X-Honcho-Upstream: A ─┐
              → useScoped*(instanceB) → createScopedClient(B) → dispatchFor(B)      ├▶ nginx → A,B
                                            POST /api/v3/...  X-Honcho-Upstream: B ─┘   (concurrent)
fleetAggregates.ts merges results (transport-agnostic). B down ⇒ only B's column errors.
```

Query keys in `compareQueries.ts` are already scoped by `instance.id`, so caches
never collide across columns. Stateless per-request routing isolates partial
failures per instance.

## Error handling

The proxy must not let its own refusals masquerade as upstream responses. Both
proxy-origin refusals carry a sentinel response header **`X-Honcho-Proxy-Reject`**
(value: `no-upstream` | `allowlist`). `checkConnection` treats any response bearing
that header as `unreachable` with the reject reason — **regardless of status code** —
so an allowlist `403` is never mis-mapped to the upstream's auth `403`.

- **No `X-Honcho-Upstream`** (misconfigured web request) → proxy `421` +
  `X-Honcho-Proxy-Reject: no-upstream`. Fail loud, not silent.
- **Allowlist reject** → proxy `403` + `X-Honcho-Proxy-Reject: allowlist`. The
  sentinel header is what disambiguates it from the upstream's own `401/403` (which
  arrive without the header and still map to `auth-required`).
- **Upstream unreachable / TLS failure** → nginx `502`; UI shows "Cannot reach
  server." This is the symptom if a future host's container is *not* on the tailnet —
  a network problem, not CORS (documented caveat: proxy portability depends on the
  container host being able to route to the upstream).

## Testing (TDD)

Unit (mock only `isTauri` + the fetch boundary, per project test rules):

1. `dispatchFor` (web): `baseUrl === "/api"`, sets `X-Honcho-Upstream` to the
   normalized instance URL, sets `Authorization` only when token non-empty, uses
   `globalThis.fetch`.
2. `dispatchFor` (tauri): `baseUrl === instance.baseUrl`, no upstream header, uses
   `tauriFetch`.
3. `checkConnection` (web): issues to `/api/v3/workspaces/list` with the upstream
   header; maps `ok` / `401|403` / other correctly.
4. **Aggregation regression:** two scoped clients for distinct instances emit two
   distinct `X-Honcho-Upstream` values; existing `src/test/fleet.test.tsx` stays
   green.

Integration (nginx): compose up against a stub upstream — assert (a) header →
forward with `/api` stripped, (b) missing header → 421, (c) allowlist miss → 403,
(d) `X-Honcho-Upstream` absent on the upstream-side request.

## Non-goals (deferred to separate PRs)

- New cross-instance aggregation intelligence (unified merged lists, dedup, conflict
  resolution, cross-instance search).
- Running Tailscale inside the Colima VM / any host-networking change (not needed —
  reachability confirmed on the target host).
- Adding `CORSMiddleware` to Honcho (the proxy keeps openconcho self-contained and
  backend-agnostic; this is the deliberate alternative *not* taken).

## Files touched

- `packages/web/src/lib/dispatch.ts` (new)
- `packages/web/src/api/client.ts`
- `packages/web/src/api/scopedClient.ts`
- `packages/web/src/lib/config.ts`
- `packages/web/src/lib/discovery.ts`
- `packages/web/src/lib/runtimeConfig.ts`
- `packages/web/vite.config.ts`
- `docker/nginx.conf.template`
- `docker/40-openconcho-config.sh`
- `docker-compose.yml`
- tests: `packages/web/src/test/` (new dispatch + checkConnection cases; keep
  `fleet.test.tsx`, `settings-form.test.tsx` green)
- docs: `AGENTS.md`, `README` (env vars + the proxy contract)

## Constraints honored

- Web-only change → PR CI (web checks) covers it; no desktop `cargo-check` needed
  (Tauri path unchanged).
- No hardcoded URLs (upstream comes from instance config / runtime env).
- One concern per PR (proxy only); conventional commits; push under `offendingcommit`.
