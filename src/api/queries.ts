import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";

// ─── Workspaces ──────────────────────────────────────────────────────────────

export function useWorkspaces(page = 1, pageSize = 20) {
	return useQuery({
		queryKey: ["workspaces", page, pageSize],
		queryFn: async () => {
			const { data, error } = await client.current.POST("/v3/workspaces/list", {
				params: { query: { page, page_size: pageSize } },
				body: {},
			});
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
	});
}

export function useWorkspace(workspaceId: string) {
	return useQuery({
		queryKey: ["workspace", workspaceId],
		queryFn: async () => {
			const { data, error } = await client.current.POST("/v3/workspaces", {
				body: { id: workspaceId, metadata: {} },
			});
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId),
	});
}

export function useQueueStatus(workspaceId: string) {
	return useQuery({
		queryKey: ["queue-status", workspaceId],
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/queue/status",
				{ params: { path: { workspace_id: workspaceId } } },
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId),
		refetchInterval: 10_000,
	});
}

export function useSearchWorkspace(workspaceId: string, query: string, enabled = false) {
	return useQuery({
		queryKey: ["workspace-search", workspaceId, query],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/search",
				{
					params: { path: { workspace_id: workspaceId } },
					body: { query, limit: 20 },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: enabled && Boolean(workspaceId) && Boolean(query),
	});
}

// ─── Peers ────────────────────────────────────────────────────────────────────

export function usePeers(workspaceId: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: ["peers", workspaceId, page, pageSize],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/list",
				{
					params: { path: { workspace_id: workspaceId }, query: { page, page_size: pageSize } },
					body: {},
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId),
	});
}

export function usePeer(workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: ["peer", workspaceId, peerId],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers",
				{
					params: { path: { workspace_id: workspaceId } },
					body: { id: peerId, metadata: {} },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function usePeerRepresentation(workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: ["peer-representation", workspaceId, peerId],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/representation",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { max_conclusions: 20 },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function usePeerCard(workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: ["peer-card", workspaceId, peerId],
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/card",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function usePeerContext(workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: ["peer-context", workspaceId, peerId],
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/context",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function usePeerSessions(workspaceId: string, peerId: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: ["peer-sessions", workspaceId, peerId, page, pageSize],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/sessions",
				{
					params: {
						path: { workspace_id: workspaceId, peer_id: peerId },
						query: { page, page_size: pageSize },
					},
					body: {},
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function useChat(workspaceId: string, peerId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (message: string) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/chat",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { query: message, stream: false, reasoning_level: "low" },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["peer-context", workspaceId, peerId] });
		},
	});
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function useSessions(workspaceId: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: ["sessions", workspaceId, page, pageSize],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/sessions/list",
				{
					params: {
						path: { workspace_id: workspaceId },
						query: { page, page_size: pageSize },
					},
					body: {},
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId),
	});
}

export function useSessionMessages(
	workspaceId: string,
	sessionId: string,
	page = 1,
	pageSize = 50,
) {
	return useQuery({
		queryKey: ["session-messages", workspaceId, sessionId, page, pageSize],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/messages/list",
				{
					params: {
						path: { workspace_id: workspaceId, session_id: sessionId },
						query: { page, page_size: pageSize },
					},
					body: {},
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(sessionId),
	});
}

export function useSessionSummaries(workspaceId: string, sessionId: string) {
	return useQuery({
		queryKey: ["session-summaries", workspaceId, sessionId],
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/summaries",
				{
					params: { path: { workspace_id: workspaceId, session_id: sessionId } },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(sessionId),
	});
}

export function useSessionContext(workspaceId: string, sessionId: string) {
	return useQuery({
		queryKey: ["session-context", workspaceId, sessionId],
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/context",
				{
					params: { path: { workspace_id: workspaceId, session_id: sessionId } },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId) && Boolean(sessionId),
	});
}

// ─── Conclusions ──────────────────────────────────────────────────────────────

export function useConclusions(
	workspaceId: string,
	filters: Record<string, unknown> = {},
	page = 1,
	pageSize = 20,
) {
	return useQuery({
		queryKey: ["conclusions", workspaceId, filters, page, pageSize],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/conclusions/list",
				{
					params: {
						path: { workspace_id: workspaceId },
						query: { page, page_size: pageSize },
					},
					body: filters,
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: Boolean(workspaceId),
	});
}

export function useQueryConclusions(
	workspaceId: string,
	query: string,
	filters: Record<string, unknown> = {},
	enabled = false,
) {
	return useQuery({
		queryKey: ["conclusions-query", workspaceId, query, filters],
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/conclusions/query",
				{
					params: { path: { workspace_id: workspaceId } },
					body: { query, top_k: 10, ...filters },
				},
			);
			if (error) throw new Error(JSON.stringify(error));
			return data;
		},
		enabled: enabled && Boolean(workspaceId) && Boolean(query),
	});
}
