import { useQuery } from "@tanstack/react-query";
import type { Instance } from "@/lib/config";
import { createScopedClient } from "./scopedClient";

function err(e: unknown): never {
	throw new Error(typeof e === "object" ? JSON.stringify(e) : String(e));
}

// Query keys are scoped by instance.id so caches never collide across columns.
const CK = {
	workspaces: (instId: string, page: number, size: number) =>
		["compare", instId, "workspaces", page, size] as const,
	peers: (instId: string, wsId: string, page: number, size: number) =>
		["compare", instId, "peers", wsId, page, size] as const,
	peerRepresentation: (instId: string, wsId: string, pId: string) =>
		["compare", instId, "peer-representation", wsId, pId] as const,
	peerCard: (instId: string, wsId: string, pId: string) =>
		["compare", instId, "peer-card", wsId, pId] as const,
	queueStatus: (instId: string, wsId: string) => ["compare", instId, "queue-status", wsId] as const,
	conclusionsCount: (instId: string, wsId: string) =>
		["compare", instId, "conclusions-count", wsId] as const,
};

export function useScopedWorkspaces(instance: Instance, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: CK.workspaces(instance.id, page, pageSize),
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.POST("/v3/workspaces/list", {
				params: { query: { page, page_size: pageSize } },
				body: {},
			});
			return data ?? err(error);
		},
	});
}

export function useScopedPeers(instance: Instance, workspaceId: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: CK.peers(instance.id, workspaceId, page, pageSize),
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.POST("/v3/workspaces/{workspace_id}/peers/list", {
				params: { path: { workspace_id: workspaceId }, query: { page, page_size: pageSize } },
				body: {},
			});
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
	});
}

export function useScopedPeerRepresentation(
	instance: Instance,
	workspaceId: string,
	peerId: string,
) {
	return useQuery({
		queryKey: CK.peerRepresentation(instance.id, workspaceId, peerId),
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/representation",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { max_conclusions: 20 },
				},
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function useScopedPeerCard(instance: Instance, workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: CK.peerCard(instance.id, workspaceId, peerId),
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.GET(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/card",
				{ params: { path: { workspace_id: workspaceId, peer_id: peerId } } },
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

// Option builders — used by both single-fetch hooks and useQueries fan-out (e.g. Fleet view).

export function scopedQueueStatusOptions(instance: Instance, workspaceId: string) {
	return {
		queryKey: CK.queueStatus(instance.id, workspaceId),
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.GET("/v3/workspaces/{workspace_id}/queue/status", {
				params: { path: { workspace_id: workspaceId } },
			});
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
		refetchInterval: 10_000,
	} as const;
}

export function scopedConclusionsCountOptions(instance: Instance, workspaceId: string) {
	return {
		queryKey: CK.conclusionsCount(instance.id, workspaceId),
		queryFn: async () => {
			const client = createScopedClient(instance);
			const { data, error } = await client.POST("/v3/workspaces/{workspace_id}/conclusions/list", {
				params: { path: { workspace_id: workspaceId }, query: { page: 1, size: 1 } },
				body: {},
			});
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
	} as const;
}

export function useScopedQueueStatus(instance: Instance, workspaceId: string) {
	return useQuery(scopedQueueStatusOptions(instance, workspaceId));
}

export function useScopedConclusionsCount(instance: Instance, workspaceId: string) {
	return useQuery(scopedConclusionsCountOptions(instance, workspaceId));
}
