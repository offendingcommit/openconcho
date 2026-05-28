import { httpFetch } from "@/lib/http";

export interface DiscoveredInstance {
	port: number;
	base_url: string;
}

export function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Probe localhost ports for running Honcho instances. Desktop-only — the web
 * build can't port-scan due to CORS, so this returns an empty list when not
 * running inside Tauri.
 */
export async function discoverHonchoInstances(): Promise<DiscoveredInstance[]> {
	if (!isTauri()) return [];
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<DiscoveredInstance[]>("discover_honcho_instances");
}

/**
 * Derive a friendly agent name from a workspace ID. Honcho workspaces follow
 * the convention `<agent>-<camp>` (e.g. "neo-personal", "jeeves-codewalnut"),
 * so we take the prefix and capitalize it. Falls back to the full ID if no
 * hyphen is present.
 */
export function deriveNameFromWorkspaceId(workspaceId: string): string {
	const first = workspaceId.split("-")[0] || workspaceId;
	return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Probe a discovered instance for its first workspace and derive a suggested
 * name from it. Returns `null` if the instance has no workspaces or the
 * request fails.
 */
export async function suggestNameForInstance(baseUrl: string): Promise<string | null> {
	try {
		const res = await httpFetch(`${baseUrl}/v3/workspaces/list?page=1&page_size=1`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
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
