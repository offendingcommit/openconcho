export const QK = {
	workspaces: (page: number, size: number) => ["workspaces", page, size] as const,
	workspace: (id: string) => ["workspace", id] as const,
	queueStatus: (wsId: string) => ["queue-status", wsId] as const,
	workspaceSearch: (wsId: string, q: string) => ["workspace-search", wsId, q] as const,

	peers: (wsId: string, page: number, size: number) => ["peers", wsId, page, size] as const,
	peer: (wsId: string, pId: string) => ["peer", wsId, pId] as const,
	peerRepresentation: (wsId: string, pId: string, target?: string) =>
		["peer-representation", wsId, pId, target] as const,
	peerCard: (wsId: string, pId: string) => ["peer-card", wsId, pId] as const,
	peerContext: (wsId: string, pId: string) => ["peer-context", wsId, pId] as const,
	peerSessions: (wsId: string, pId: string, page: number, size: number) =>
		["peer-sessions", wsId, pId, page, size] as const,

	sessions: (wsId: string, page: number, size: number) => ["sessions", wsId, page, size] as const,
	session: (wsId: string, sId: string) => ["session", wsId, sId] as const,
	sessionMessages: (wsId: string, sId: string, page: number, size: number) =>
		["session-messages", wsId, sId, page, size] as const,
	sessionSummaries: (wsId: string, sId: string) => ["session-summaries", wsId, sId] as const,
	sessionContext: (wsId: string, sId: string) => ["session-context", wsId, sId] as const,
	sessionPeers: (wsId: string, sId: string) => ["session-peers", wsId, sId] as const,
	peerConfig: (wsId: string, sId: string, pId: string) => ["peer-config", wsId, sId, pId] as const,

	conclusions: (
		wsId: string,
		filters: Record<string, unknown>,
		page: number,
		size: number,
		reverse?: boolean,
	) => ["conclusions", wsId, filters, page, size, reverse] as const,
	conclusionsQuery: (wsId: string, q: string, filters: Record<string, unknown>) =>
		["conclusions-query", wsId, q, filters] as const,

	dreams: (wsId: string, filters: Record<string, unknown>, limit: number) =>
		["dreams", wsId, filters, limit] as const,

	webhooks: (wsId: string) => ["webhooks", wsId] as const,
};
