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
