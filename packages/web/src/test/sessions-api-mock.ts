/**
 * Shared mock for the honcho API client used by sessions-sort tests.
 * Simulates POST /v3/workspaces/{id}/sessions/list: global created_at
 * ordering (reverse flag), paginated in 2-per-page slices of a 3-session
 * workspace — i.e. MORE sessions than one page holds.
 */
import { vi } from "vitest";

export type ListCall = { page: number; size?: number; reverse?: boolean | null };

export const listCalls: ListCall[] = [];

export function resetListCalls() {
	listCalls.length = 0;
}

const SESSIONS = [
	{ id: "s-old", created_at: "2026-05-01T00:00:00Z", is_active: true },
	{ id: "s-mid", created_at: "2026-06-01T00:00:00Z", is_active: true },
	{ id: "s-new", created_at: "2026-09-21T09:00:00Z", is_active: true },
];

export const client = {
	get current() {
		return {
			POST: vi.fn(async (_path: string, opts: { params: { query: ListCall } }) => {
				listCalls.push({ ...opts.params.query });
				const ordered = opts.params.query.reverse ? [...SESSIONS].reverse() : SESSIONS;
				const page = opts.params.query.page ?? 1;
				// The component requests pageSize 20; the mock serves 2-per-page
				// slices so a >1-page workspace is exercised (regression guard).
				const size = 2;
				const items = ordered.slice((page - 1) * size, page * size);
				return {
					data: { items, pages: Math.ceil(SESSIONS.length / size), total: SESSIONS.length },
					error: undefined,
				};
			}),
		};
	},
};
