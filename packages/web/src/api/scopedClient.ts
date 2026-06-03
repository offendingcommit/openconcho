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
