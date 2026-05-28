import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";
import { QK } from "./keys";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function err(e: unknown): never {
	throw new Error(typeof e === "object" ? JSON.stringify(e) : String(e));
}

// ─── Workspaces ──────────────────────────────────────────────────────────────

export function useWorkspaces(page = 1, pageSize = 20) {
	return useQuery({
		queryKey: QK.workspaces(page, pageSize),
		queryFn: async () => {
			const { data, error } = await client.current.POST("/v3/workspaces/list", {
				params: { query: { page, page_size: pageSize } },
				body: {},
			});
			return data ?? err(error);
		},
	});
}

export function useWorkspace(workspaceId: string) {
	return useQuery({
		queryKey: QK.workspace(workspaceId),
		queryFn: async () => {
			const { data, error } = await client.current.POST("/v3/workspaces", {
				body: { id: workspaceId, metadata: {} },
			});
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
	});
}

export function useUpdateWorkspace(workspaceId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (body: { metadata?: Record<string, unknown> }) => {
			const { data, error } = await client.current.PUT("/v3/workspaces/{workspace_id}", {
				params: { path: { workspace_id: workspaceId } },
				body,
			});
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["workspace", workspaceId] });
			qc.invalidateQueries({ queryKey: ["workspaces"] });
		},
	});
}

export function useDeleteWorkspace() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (workspaceId: string) => {
			const { error } = await client.current.DELETE("/v3/workspaces/{workspace_id}", {
				params: { path: { workspace_id: workspaceId } },
			});
			if (error) err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["workspaces"] });
		},
	});
}

export function useScheduleDream(workspaceId: string) {
	return useMutation({
		mutationFn: async (body: {
			observer: string;
			observed?: string | null;
			dream_type: "omni";
			session_id?: string | null;
		}) => {
			const { error } = await client.current.POST("/v3/workspaces/{workspace_id}/schedule_dream", {
				params: { path: { workspace_id: workspaceId } },
				body,
			});
			if (error) err(error);
		},
	});
}

import type { components } from "./schema.d.ts";

type QueueStatusBody = components["schemas"]["QueueStatus"];

// Poll faster while work is in flight so users can watch dreams/representations
// progress; back off to a slow heartbeat when idle. The TanStack Query callback
// form re-reads the cached value each cycle, so the interval adapts on its own.
export const QUEUE_REFETCH_ACTIVE_MS = 2500;
export const QUEUE_REFETCH_IDLE_MS = 10_000;

export function pickQueueRefetchInterval(data: QueueStatusBody | undefined): number {
	if (!data) return QUEUE_REFETCH_IDLE_MS;
	const active = (data.in_progress_work_units ?? 0) + (data.pending_work_units ?? 0);
	return active > 0 ? QUEUE_REFETCH_ACTIVE_MS : QUEUE_REFETCH_IDLE_MS;
}

export function useQueueStatus(workspaceId: string) {
	return useQuery({
		queryKey: QK.queueStatus(workspaceId),
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/queue/status",
				{ params: { path: { workspace_id: workspaceId } } },
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
		refetchInterval: (query) => pickQueueRefetchInterval(query.state.data),
	});
}

export function useSearchWorkspace(workspaceId: string, query: string, enabled = false) {
	return useQuery({
		queryKey: QK.workspaceSearch(workspaceId, query),
		queryFn: async () => {
			const { data, error } = await client.current.POST("/v3/workspaces/{workspace_id}/search", {
				params: { path: { workspace_id: workspaceId } },
				body: { query, limit: 20 },
			});
			return data ?? err(error);
		},
		enabled: enabled && Boolean(workspaceId) && Boolean(query),
	});
}

// ─── Peers ────────────────────────────────────────────────────────────────────

export function usePeers(workspaceId: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: QK.peers(workspaceId, page, pageSize),
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/list",
				{
					params: { path: { workspace_id: workspaceId }, query: { page, page_size: pageSize } },
					body: {},
				},
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
	});
}

export function usePeer(workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: QK.peer(workspaceId, peerId),
		queryFn: async () => {
			const { data, error } = await client.current.POST("/v3/workspaces/{workspace_id}/peers", {
				params: { path: { workspace_id: workspaceId } },
				body: { id: peerId, metadata: {} },
			});
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function useUpdatePeer(workspaceId: string, peerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (body: { metadata?: Record<string, unknown> }) => {
			const { data, error } = await client.current.PUT(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}",
				{ params: { path: { workspace_id: workspaceId, peer_id: peerId } }, body },
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["peer", workspaceId, peerId] });
			qc.invalidateQueries({ queryKey: ["peers", workspaceId] });
		},
	});
}

export function usePeerRepresentation(workspaceId: string, peerId: string, target?: string) {
	return useQuery({
		queryKey: QK.peerRepresentation(workspaceId, peerId, target),
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/representation",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { max_conclusions: 20, ...(target ? { target } : {}) },
				},
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function usePeerCard(workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: QK.peerCard(workspaceId, peerId),
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/card",
				{ params: { path: { workspace_id: workspaceId, peer_id: peerId } } },
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function useSetPeerCard(workspaceId: string, peerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (peerCard: string[]) => {
			const { data, error } = await client.current.PUT(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/card",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { peer_card: peerCard },
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.peerCard(workspaceId, peerId) });
		},
	});
}

export function usePeerContext(workspaceId: string, peerId: string) {
	return useQuery({
		queryKey: QK.peerContext(workspaceId, peerId),
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/context",
				{ params: { path: { workspace_id: workspaceId, peer_id: peerId } } },
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function usePeerSessions(workspaceId: string, peerId: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: QK.peerSessions(workspaceId, peerId, page, pageSize),
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
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(peerId),
	});
}

export function useSearchPeer(workspaceId: string, peerId: string) {
	return useMutation({
		mutationFn: async (query: string) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/search",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { query, limit: 20 },
				},
			);
			return data ?? err(error);
		},
	});
}

export type ReasoningLevel = "minimal" | "low" | "medium" | "high" | "max";

export const REASONING_LEVELS: readonly ReasoningLevel[] = [
	"minimal",
	"low",
	"medium",
	"high",
	"max",
] as const;

export function useChat(
	workspaceId: string,
	peerId: string,
	reasoningLevel: ReasoningLevel = "low",
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (message: string) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/peers/{peer_id}/chat",
				{
					params: { path: { workspace_id: workspaceId, peer_id: peerId } },
					body: { query: message, stream: false, reasoning_level: reasoningLevel },
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["peer-context", workspaceId, peerId] });
		},
	});
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function useSessions(workspaceId: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: QK.sessions(workspaceId, page, pageSize),
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
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
	});
}

export function useUpdateSession(workspaceId: string, sessionId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (body: { metadata?: Record<string, unknown> }) => {
			const { data, error } = await client.current.PUT(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}",
				{ params: { path: { workspace_id: workspaceId, session_id: sessionId } }, body },
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sessions", workspaceId] });
		},
	});
}

export function useDeleteSession(workspaceId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (sessionId: string) => {
			const { error } = await client.current.DELETE(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}",
				{ params: { path: { workspace_id: workspaceId, session_id: sessionId } } },
			);
			if (error) err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sessions", workspaceId] });
			qc.invalidateQueries({ queryKey: ["peer-sessions", workspaceId] });
		},
	});
}

export function useCloneSession(workspaceId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (sessionId: string) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/clone",
				{ params: { path: { workspace_id: workspaceId, session_id: sessionId } } },
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sessions", workspaceId] });
		},
	});
}

export function useSearchSession(workspaceId: string, sessionId: string) {
	return useMutation({
		mutationFn: async (query: string) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/search",
				{
					params: { path: { workspace_id: workspaceId, session_id: sessionId } },
					body: { query, limit: 20 },
				},
			);
			return data ?? err(error);
		},
	});
}

export function useSessionMessages(
	workspaceId: string,
	sessionId: string,
	page = 1,
	pageSize = 50,
) {
	return useQuery({
		queryKey: QK.sessionMessages(workspaceId, sessionId, page, pageSize),
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
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(sessionId),
	});
}

export function useCreateMessages(workspaceId: string, sessionId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (
			messages: Array<{ content: string; peer_id: string; metadata?: Record<string, unknown> }>,
		) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/messages",
				{
					params: { path: { workspace_id: workspaceId, session_id: sessionId } },
					body: { messages },
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["session-messages", workspaceId, sessionId] });
		},
	});
}

export function useUpdateMessage(workspaceId: string, sessionId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			messageId,
			body,
		}: {
			messageId: string;
			body: { metadata?: Record<string, unknown> };
		}) => {
			const { data, error } = await client.current.PUT(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/messages/{message_id}",
				{
					params: {
						path: {
							workspace_id: workspaceId,
							session_id: sessionId,
							message_id: messageId,
						},
					},
					body,
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["session-messages", workspaceId, sessionId] });
		},
	});
}

// ─── Session ↔ Peer membership ────────────────────────────────────────────────

export function useSessionPeers(workspaceId: string, sessionId: string) {
	return useQuery({
		queryKey: QK.sessionPeers(workspaceId, sessionId),
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/peers",
				{ params: { path: { workspace_id: workspaceId, session_id: sessionId } } },
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(sessionId),
	});
}

type SessionPeerConfigMap = Record<
	string,
	{ observe_me?: boolean | null; observe_others?: boolean | null }
>;

export function useAddPeersToSession(workspaceId: string, sessionId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (peers: SessionPeerConfigMap) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/peers",
				{
					params: { path: { workspace_id: workspaceId, session_id: sessionId } },
					body: peers,
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["session-peers", workspaceId, sessionId] });
			qc.invalidateQueries({ queryKey: ["peer-sessions", workspaceId] });
		},
	});
}

export function useSetSessionPeers(workspaceId: string, sessionId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (peers: SessionPeerConfigMap) => {
			const { data, error } = await client.current.PUT(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/peers",
				{
					params: { path: { workspace_id: workspaceId, session_id: sessionId } },
					body: peers,
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["session-peers", workspaceId, sessionId] });
			qc.invalidateQueries({ queryKey: ["peer-sessions", workspaceId] });
		},
	});
}

export function useRemovePeersFromSession(workspaceId: string, sessionId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (peerIds: string[]) => {
			const { error } = await client.current.DELETE(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/peers",
				{
					params: { path: { workspace_id: workspaceId, session_id: sessionId } },
					body: peerIds,
				},
			);
			if (error) err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["session-peers", workspaceId, sessionId] });
			qc.invalidateQueries({ queryKey: ["peer-sessions", workspaceId] });
		},
	});
}

export function usePeerConfig(workspaceId: string, sessionId: string, peerId: string) {
	return useQuery({
		queryKey: QK.peerConfig(workspaceId, sessionId, peerId),
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/peers/{peer_id}/config",
				{
					params: {
						path: { workspace_id: workspaceId, session_id: sessionId, peer_id: peerId },
					},
				},
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(sessionId) && Boolean(peerId),
	});
}

export function useSetPeerConfig(workspaceId: string, sessionId: string, peerId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (config: Record<string, unknown>) => {
			const { data, error } = await client.current.PUT(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/peers/{peer_id}/config",
				{
					params: {
						path: { workspace_id: workspaceId, session_id: sessionId, peer_id: peerId },
					},
					body: config,
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.peerConfig(workspaceId, sessionId, peerId) });
		},
	});
}

// ─── Session summaries & context ──────────────────────────────────────────────

export function useSessionSummaries(workspaceId: string, sessionId: string) {
	return useQuery({
		queryKey: QK.sessionSummaries(workspaceId, sessionId),
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/summaries",
				{ params: { path: { workspace_id: workspaceId, session_id: sessionId } } },
			);
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId) && Boolean(sessionId),
	});
}

export function useSessionContext(workspaceId: string, sessionId: string) {
	return useQuery({
		queryKey: QK.sessionContext(workspaceId, sessionId),
		queryFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/sessions/{session_id}/context",
				{ params: { path: { workspace_id: workspaceId, session_id: sessionId } } },
			);
			return data ?? err(error);
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
	reverse = false,
) {
	return useQuery({
		queryKey: QK.conclusions(workspaceId, filters, page, pageSize, reverse),
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/conclusions/list",
				{
					params: {
						path: { workspace_id: workspaceId },
						query: { page, page_size: pageSize, reverse },
					},
					body: filters,
				},
			);
			return data ?? err(error);
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
		queryKey: QK.conclusionsQuery(workspaceId, query, filters),
		queryFn: async () => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/conclusions/query",
				{
					params: { path: { workspace_id: workspaceId } },
					body: { query, top_k: 10, ...filters },
				},
			);
			return data ?? err(error);
		},
		enabled: enabled && Boolean(workspaceId) && Boolean(query),
	});
}

export function useCreateConclusion(workspaceId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (conclusion: {
			observer_id: string;
			observed_id: string;
			content: string;
			session_id?: string | null;
		}) => {
			const { data, error } = await client.current.POST(
				"/v3/workspaces/{workspace_id}/conclusions",
				{
					params: { path: { workspace_id: workspaceId } },
					body: { conclusions: [conclusion] },
				},
			);
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["conclusions", workspaceId] });
		},
	});
}

export function useDeleteConclusion(workspaceId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (conclusionId: string) => {
			const { error } = await client.current.DELETE(
				"/v3/workspaces/{workspace_id}/conclusions/{conclusion_id}",
				{
					params: {
						path: { workspace_id: workspaceId, conclusion_id: conclusionId },
					},
				},
			);
			if (error) err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["conclusions", workspaceId] });
			qc.invalidateQueries({ queryKey: ["conclusions-query", workspaceId] });
		},
	});
}

// ─── Dreams ───────────────────────────────────────────────────────────────────
//
// Dreams are synthetic groupings of conclusions: bursts produced by a single
// dream run for one (observer, observed) pair. We fetch a generous batch of
// conclusions and let the UI cluster them via `clusterConclusionsIntoDreams`.

const DREAM_FETCH_PAGE_SIZE = 100;
const DREAM_MAX_PAGES = 4;

export function useDreams(
	workspaceId: string,
	filters: Record<string, unknown> = {},
	limit = DREAM_FETCH_PAGE_SIZE * DREAM_MAX_PAGES,
) {
	return useQuery({
		queryKey: QK.dreams(workspaceId, filters, limit),
		queryFn: async () => {
			const collected: unknown[] = [];
			const pageSize = Math.min(DREAM_FETCH_PAGE_SIZE, limit);
			let page = 1;
			while (collected.length < limit) {
				const { data, error } = await client.current.POST(
					"/v3/workspaces/{workspace_id}/conclusions/list",
					{
						params: {
							path: { workspace_id: workspaceId },
							query: { page, page_size: pageSize, reverse: false },
						},
						body: filters,
					},
				);
				if (error) err(error);
				const items = (data as { items?: unknown[] } | undefined)?.items ?? [];
				const totalPages = (data as { pages?: number } | undefined)?.pages ?? 1;
				collected.push(...items);
				if (items.length === 0 || page >= totalPages || page >= DREAM_MAX_PAGES) break;
				page++;
			}
			return collected.slice(0, limit);
		},
		enabled: Boolean(workspaceId),
	});
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export function useWebhooks(workspaceId: string) {
	return useQuery({
		queryKey: QK.webhooks(workspaceId),
		queryFn: async () => {
			const { data, error } = await client.current.GET("/v3/workspaces/{workspace_id}/webhooks", {
				params: { path: { workspace_id: workspaceId } },
			});
			return data ?? err(error);
		},
		enabled: Boolean(workspaceId),
	});
}

export function useCreateWebhook(workspaceId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (url: string) => {
			const { data, error } = await client.current.POST("/v3/workspaces/{workspace_id}/webhooks", {
				params: { path: { workspace_id: workspaceId } },
				body: { url },
			});
			return data ?? err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.webhooks(workspaceId) });
		},
	});
}

export function useDeleteWebhook(workspaceId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (endpointId: string) => {
			const { error } = await client.current.DELETE(
				"/v3/workspaces/{workspace_id}/webhooks/{endpoint_id}",
				{
					params: {
						path: { workspace_id: workspaceId, endpoint_id: endpointId },
					},
				},
			);
			if (error) err(error);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: QK.webhooks(workspaceId) });
		},
	});
}

export function useTestWebhook(workspaceId: string) {
	return useMutation({
		mutationFn: async () => {
			const { data, error } = await client.current.GET(
				"/v3/workspaces/{workspace_id}/webhooks/test",
				{ params: { path: { workspace_id: workspaceId } } },
			);
			return data ?? err(error);
		},
	});
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

export function useCreateKey() {
	return useMutation({
		mutationFn: async () => {
			const { data, error } = await client.current.POST("/v3/keys", {});
			return data ?? err(error);
		},
	});
}
