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
