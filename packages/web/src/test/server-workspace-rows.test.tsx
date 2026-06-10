import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerWorkspaceRows } from "@/components/dashboard/ServerWorkspaceRows";
import type { FleetRowMetrics } from "@/components/fleet/fleetAggregates";
import { DemoProvider } from "@/context/DemoContext";
import type { Instance } from "@/lib/config";

vi.mock("@/lib/http", () => ({
	httpFetch: vi.fn(async (input: Request | string) => {
		const url = typeof input === "string" ? input : input.url;
		const json = (body: unknown) =>
			new Response(JSON.stringify(body), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		if (url.includes("/queue/status")) {
			return json({ in_progress_work_units: 0, pending_work_units: 0 });
		}
		if (url.includes("/conclusions/list")) {
			return json({ items: [], total: 3, page: 1, size: 1, pages: 1 });
		}
		return json({ items: [{ id: "ws-1" }], total: 1, page: 1, size: 100, pages: 1 });
	}),
}));

const neo: Instance = { id: "neo", name: "Neo", baseUrl: "https://neo.example.net", token: "" };

function makeQc() {
	return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function renderRows(instance: Instance, onMetrics: (id: string, metrics: FleetRowMetrics) => void) {
	const qc = makeQc();
	return render(
		<QueryClientProvider client={qc}>
			<DemoProvider>
				<table>
					<tbody>
						<ServerWorkspaceRows
							instance={instance}
							onOpenWorkspace={vi.fn()}
							onMetrics={onMetrics}
						/>
					</tbody>
				</table>
			</DemoProvider>
		</QueryClientProvider>,
	);
}

describe("ServerWorkspaceRows — onMetrics stability", () => {
	afterEach(() => localStorage.clear());

	it("calls onMetrics with health:ok after data loads", async () => {
		const onMetrics = vi.fn<(id: string, m: FleetRowMetrics) => void>();
		renderRows(neo, onMetrics);
		await waitFor(() =>
			expect(onMetrics).toHaveBeenCalledWith(
				"neo",
				expect.objectContaining({ health: "ok", workspaceCount: 1, conclusionCount: 3 }),
			),
		);
	});

	it("does not call onMetrics again when values have not changed", async () => {
		const onMetrics = vi.fn<(id: string, m: FleetRowMetrics) => void>();
		renderRows(neo, onMetrics);

		// Wait until we have at least one call with stable state
		await waitFor(() =>
			expect(onMetrics).toHaveBeenCalledWith("neo", expect.objectContaining({ health: "ok" })),
		);

		const callsBefore = onMetrics.mock.calls.length;

		// Flush any pending micro-tasks / React batched updates
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		// onMetrics must not have been called again — no render loop
		expect(onMetrics).toHaveBeenCalledTimes(callsBefore);
	});

	it("calls onMetrics when health transitions from loading to ok", async () => {
		const onMetrics = vi.fn<(id: string, m: FleetRowMetrics) => void>();
		renderRows(neo, onMetrics);

		// Must eventually report ok (not just loading)
		await waitFor(() =>
			expect(onMetrics).toHaveBeenCalledWith("neo", expect.objectContaining({ health: "ok" })),
		);
	});
});
