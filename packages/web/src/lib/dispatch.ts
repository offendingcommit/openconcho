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
