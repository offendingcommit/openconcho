import createClient from "openapi-fetch";
import type { Instance } from "@/lib/config";
import { httpFetch } from "@/lib/http";
import type { paths } from "./schema.d.ts";

export type ScopedClient = ReturnType<typeof createClient<paths>>;

/**
 * Create an openapi-fetch client bound to a specific instance. Use for views
 * that need to query non-active instances (e.g. side-by-side comparison).
 * For single-instance access, prefer `client.current` which tracks the active
 * instance via localStorage.
 */
export function createScopedClient(instance: Instance): ScopedClient {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (instance.token) headers.Authorization = `Bearer ${instance.token}`;
	return createClient<paths>({ baseUrl: instance.baseUrl, headers, fetch: httpFetch });
}
