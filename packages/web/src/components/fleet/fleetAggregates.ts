export type FleetHealth = "ok" | "unreachable" | "loading";

export interface FleetRowMetrics {
	workspaceCount: number;
	conclusionCount: number;
	queueActive: number;
	queuePending: number;
	lastSeen: number | null;
	health: FleetHealth;
}

export interface FleetAggregates {
	totalInstances: number;
	totalWorkspaces: number;
	totalConclusions: number;
	totalQueueActive: number;
	totalQueuePending: number;
	healthyCount: number;
	unreachableCount: number;
	loadingCount: number;
}

export const DEFAULT_ROW_METRICS: FleetRowMetrics = {
	workspaceCount: 0,
	conclusionCount: 0,
	queueActive: 0,
	queuePending: 0,
	lastSeen: null,
	health: "loading",
};

export function computeFleetAggregates(rows: FleetRowMetrics[]): FleetAggregates {
	return {
		totalInstances: rows.length,
		totalWorkspaces: rows.reduce((s, r) => s + r.workspaceCount, 0),
		totalConclusions: rows.reduce((s, r) => s + r.conclusionCount, 0),
		totalQueueActive: rows.reduce((s, r) => s + r.queueActive, 0),
		totalQueuePending: rows.reduce((s, r) => s + r.queuePending, 0),
		healthyCount: rows.filter((r) => r.health === "ok").length,
		unreachableCount: rows.filter((r) => r.health === "unreachable").length,
		loadingCount: rows.filter((r) => r.health === "loading").length,
	};
}
