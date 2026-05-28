const GLOBAL_KEY = "__OPENCONCHO_DEFAULT_HONCHO_URL__";
const SAME_ORIGIN = "same-origin";

/**
 * Runtime-injected default Honcho base URL for container deployments.
 *
 * The Docker image writes `/config.js` from the `OPENCONCHO_DEFAULT_HONCHO_URL`
 * env at container start, so one prebuilt image can target any backend without
 * a rebuild (Vite envs are baked at build time and can't do this).
 *
 * - `"same-origin"` → the page's own origin (pairs with the nginx `/v3` reverse
 *   proxy, so the browser makes same-origin requests and CORS never applies)
 * - an absolute URL → that URL
 * - empty / unset → `null` (no default; the user configures in Settings)
 */
export function runtimeDefaultBaseUrl(): string | null {
	const raw = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
	if (typeof raw !== "string" || raw.trim() === "") return null;
	const value = raw.trim();
	if (value === SAME_ORIGIN) {
		return typeof location !== "undefined" ? location.origin : null;
	}
	return value;
}
