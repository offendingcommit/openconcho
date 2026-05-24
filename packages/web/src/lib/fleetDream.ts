import { createScopedClient, type ScopedClient } from "@/api/scopedClient";
import type { Instance } from "@/lib/config";

export interface FleetDreamTarget {
	instance: Instance;
	workspaceId: string;
	peerId: string;
}

export type FleetDreamStatus = "pending" | "running" | "success" | "error";

export interface FleetDreamStepResult extends FleetDreamTarget {
	status: FleetDreamStatus;
	error?: string;
}

const PAGE_SIZE = 100;

/**
 * Resolve every (workspace, peer) target for each instance by paginating both
 * lists. A failure to enumerate one instance does not block others — instead,
 * that instance is omitted from the targets and its error surfaces via
 * onInstanceError so the UI can render it.
 */
export async function planFleetTargets(
	instances: Instance[],
	opts: {
		makeClient?: (instance: Instance) => ScopedClient;
		onInstanceError?: (instance: Instance, error: Error) => void;
	} = {},
): Promise<FleetDreamTarget[]> {
	const makeClient = opts.makeClient ?? createScopedClient;
	const out: FleetDreamTarget[] = [];

	for (const instance of instances) {
		try {
			const client = makeClient(instance);
			for (const workspaceId of await listAll(client, "workspaces", undefined)) {
				for (const peerId of await listAll(client, "peers", workspaceId)) {
					out.push({ instance, workspaceId, peerId });
				}
			}
		} catch (e) {
			opts.onInstanceError?.(instance, e instanceof Error ? e : new Error(String(e)));
		}
	}

	return out;
}

async function listAll(
	client: ScopedClient,
	kind: "workspaces" | "peers",
	workspaceId: string | undefined,
): Promise<string[]> {
	const ids: string[] = [];
	let page = 1;
	while (true) {
		const res =
			kind === "workspaces"
				? await client.POST("/v3/workspaces/list", {
						params: { query: { page, page_size: PAGE_SIZE } },
						body: {},
					})
				: await client.POST("/v3/workspaces/{workspace_id}/peers/list", {
						params: {
							path: { workspace_id: workspaceId as string },
							query: { page, page_size: PAGE_SIZE },
						},
						body: {},
					});
		if (res.error) throw new Error(JSON.stringify(res.error));
		const data = res.data as { items?: Array<{ id: string }>; pages?: number } | undefined;
		for (const item of data?.items ?? []) ids.push(item.id);
		const pages = data?.pages ?? 1;
		if (page >= pages) break;
		page += 1;
	}
	return ids;
}

/**
 * Fire schedule_dream for every target sequentially. Returns one result per
 * target so the UI can render per-step status. Each request is scoped to its
 * instance's baseUrl via makeClient.
 */
export async function fanOutDreams(
	targets: FleetDreamTarget[],
	opts: {
		makeClient?: (instance: Instance) => ScopedClient;
		onProgress?: (result: FleetDreamStepResult, index: number) => void;
	} = {},
): Promise<FleetDreamStepResult[]> {
	const makeClient = opts.makeClient ?? createScopedClient;
	const results: FleetDreamStepResult[] = [];

	for (let i = 0; i < targets.length; i++) {
		const target = targets[i];
		opts.onProgress?.({ ...target, status: "running" }, i);
		try {
			const client = makeClient(target.instance);
			const { error } = await client.POST("/v3/workspaces/{workspace_id}/schedule_dream", {
				params: { path: { workspace_id: target.workspaceId } },
				body: {
					observer: target.peerId,
					observed: target.peerId,
					dream_type: "omni",
				},
			});
			if (error) throw new Error(JSON.stringify(error));
			const ok: FleetDreamStepResult = { ...target, status: "success" };
			results.push(ok);
			opts.onProgress?.(ok, i);
		} catch (e) {
			const err: FleetDreamStepResult = {
				...target,
				status: "error",
				error: e instanceof Error ? e.message : String(e),
			};
			results.push(err);
			opts.onProgress?.(err, i);
		}
	}

	return results;
}

export interface FleetInstanceSummary {
	instanceId: string;
	instanceName: string;
	total: number;
	success: number;
	failed: number;
}

export function summarizeByInstance(
	results: FleetDreamStepResult[],
): Map<string, FleetInstanceSummary> {
	const acc = new Map<string, FleetInstanceSummary>();
	for (const r of results) {
		const entry = acc.get(r.instance.id) ?? {
			instanceId: r.instance.id,
			instanceName: r.instance.name,
			total: 0,
			success: 0,
			failed: 0,
		};
		entry.total += 1;
		if (r.status === "success") entry.success += 1;
		else if (r.status === "error") entry.failed += 1;
		acc.set(r.instance.id, entry);
	}
	return acc;
}
