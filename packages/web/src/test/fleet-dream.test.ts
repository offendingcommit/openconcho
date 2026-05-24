import { describe, expect, it, vi } from "vitest";
import type { ScopedClient } from "@/api/scopedClient";
import type { Instance } from "@/lib/config";
import {
	type FleetDreamTarget,
	fanOutDreams,
	planFleetTargets,
	summarizeByInstance,
} from "@/lib/fleetDream";

function instance(id: string, port: number): Instance {
	return {
		id,
		name: id,
		baseUrl: `http://localhost:${port}`,
		token: `tok-${id}`,
	};
}

/**
 * Build a fake ScopedClient factory that records every call's instance, path,
 * body, and workspace path-param. Returns canned responses for
 * /workspaces/list and /peers/list. The factory closure captures which
 * instance each call was scoped to — that's how we verify per-instance
 * routing without spinning up a real client.
 */
function buildFactory(
	workspacesByInstance: Record<string, string[]>,
	peersByInstance: Record<string, Record<string, string[]>>,
) {
	const calls: Array<{
		instanceId: string;
		path: string;
		body?: unknown;
		workspaceId?: string;
	}> = [];

	const makeClient = (inst: Instance): ScopedClient => {
		const fake = {
			async POST(
				path: string,
				opts: { params?: { path?: { workspace_id?: string } }; body?: unknown },
			) {
				calls.push({
					instanceId: inst.id,
					path,
					body: opts.body,
					workspaceId: opts.params?.path?.workspace_id,
				});
				if (path === "/v3/workspaces/list") {
					const ids = workspacesByInstance[inst.id] ?? [];
					return {
						data: { items: ids.map((id) => ({ id })), pages: 1, total: ids.length },
						error: undefined,
					};
				}
				if (path === "/v3/workspaces/{workspace_id}/peers/list") {
					const wsId = opts.params?.path?.workspace_id as string;
					const ids = peersByInstance[inst.id]?.[wsId] ?? [];
					return {
						data: { items: ids.map((id) => ({ id })), pages: 1, total: ids.length },
						error: undefined,
					};
				}
				if (path === "/v3/workspaces/{workspace_id}/schedule_dream") {
					return { data: undefined, error: undefined };
				}
				return { data: undefined, error: { message: "unhandled path" } };
			},
		};
		return fake as unknown as ScopedClient;
	};

	return { makeClient, calls };
}

describe("planFleetTargets", () => {
	it("fans out to every (instance, workspace, peer) triple", async () => {
		const instances = [instance("neo", 8001), instance("iris", 8002), instance("lexi", 8003)];
		const { makeClient } = buildFactory(
			{ neo: ["ws-a", "ws-b"], iris: ["ws-c"], lexi: ["ws-d", "ws-e"] },
			{
				neo: { "ws-a": ["p1", "p2"], "ws-b": ["p3"] },
				iris: { "ws-c": ["p4", "p5"] },
				lexi: { "ws-d": ["p6"], "ws-e": ["p7", "p8"] },
			},
		);

		const targets = await planFleetTargets(instances, { makeClient });

		// neo: 2+1, iris: 2, lexi: 1+2  →  3 + 2 + 3 = 8 triples
		expect(targets).toHaveLength(8);
	});

	it("isolates failures so one instance's error doesn't drop the others", async () => {
		const instances = [instance("neo", 8001), instance("iris", 8002)];
		const onInstanceError = vi.fn();
		const makeClient = (inst: Instance): ScopedClient => {
			const fake = {
				async POST(path: string) {
					if (inst.id === "neo") throw new Error("network down");
					if (path === "/v3/workspaces/list") {
						return { data: { items: [{ id: "ws-c" }], pages: 1, total: 1 }, error: undefined };
					}
					return { data: { items: [{ id: "p4" }], pages: 1, total: 1 }, error: undefined };
				},
			};
			return fake as unknown as ScopedClient;
		};

		const targets = await planFleetTargets(instances, { makeClient, onInstanceError });

		expect(targets).toEqual([{ instance: instances[1], workspaceId: "ws-c", peerId: "p4" }]);
		expect(onInstanceError).toHaveBeenCalledOnce();
		expect(onInstanceError.mock.calls[0][0]).toBe(instances[0]);
	});
});

describe("fanOutDreams", () => {
	it("routes each request to its target instance's client", async () => {
		const instances = [instance("neo", 8001), instance("iris", 8002)];
		const factory = buildFactory({}, {});
		const targets: FleetDreamTarget[] = [
			{ instance: instances[0], workspaceId: "ws-a", peerId: "p1" },
			{ instance: instances[0], workspaceId: "ws-a", peerId: "p2" },
			{ instance: instances[1], workspaceId: "ws-c", peerId: "p4" },
		];

		await fanOutDreams(targets, { makeClient: factory.makeClient });

		const dreamCalls = factory.calls.filter(
			(c) => c.path === "/v3/workspaces/{workspace_id}/schedule_dream",
		);
		// One request per target — N×M fan-out preserved.
		expect(dreamCalls).toHaveLength(3);

		// Each request routed to the correct instance (verifies baseUrl scoping
		// since the factory closes over inst.baseUrl).
		expect(dreamCalls.map((c) => c.instanceId)).toEqual(["neo", "neo", "iris"]);

		// Each request carries the right workspace path param and observer body.
		expect(dreamCalls.map((c) => c.workspaceId)).toEqual(["ws-a", "ws-a", "ws-c"]);
		expect(dreamCalls.map((c) => (c.body as { observer: string }).observer)).toEqual([
			"p1",
			"p2",
			"p4",
		]);
	});

	it("emits progress for every step and continues past per-step errors", async () => {
		const instances = [instance("neo", 8001), instance("iris", 8002)];
		const targets: FleetDreamTarget[] = [
			{ instance: instances[0], workspaceId: "ws-a", peerId: "p1" },
			{ instance: instances[1], workspaceId: "ws-c", peerId: "p4" },
		];
		const makeClient = (inst: Instance): ScopedClient => {
			const fake = {
				async POST() {
					if (inst.id === "iris") return { data: undefined, error: { message: "boom" } };
					return { data: undefined, error: undefined };
				},
			};
			return fake as unknown as ScopedClient;
		};
		const onProgress = vi.fn();

		const results = await fanOutDreams(targets, { makeClient, onProgress });

		expect(results.map((r) => r.status)).toEqual(["success", "error"]);
		// onProgress fires running+terminal for each step → 4 calls.
		expect(onProgress).toHaveBeenCalledTimes(4);
	});
});

describe("summarizeByInstance", () => {
	it("groups results by instance and counts success/failure", () => {
		const a = instance("neo", 8001);
		const b = instance("iris", 8002);
		const summary = summarizeByInstance([
			{ instance: a, workspaceId: "w", peerId: "p1", status: "success" },
			{ instance: a, workspaceId: "w", peerId: "p2", status: "error", error: "x" },
			{ instance: b, workspaceId: "w", peerId: "p3", status: "success" },
		]);

		expect(summary.get("neo")).toEqual({
			instanceId: "neo",
			instanceName: "neo",
			total: 2,
			success: 1,
			failed: 1,
		});
		expect(summary.get("iris")?.success).toBe(1);
	});
});
