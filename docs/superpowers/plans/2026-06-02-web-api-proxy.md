# Header-Driven `/api` Proxy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate browser CORS for the web build by routing Honcho API calls through a same-origin, header-driven reverse proxy, while leaving the Tauri desktop path untouched and preserving Fleet aggregation.

**Architecture:** A single `dispatchFor(instance)` helper decides transport at runtime — web mode returns `baseUrl="/api"` plus an `X-Honcho-Upstream` header (the real Honcho URL); Tauri mode returns the absolute URL and reqwest. nginx (docker) and a Vite middleware (dev) read the header and forward server-side, so the browser never makes a cross-origin request. Instances are still stored as absolute URLs — only dispatch changes.

**Tech Stack:** React 19, openapi-fetch, TanStack Query, Vitest, Biome, nginx (envsubst template), Vite dev server, Tauri v2.

**Spec:** `docs/superpowers/specs/2026-06-02-honcho-api-proxy-design.md`

**Baseline gate (run before starting AND after every task):**
`make ci-web` (lint + typecheck + test + build). Targeted test during a task: `pnpm --filter @openconcho/web exec vitest run <path>`.

**Commit discipline:** conventional commits, one logical change per commit, body lines ≤100 chars, no AI attribution. Branch `feat/web-api-proxy` (already created; spec already committed there).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `packages/web/src/lib/platform.ts` | Single `isTauri()` predicate (leaf module, no app imports) | Create |
| `packages/web/src/lib/dispatch.ts` | `dispatchFor()` + proxy constants — the one transport decision | Create |
| `packages/web/src/lib/http.ts` | Keep `httpFetch`; consume `isTauri` from platform | Modify |
| `packages/web/src/lib/discovery.ts` | Re-export `isTauri` from platform; route probe via `dispatchFor` | Modify |
| `packages/web/src/api/client.ts` | Active-instance client via `dispatchFor` | Modify |
| `packages/web/src/api/scopedClient.ts` | Scoped client (Fleet/seed-kits) via `dispatchFor` | Modify |
| `packages/web/src/lib/config.ts` | `checkConnection` via `dispatchFor` + proxy-reject handling | Modify |
| `packages/web/src/lib/runtimeConfig.ts` | Drop `same-origin` sentinel | Modify |
| `packages/web/vite.config.ts` | Dev `/api` proxy middleware mirroring nginx | Modify |
| `docker/nginx.conf.template` | Header-driven `^~ /api/` block (replaces `/v3` + `/health`) | Modify |
| `docker/40-openconcho-config.sh` | Render allowlist `map` for `$allow_upstream` | Modify |
| `docker-compose.yml` | Retire `HONCHO_UPSTREAM`; document allowlist env | Modify |
| `AGENTS.md`, `README.md` | Proxy contract + env vars | Modify |
| `packages/web/src/test/dispatch.test.ts` | Unit tests for `dispatchFor` | Create |
| `packages/web/src/test/check-connection.test.ts` | Unit tests for `checkConnection` proxy behavior | Create |

---

## Task 1: Extract `isTauri()` into a leaf module

Prevents an import cycle: `discovery.ts` will later import `dispatchFor`, and `dispatch.ts` needs `isTauri`. A leaf `platform.ts` breaks the cycle and gives one canonical predicate (WIOCHE).

**Files:**
- Create: `packages/web/src/lib/platform.ts`
- Test: `packages/web/src/test/platform.test.ts`
- Modify: `packages/web/src/lib/http.ts`, `packages/web/src/lib/discovery.ts`

- [ ] **Step 1: Write the failing test**

`packages/web/src/test/platform.test.ts`:
```ts
import { afterEach, describe, expect, it } from "vitest";
import { isTauri } from "@/lib/platform";

describe("isTauri", () => {
	afterEach(() => {
		delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
	});

	it("returns false in a plain browser/jsdom environment", () => {
		expect(isTauri()).toBe(false);
	});

	it("returns true when the Tauri internals global is present", () => {
		(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
		expect(isTauri()).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/platform.test.ts`
Expected: FAIL — cannot resolve `@/lib/platform`.

- [ ] **Step 3: Create the module**

`packages/web/src/lib/platform.ts`:
```ts
/** True when running inside the Tauri desktop shell (WebView with injected internals). */
export function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
```

- [ ] **Step 4: Point existing consumers at the canonical predicate**

In `packages/web/src/lib/http.ts`, replace the inline const with the shared predicate (call it at module load to preserve current behavior):
```ts
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "@/lib/platform";

// Route fetch through Rust (reqwest) when running in Tauri — bypasses WebView CORS enforcement.
// Falls back to native browser fetch during plain web dev.
export const httpFetch: typeof globalThis.fetch = isTauri()
	? (tauriFetch as typeof globalThis.fetch)
	: globalThis.fetch;
```

In `packages/web/src/lib/discovery.ts`, delete the local `isTauri` function (lines 8-10) and re-export the canonical one so existing importers keep working. Add at the top, after the `httpFetch` import:
```ts
export { isTauri } from "@/lib/platform";
```

- [ ] **Step 5: Run tests + lint + typecheck**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/platform.test.ts && make lint && make typecheck`
Expected: PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/lib/platform.ts packages/web/src/lib/http.ts \
        packages/web/src/lib/discovery.ts packages/web/src/test/platform.test.ts
git commit -m "refactor(web): extract isTauri into a leaf platform module"
```

---

## Task 2: `dispatchFor` helper + proxy constants

The heart of the design. Decides transport per instance.

**Files:**
- Create: `packages/web/src/lib/dispatch.ts`
- Test: `packages/web/src/test/dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/web/src/test/dispatch.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const mockIsTauri = vi.fn();
vi.mock("@/lib/platform", () => ({ isTauri: () => mockIsTauri() }));

import {
	API_PREFIX,
	dispatchFor,
	PROXY_REJECT_HEADER,
	UPSTREAM_HEADER,
} from "@/lib/dispatch";

afterEach(() => mockIsTauri.mockReset());

describe("dispatchFor — web mode", () => {
	it("targets the /api prefix and carries the upstream header", () => {
		mockIsTauri.mockReturnValue(false);
		const d = dispatchFor({ baseUrl: "https://honcho.example.net/", token: "" });
		expect(d.baseUrl).toBe(API_PREFIX);
		expect(d.headers[UPSTREAM_HEADER]).toBe("https://honcho.example.net");
		expect(d.headers.Authorization).toBeUndefined();
	});

	it("adds Authorization only when a token is present", () => {
		mockIsTauri.mockReturnValue(false);
		const d = dispatchFor({ baseUrl: "https://honcho.example.net", token: "sk-1" });
		expect(d.headers.Authorization).toBe("Bearer sk-1");
	});
});

describe("dispatchFor — tauri mode", () => {
	it("targets the absolute URL with no upstream header", () => {
		mockIsTauri.mockReturnValue(true);
		const d = dispatchFor({ baseUrl: "https://honcho.example.net", token: "sk-1" });
		expect(d.baseUrl).toBe("https://honcho.example.net");
		expect(d.headers[UPSTREAM_HEADER]).toBeUndefined();
		expect(d.headers.Authorization).toBe("Bearer sk-1");
	});
});

describe("proxy reject header constant", () => {
	it("is the agreed sentinel name", () => {
		expect(PROXY_REJECT_HEADER).toBe("X-Honcho-Proxy-Reject");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/dispatch.test.ts`
Expected: FAIL — cannot resolve `@/lib/dispatch`.

- [ ] **Step 3: Create the helper**

`packages/web/src/lib/dispatch.ts`:
```ts
import { httpFetch } from "@/lib/http";
import { isTauri } from "@/lib/platform";

/** Same-origin path prefix the web build issues all Honcho calls through. */
export const API_PREFIX = "/api";
/** Request header naming the real Honcho upstream for the proxy to forward to. */
export const UPSTREAM_HEADER = "X-Honcho-Upstream";
/** Response header the proxy sets on its OWN refusals (so they aren't read as upstream auth). */
export const PROXY_REJECT_HEADER = "X-Honcho-Proxy-Reject";

export interface Dispatch {
	baseUrl: string;
	headers: Record<string, string>;
	fetch: typeof globalThis.fetch;
}

function normalizeUpstream(url: string): string {
	return url.trim().replace(/\/+$/, "");
}

/**
 * Resolve how to issue a request for an instance.
 * - Web: same-origin `/api` + `X-Honcho-Upstream` header (proxy forwards server-side, no CORS).
 * - Tauri: the absolute instance URL via reqwest (no browser same-origin policy).
 */
export function dispatchFor(instance: { baseUrl: string; token?: string }): Dispatch {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (instance.token) headers.Authorization = `Bearer ${instance.token}`;

	if (isTauri()) {
		return { baseUrl: instance.baseUrl, headers, fetch: httpFetch };
	}

	headers[UPSTREAM_HEADER] = normalizeUpstream(instance.baseUrl);
	return { baseUrl: API_PREFIX, headers, fetch: httpFetch };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/dispatch.test.ts`
Expected: PASS (5 assertions across 4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/dispatch.ts packages/web/src/test/dispatch.test.ts
git commit -m "feat(web): add dispatchFor transport helper for same-origin proxy"
```

---

## Task 3: Route the API clients through `dispatchFor`

**Files:**
- Modify: `packages/web/src/api/client.ts`, `packages/web/src/api/scopedClient.ts`

- [ ] **Step 1: Rewrite `client.ts`**

`packages/web/src/api/client.ts`:
```ts
import createClient from "openapi-fetch";
import { loadConfig } from "@/lib/config";
import { dispatchFor } from "@/lib/dispatch";
import type { paths } from "./schema.d.ts";

export function createHonchoClient() {
	const config = loadConfig() ?? { baseUrl: "http://localhost:8000", token: "" };
	const { baseUrl, headers, fetch } = dispatchFor(config);
	return createClient<paths>({ baseUrl, headers, fetch });
}

export const client = {
	get current() {
		return createHonchoClient();
	},
};
```

- [ ] **Step 2: Rewrite `scopedClient.ts`**

`packages/web/src/api/scopedClient.ts`:
```ts
import createClient from "openapi-fetch";
import type { Instance } from "@/lib/config";
import { dispatchFor } from "@/lib/dispatch";
import type { paths } from "./schema.d.ts";

export type ScopedClient = ReturnType<typeof createClient<paths>>;

/**
 * Create an openapi-fetch client bound to a specific instance. Use for views that
 * query non-active instances (e.g. the Fleet side-by-side comparison). Each scoped
 * client self-routes via its own X-Honcho-Upstream header in web mode.
 */
export function createScopedClient(instance: Instance): ScopedClient {
	const { baseUrl, headers, fetch } = dispatchFor(instance);
	return createClient<paths>({ baseUrl, headers, fetch });
}
```

- [ ] **Step 3: Verify the full web suite stays green**

Run: `pnpm --filter @openconcho/web exec vitest run && make typecheck && make lint`
Expected: PASS — existing `fleet.test.tsx`, `seed-kits.test.ts`, `app.test.tsx` still pass (transport swap is invisible to them).

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/api/client.ts packages/web/src/api/scopedClient.ts
git commit -m "feat(web): route api clients through dispatchFor"
```

---

## Task 4: `checkConnection` + discovery via the proxy, with reject handling

**Files:**
- Modify: `packages/web/src/lib/config.ts` (`checkConnection`), `packages/web/src/lib/discovery.ts` (`suggestNameForInstance`)
- Test: `packages/web/src/test/check-connection.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/web/src/test/check-connection.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const mockIsTauri = vi.fn(() => false);
vi.mock("@/lib/platform", () => ({ isTauri: () => mockIsTauri() }));

import { checkConnection } from "@/lib/config";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
	fetchMock.mockReset();
	mockIsTauri.mockReturnValue(false);
});

describe("checkConnection — web proxy mode", () => {
	it("calls the same-origin /api path with the upstream header", async () => {
		fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
		const res = await checkConnection("https://honcho.example.net", "sk-1");
		expect(res.status).toBe("ok");
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe("/api/v3/workspaces/list");
		expect((init.headers as Record<string, string>)["X-Honcho-Upstream"]).toBe(
			"https://honcho.example.net",
		);
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-1");
	});

	it("maps an upstream 401 to auth-required", async () => {
		fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
		const res = await checkConnection("https://honcho.example.net");
		expect(res.status).toBe("auth-required");
	});

	it("treats a proxy reject as unreachable, not auth-required", async () => {
		fetchMock.mockResolvedValue(
			new Response("", { status: 403, headers: { "X-Honcho-Proxy-Reject": "allowlist" } }),
		);
		const res = await checkConnection("https://blocked.example.net");
		expect(res.status).toBe("unreachable");
		expect(res.message).toMatch(/allowlist/i);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/check-connection.test.ts`
Expected: FAIL — current `checkConnection` fetches `${baseUrl}/v3/...` directly (no `/api`, no upstream header, no reject handling).

- [ ] **Step 3: Rewrite `checkConnection`**

In `packages/web/src/lib/config.ts`, replace the `checkConnection` body (keep the signature). Add the import `import { dispatchFor, PROXY_REJECT_HEADER } from "@/lib/dispatch";` at the top (and remove the now-unused `httpFetch` import if nothing else in the file uses it):
```ts
export async function checkConnection(
	baseUrl: string,
	token?: string,
): Promise<{ status: HealthStatus; message: string }> {
	try {
		const { baseUrl: base, headers, fetch } = dispatchFor({ baseUrl, token });
		const res = await fetch(`${base}/v3/workspaces/list`, {
			method: "POST",
			headers,
			body: JSON.stringify({}),
			signal: AbortSignal.timeout(5000),
		});

		const reject = res.headers.get(PROXY_REJECT_HEADER);
		if (reject) {
			return { status: "unreachable", message: `Proxy refused upstream (${reject})` };
		}
		if (res.ok) return { status: "ok", message: "Connected successfully" };
		if (res.status === 401 || res.status === 403) {
			return { status: "auth-required", message: "Authentication required — provide an API token" };
		}
		return { status: "unreachable", message: `Server returned ${res.status}` };
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Unknown error";
		if (msg.includes("AbortError") || msg.includes("timeout")) {
			return { status: "unreachable", message: "Connection timed out" };
		}
		return { status: "unreachable", message: `Cannot reach server: ${msg}` };
	}
}
```

- [ ] **Step 4: Route the discovery probe through `dispatchFor` too**

In `packages/web/src/lib/discovery.ts`, rewrite `suggestNameForInstance` to dispatch consistently. Add `import { dispatchFor } from "@/lib/dispatch";` and replace the fetch line:
```ts
export async function suggestNameForInstance(baseUrl: string): Promise<string | null> {
	try {
		const { baseUrl: base, headers, fetch } = dispatchFor({ baseUrl });
		const res = await fetch(`${base}/v3/workspaces/list?page=1&page_size=1`, {
			method: "POST",
			headers,
			body: JSON.stringify({}),
			signal: AbortSignal.timeout(2000),
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { items?: Array<{ id?: string }> };
		const wsId = data.items?.[0]?.id;
		if (typeof wsId === "string" && wsId.length > 0) {
			return deriveNameFromWorkspaceId(wsId);
		}
		return null;
	} catch {
		return null;
	}
}
```
(Leave the top-of-file `httpFetch` import only if still referenced; otherwise remove it. `discovery.ts` no longer needs `httpFetch` after this change — remove the import.)

- [ ] **Step 5: Run tests + gate**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/check-connection.test.ts && pnpm --filter @openconcho/web exec vitest run && make typecheck && make lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/lib/config.ts packages/web/src/lib/discovery.ts \
        packages/web/src/test/check-connection.test.ts
git commit -m "feat(web): route checkConnection and discovery through the proxy"
```

---

## Task 5: Drop the `same-origin` sentinel from runtime config

In header mode the default instance needs a real absolute URL (it becomes the header value); `same-origin` was glue for the retired `/v3` proxy.

**Files:**
- Modify: `packages/web/src/lib/runtimeConfig.ts`
- Test: `packages/web/src/test/runtime-config.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/web/src/test/runtime-config.test.ts`:
```ts
import { afterEach, describe, expect, it } from "vitest";
import { runtimeDefaultBaseUrl } from "@/lib/runtimeConfig";

const KEY = "__OPENCONCHO_DEFAULT_HONCHO_URL__";

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[KEY];
});

describe("runtimeDefaultBaseUrl", () => {
	it("returns an injected absolute URL verbatim", () => {
		(globalThis as Record<string, unknown>)[KEY] = "https://honcho.example.net";
		expect(runtimeDefaultBaseUrl()).toBe("https://honcho.example.net");
	});

	it("returns null when unset or empty", () => {
		expect(runtimeDefaultBaseUrl()).toBeNull();
		(globalThis as Record<string, unknown>)[KEY] = "   ";
		expect(runtimeDefaultBaseUrl()).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify current behavior is covered/fails appropriately**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/runtime-config.test.ts`
Expected: PASS for absolute/empty (existing behavior), but the goal is to simplify; proceed to remove the sentinel branch.

- [ ] **Step 3: Simplify the module**

`packages/web/src/lib/runtimeConfig.ts`:
```ts
const GLOBAL_KEY = "__OPENCONCHO_DEFAULT_HONCHO_URL__";

/**
 * Runtime-injected default Honcho base URL for container deployments.
 *
 * The Docker image writes `/config.js` from `OPENCONCHO_DEFAULT_HONCHO_URL` at
 * container start, so one prebuilt image can target any backend without a rebuild.
 * The web build proxies this URL via the same-origin `/api` reverse proxy (no CORS).
 *
 * - an absolute URL → that URL (seeds the first instance)
 * - empty / unset → null (no default; the user configures in Settings)
 */
export function runtimeDefaultBaseUrl(): string | null {
	const raw = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
	if (typeof raw !== "string" || raw.trim() === "") return null;
	return raw.trim();
}
```

- [ ] **Step 4: Run test + gate**

Run: `pnpm --filter @openconcho/web exec vitest run src/test/runtime-config.test.ts && make typecheck && make lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/runtimeConfig.ts packages/web/src/test/runtime-config.test.ts
git commit -m "refactor(web): drop same-origin sentinel from runtime config"
```

---

## Task 6: nginx header-driven `/api` proxy

**Files:**
- Modify: `docker/nginx.conf.template`

- [ ] **Step 1: Replace the `/v3` + `/health` blocks with the `/api` block**

In `docker/nginx.conf.template`, delete the `location ^~ /v3/ { ... }` and `location = /health { ... }` blocks (lines 21-32) and the `set $honcho_upstream ...` line. Keep the `resolver` line. Insert:
```nginx
    # Header-driven same-origin proxy: the browser names the Honcho upstream per
    # request via X-Honcho-Upstream, so the browser never makes a cross-origin call.
    # $allow_upstream is provided by the allowlist map in conf.d (entrypoint-rendered).
    location ^~ /api/ {
        set $upstream $http_x_honcho_upstream;
        if ($upstream = "") {
            add_header X-Honcho-Proxy-Reject "no-upstream" always;
            return 421;
        }
        if ($allow_upstream = 0) {
            add_header X-Honcho-Proxy-Reject "allowlist" always;
            return 403;
        }
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass               $upstream;
        proxy_ssl_server_name    on;
        proxy_set_header Host    $proxy_host;
        proxy_set_header X-Honcho-Upstream "";
    }
```

- [ ] **Step 2: Validate template renders to valid nginx syntax**

Run (renders the template with a dummy upstream and an open allowlist map, then `nginx -t`):
```bash
docker run --rm -e HONCHO_UPSTREAM=http://x:8000 -v "$PWD/docker":/d nginxinc/nginx-unprivileged:stable sh -c '
  mkdir -p /etc/nginx/conf.d
  echo "map \$http_x_honcho_upstream \$allow_upstream { default 1; }" > /etc/nginx/conf.d/allowlist_map.conf
  envsubst "\$HONCHO_UPSTREAM" < /d/nginx.conf.template > /etc/nginx/conf.d/default.conf
  nginx -t'
```
Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`.

- [ ] **Step 3: Commit**

```bash
git add docker/nginx.conf.template
git commit -m "feat(docker): header-driven /api reverse proxy in nginx"
```

---

## Task 7: Entrypoint renders the allowlist map

**Files:**
- Modify: `docker/40-openconcho-config.sh`

- [ ] **Step 1: Append allowlist-map rendering**

In `docker/40-openconcho-config.sh`, after the existing `config.js` heredoc, append:
```sh
# Render the SSRF allowlist into an nginx map for $allow_upstream.
# Unset/empty OPENCONCHO_UPSTREAM_ALLOWLIST → open (default 1), fine for the
# localhost-bound default. Set it (comma-separated host globs) before exposing
# the proxy (e.g. behind a tunnel) to reject non-matching upstreams.
ALLOWLIST_CONF=/etc/nginx/conf.d/allowlist_map.conf
if [ -z "${OPENCONCHO_UPSTREAM_ALLOWLIST:-}" ]; then
	printf 'map $http_x_honcho_upstream $allow_upstream { default 1; }\n' > "$ALLOWLIST_CONF"
else
	{
		printf 'map $http_x_honcho_upstream $allow_upstream {\n'
		printf '    default 0;\n'
		IFS=','
		for host in $OPENCONCHO_UPSTREAM_ALLOWLIST; do
			host=$(printf '%s' "$host" | tr -d ' ')
			[ -z "$host" ] && continue
			esc=$(printf '%s' "$host" | sed -e 's/[.]/\\./g' -e 's/[*]/[^/]*/g')
			printf '    "~^https?://%s(:[0-9]+)?(/.*)?$" 1;\n' "$esc"
		done
		printf '}\n'
	} > "$ALLOWLIST_CONF"
fi
```

- [ ] **Step 2: Validate generated map syntax (allowlist set)**

Run:
```bash
docker run --rm -e OPENCONCHO_UPSTREAM_ALLOWLIST="honcho.example.net,*.honcho.dev" \
  -e HONCHO_UPSTREAM=http://x:8000 -v "$PWD/docker":/d nginxinc/nginx-unprivileged:stable sh -c '
  mkdir -p /etc/nginx/conf.d
  export OPENCONCHO_DEFAULT_HONCHO_URL=https://honcho.example.net
  sh /d/40-openconcho-config.sh || true
  envsubst "\$HONCHO_UPSTREAM" < /d/nginx.conf.template > /etc/nginx/conf.d/default.conf
  nginx -t && cat /etc/nginx/conf.d/allowlist_map.conf'
```
Expected: `nginx -t` success; printed map contains regex lines for both hosts.
Note: the script writes `config.js` to `/usr/share/nginx/html`; if that dir is absent in this bare check, the heredoc line may error — that is fine for syntax validation (the `|| true` guards it). The allowlist block still runs.

- [ ] **Step 3: Commit**

```bash
git add docker/40-openconcho-config.sh
git commit -m "feat(docker): render SSRF allowlist map from env"
```

---

## Task 8: Vite dev proxy middleware (dev/CI parity)

**Files:**
- Modify: `packages/web/vite.config.ts`

- [ ] **Step 1: Add a `configureServer` plugin mirroring nginx**

In `packages/web/vite.config.ts`, add this plugin factory above `defineConfig` and include `honchoApiProxy()` in the `plugins` array (after `react()`):
```ts
import type { Plugin } from "vite";

function honchoApiProxy(): Plugin {
	const HEADER = "x-honcho-upstream";
	return {
		name: "honcho-api-proxy",
		configureServer(server) {
			server.middlewares.use("/api", async (req, res) => {
				const upstream = req.headers[HEADER];
				if (typeof upstream !== "string" || upstream.trim() === "") {
					res.statusCode = 421;
					res.setHeader("X-Honcho-Proxy-Reject", "no-upstream");
					res.end();
					return;
				}
				const target = upstream.replace(/\/+$/, "") + (req.url ?? "");
				const chunks: Buffer[] = [];
				for await (const c of req) chunks.push(c as Buffer);
				try {
					const upstreamRes = await fetch(target, {
						method: req.method,
						headers: {
							"content-type": req.headers["content-type"] ?? "application/json",
							...(req.headers.authorization
								? { authorization: req.headers.authorization }
								: {}),
						},
						body: ["GET", "HEAD"].includes(req.method ?? "") ? undefined : Buffer.concat(chunks),
					});
					res.statusCode = upstreamRes.status;
					upstreamRes.headers.forEach((v, k) => res.setHeader(k, v));
					res.end(Buffer.from(await upstreamRes.arrayBuffer()));
				} catch (e) {
					res.statusCode = 502;
					res.end(`proxy error: ${e instanceof Error ? e.message : String(e)}`);
				}
			});
		},
	};
}
```
Update the plugins line to:
```ts
	plugins: [tanstackRouter({ autoCodeSplitting: true }), react(), honchoApiProxy(), tailwindcss()],
```

- [ ] **Step 2: Typecheck + lint (the config is type-checked by the build)**

Run: `make typecheck && make lint`
Expected: PASS (no `any`, `Plugin` typed).

- [ ] **Step 3: Commit**

```bash
git add packages/web/vite.config.ts
git commit -m "feat(web): dev /api proxy middleware mirroring nginx"
```

---

## Task 9: Compose env + docs

**Files:**
- Modify: `docker-compose.yml`, `AGENTS.md`, `README.md`

- [ ] **Step 1: Update `docker-compose.yml`**

Replace the `environment:` block and its comments so the upstream is no longer a single env var. New `environment:` section:
```yaml
    environment:
      # The SPA seeds its first instance from this absolute URL; the browser then
      # routes all calls same-origin through /api, and nginx forwards them to the
      # URL named per-request in the X-Honcho-Upstream header (no browser CORS).
      OPENCONCHO_DEFAULT_HONCHO_URL: ${OPENCONCHO_DEFAULT_HONCHO_URL:-http://host.docker.internal:8000}
      # Optional SSRF guard. Unset = forward anywhere (safe for the localhost-only
      # binding below). Set comma-separated host globs before exposing the proxy:
      #   OPENCONCHO_UPSTREAM_ALLOWLIST: honcho.example.net,*.honcho.dev
      OPENCONCHO_UPSTREAM_ALLOWLIST: ${OPENCONCHO_UPSTREAM_ALLOWLIST:-}
```
Update the top-of-file comment block: replace the `HONCHO_UPSTREAM=...` example with `OPENCONCHO_DEFAULT_HONCHO_URL=https://honcho.example.net docker compose up` and note the per-request header model.

- [ ] **Step 2: Update `AGENTS.md` Key Constraints**

Replace the CORS-relevant bullet(s) with:
```markdown
- **Web CORS is handled by a same-origin `/api` proxy** — the browser issues all
  Honcho calls to `/api/*` with an `X-Honcho-Upstream` header; nginx (docker) and a
  Vite middleware (dev) forward server-side. Tauri bypasses CORS via reqwest and uses
  absolute URLs. Optional `OPENCONCHO_UPSTREAM_ALLOWLIST` guards the proxy when exposed.
```

- [ ] **Step 3: Update `README.md`**

In the Docker/run section, document `OPENCONCHO_DEFAULT_HONCHO_URL` (absolute URL seed) and `OPENCONCHO_UPSTREAM_ALLOWLIST` (optional, comma-separated host globs), and remove any `HONCHO_UPSTREAM` references.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml AGENTS.md README.md
git commit -m "docs: document the /api proxy contract and env vars"
```

---

## Task 10: Final CI-parity gate + branch readiness

**Files:** none (verification only)

- [ ] **Step 1: Run the full web gate**

Run: `make ci-web`
Expected: lint, typecheck, test, and build all PASS.

- [ ] **Step 2: Confirm no `HONCHO_UPSTREAM` or `same-origin` references remain**

Run: `grep -rn "HONCHO_UPSTREAM\|same-origin" docker docker-compose.yml packages/web/src README.md AGENTS.md`
Expected: no matches in code/config (only the spec/plan under `docs/` may mention them historically).

- [ ] **Step 3: Confirm clean tree**

Run: `git status --short`
Expected: empty (all work committed).

---

## Self-Review (completed by author)

- **Spec coverage:** dispatch helper (T2/T3), checkConnection+discovery (T4), nginx header proxy + SNI + reject header (T6), allowlist map (T7), vite parity (T8), env migration + docs (T9), Fleet preserved (T3 — scopedClient routed; existing fleet.test.tsx asserted green), runtime sentinel drop (T5). All spec sections mapped.
- **Placeholder scan:** none — every code step shows full content.
- **Type consistency:** `dispatchFor`, `Dispatch`, `API_PREFIX`, `UPSTREAM_HEADER`, `PROXY_REJECT_HEADER` are defined in T2 and consumed verbatim in T3/T4. `isTauri()` defined T1, consumed T2.
