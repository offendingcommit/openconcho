import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConclusionTargetPeers } from "@/api/queries";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/api/client", () => ({
	client: { current: { POST: post } },
}));
vi.mock("@/api/scopedClient", () => ({ createScopedClient: vi.fn() }));

function wrap(qc: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
}

type ListResponse = {
	items: Array<{ observer_id: string | null; observed_id: string | null }>;
	pages: number;
};

function listPage(items: ListResponse["items"], pages: number): ListResponse {
	return { items, pages };
}

function conclusion(observer: string | null, observed: string | null) {
	return { observer_id: observer, observed_id: observed };
}

beforeEach(() => {
	post.mockReset();
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

describe("useConclusionTargetPeers", () => {
	it("collects distinct observed targets with row counts from a complete walk", async () => {
		post
			.mockResolvedValueOnce({
				data: listPage(
					[
						conclusion("observer-a", "target-1"),
						conclusion("observer-a", "target-1"),
						conclusion("observer-a", "target-2"),
					],
					1,
				),
			})
			.mockResolvedValue({ data: listPage([], 1) });

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data).toEqual({
			targets: [
				{ id: "target-1", count: 2 },
				{ id: "target-2", count: 1 },
			],
			complete: true,
		});
	});

	it("walks multiple pages until the last page and reports complete", async () => {
		post
			.mockResolvedValueOnce({
				data: listPage([conclusion("observer-a", "target-1")], 2),
			})
			.mockResolvedValueOnce({
				data: listPage([conclusion("observer-a", "target-2")], 2),
			})
			.mockResolvedValue({ data: listPage([], 2) });

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data?.complete).toBe(true);
		expect(result.current.data?.targets).toHaveLength(2);
	});

	it("reports complete=false when the store exceeds the page cap", async () => {
		// Every page reports more pages ahead; the walk must stop at the cap
		// and must NOT report the truncated result as complete.
		post.mockImplementation(async (_url: string, opts: { params: { query: { page: number } } }) => {
			const page = opts.params.query.page;
			if (page <= 40) {
				return { data: listPage([conclusion("observer-a", "target-1")], page + 1) };
			}
			throw new Error("walk should have stopped at the page cap");
		});

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data?.complete).toBe(false);
		expect(result.current.data?.targets).toHaveLength(1);
		expect(post).toHaveBeenCalledTimes(40);
	});

	it("reports complete=false at the page-41 boundary (pages == cap + 1)", async () => {
		// Regression: with the server reporting exactly MAX_PAGES + 1 pages, the
		// walk exits the loop with page === MAX_PAGES + 1. Recomputing
		// completeness as `page >= pages` after the loop compared 41 >= 41 and
		// wrongly reported a cap-truncated walk as complete. Completeness must
		// come from the break reason (normal page exhaustion) instead.
		post.mockImplementation(async () => ({
			data: listPage([conclusion("observer-a", "target-1")], 41),
		}));

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data?.complete).toBe(false);
		expect(post).toHaveBeenCalledTimes(40);
	});

	it("reports complete=true when the last walked page is exactly the reported page count", async () => {
		// pages == cap: the walk finishes on the final allowed page and the
		// result is genuinely complete (regression for the off-by-one where a
		// cap-truncated walk compared page > pages after the loop).
		let page = 0;
		post.mockImplementation(async () => {
			page += 1;
			return { data: listPage([conclusion("observer-a", "target-1")], 40) };
		});

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(page).toBe(40);
		expect(result.current.data?.complete).toBe(true);
	});

	it("surfaces errors instead of swallowing them", async () => {
		post.mockResolvedValue({ error: { message: "boom" } });

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.error).toBeTruthy());
	});

	it("returns an empty complete target list for an observer with no conclusions", async () => {
		post.mockResolvedValue({ data: listPage([], 1) });

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data).toEqual({ targets: [], complete: true });
	});

	it("sorts targets by descending count, then id", async () => {
		post
			.mockResolvedValueOnce({
				data: listPage(
					[
						conclusion("observer-a", "b-target"),
						conclusion("observer-a", "a-target"),
						conclusion("observer-a", "a-target"),
					],
					1,
				),
			})
			.mockResolvedValue({ data: listPage([], 1) });

		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useConclusionTargetPeers("ws", "observer-a"), {
			wrapper: wrap(qc),
		});

		await waitFor(() => expect(result.current.data).toBeDefined());
		expect(result.current.data?.targets.map((t) => t.id)).toEqual(["a-target", "b-target"]);
	});
});
