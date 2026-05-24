import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scopedConclusionsCountOptions, scopedQueueStatusOptions } from "@/api/compareQueries";
import {
	computeFleetAggregates,
	DEFAULT_ROW_METRICS,
	type FleetRowMetrics,
} from "@/components/fleet/fleetAggregates";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import type { Instance } from "@/lib/config";
import { saveStore } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/lib/http", () => ({
	httpFetch: vi.fn(
		async () =>
			new Response(JSON.stringify({ items: [], total: 0, page: 1, size: 1, pages: 0 }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
	),
}));

const neo: Instance = {
	id: "neo",
	name: "Neo",
	baseUrl: "http://localhost:8001",
	token: "neo-token",
};
const iris: Instance = {
	id: "iris",
	name: "Iris",
	baseUrl: "http://localhost:8002",
	token: "iris-token",
};

describe("computeFleetAggregates", () => {
	it("matches snapshot for an empty fleet", () => {
		expect(computeFleetAggregates([])).toMatchInlineSnapshot(`
			{
			  "healthyCount": 0,
			  "loadingCount": 0,
			  "totalConclusions": 0,
			  "totalInstances": 0,
			  "totalQueueActive": 0,
			  "totalQueuePending": 0,
			  "totalWorkspaces": 0,
			  "unreachableCount": 0,
			}
		`);
	});

	it("matches snapshot for a mixed fleet (healthy, loading, unreachable)", () => {
		const rows: FleetRowMetrics[] = [
			{
				workspaceCount: 3,
				conclusionCount: 142,
				queueActive: 2,
				queuePending: 5,
				lastSeen: 1_700_000_000_000,
				health: "ok",
			},
			{
				workspaceCount: 1,
				conclusionCount: 87,
				queueActive: 0,
				queuePending: 0,
				lastSeen: 1_700_000_001_000,
				health: "ok",
			},
			{ ...DEFAULT_ROW_METRICS },
			{
				workspaceCount: 0,
				conclusionCount: 0,
				queueActive: 0,
				queuePending: 0,
				lastSeen: null,
				health: "unreachable",
			},
		];

		expect(computeFleetAggregates(rows)).toMatchInlineSnapshot(`
			{
			  "healthyCount": 2,
			  "loadingCount": 1,
			  "totalConclusions": 229,
			  "totalInstances": 4,
			  "totalQueueActive": 2,
			  "totalQueuePending": 5,
			  "totalWorkspaces": 4,
			  "unreachableCount": 1,
			}
		`);
	});
});

describe("scoped option builders", () => {
	beforeEach(async () => {
		const { httpFetch } = await import("@/lib/http");
		(httpFetch as ReturnType<typeof vi.fn>).mockClear();
	});

	it("scopes queue status requests by instance baseUrl and token", async () => {
		const { httpFetch } = await import("@/lib/http");
		const opts = scopedQueueStatusOptions(neo, "ws-1");
		await opts.queryFn();
		const req = (httpFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Request;
		expect(req.url).toBe("http://localhost:8001/v3/workspaces/ws-1/queue/status");
		expect(req.headers.get("Authorization")).toBe("Bearer neo-token");
	});

	it("scopes conclusions-count requests by instance baseUrl and token", async () => {
		const { httpFetch } = await import("@/lib/http");
		const opts = scopedConclusionsCountOptions(iris, "ws-9");
		await opts.queryFn();
		const req = (httpFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as Request;
		expect(req.url.startsWith("http://localhost:8002/v3/workspaces/ws-9/conclusions/list")).toBe(
			true,
		);
		expect(req.headers.get("Authorization")).toBe("Bearer iris-token");
	});

	it("produces distinct query keys per instance to prevent cache collisions", () => {
		const neoKey = scopedQueueStatusOptions(neo, "ws-shared").queryKey;
		const irisKey = scopedQueueStatusOptions(iris, "ws-shared").queryKey;
		expect(neoKey).not.toEqual(irisKey);
		expect(neoKey).toContain("neo");
		expect(irisKey).toContain("iris");
	});
});

function renderRouteAt(initialPath: string) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={qc}>
			<DemoProvider>
				<MetadataProvider>
					{/* biome-ignore lint/suspicious/noExplicitAny: test router type */}
					<RouterProvider router={router as any} />
				</MetadataProvider>
			</DemoProvider>
		</QueryClientProvider>,
	);
}

describe("Fleet route", () => {
	afterEach(() => {
		localStorage.clear();
	});

	it("mounts FleetDashboard at /fleet when an instance is configured", async () => {
		saveStore({ instances: [neo], activeId: "neo" });
		renderRouteAt("/fleet");
		expect(await screen.findByRole("heading", { name: /Fleet/i })).toBeInTheDocument();
	});

	it("renders one table row per configured instance", async () => {
		saveStore({ instances: [neo, iris], activeId: "neo" });
		renderRouteAt("/fleet");
		const table = await screen.findByRole("table");
		await waitFor(() => {
			expect(within(table).getByText("Neo")).toBeInTheDocument();
			expect(within(table).getByText("Iris")).toBeInTheDocument();
		});
		// 1 header + 2 instance rows
		expect(within(table).getAllByRole("row")).toHaveLength(3);
	});
});
