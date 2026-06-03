import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import type { Instance } from "@/lib/config";
import { saveStore } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

// One mocked transport for every scoped call; branch by URL so the per-workspace
// fan-out (workspaces list → queue status + conclusions count) all resolve.
vi.mock("@/lib/http", () => ({
	httpFetch: vi.fn(async (input: Request | string) => {
		const url = typeof input === "string" ? input : input.url;
		const json = (body: unknown) =>
			new Response(JSON.stringify(body), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		if (url.includes("/queue/status")) {
			return json({
				in_progress_work_units: 0,
				pending_work_units: 0,
				completed_work_units: 0,
				total_work_units: 0,
			});
		}
		if (url.includes("/conclusions/list")) {
			return json({ items: [], total: 5, page: 1, size: 1, pages: 1 });
		}
		return json({ items: [{ id: "ws-1" }], total: 1, page: 1, size: 100, pages: 1 });
	}),
}));

const neo: Instance = { id: "neo", name: "Neo", baseUrl: "https://neo.example.net", token: "" };
const iris: Instance = { id: "iris", name: "Iris", baseUrl: "https://iris.example.net", token: "" };

function renderDashboard() {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
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

describe("Dashboard — unified server-aware view", () => {
	afterEach(() => localStorage.clear());

	it("lists each server's workspaces labelled with the server name", async () => {
		saveStore({ instances: [neo, iris], activeId: "neo" });
		renderDashboard();
		await waitFor(() => {
			expect(screen.getByText("(Neo)")).toBeInTheDocument();
			expect(screen.getByText("(Iris)")).toBeInTheDocument();
		});
	});

	it("offers a server filter listing every server", async () => {
		saveStore({ instances: [neo, iris], activeId: "neo" });
		renderDashboard();
		const select = await screen.findByLabelText("Filter by server");
		expect(within(select).getByRole("option", { name: "Neo" })).toBeInTheDocument();
		expect(within(select).getByRole("option", { name: "Iris" })).toBeInTheDocument();
	});

	it("narrows to a single server when filtered", async () => {
		saveStore({ instances: [neo, iris], activeId: "neo" });
		renderDashboard();
		await screen.findByText("(Iris)");
		const select = await screen.findByLabelText("Filter by server");
		fireEvent.change(select, { target: { value: "iris" } });
		await waitFor(() => {
			expect(screen.queryByText("(Neo)")).not.toBeInTheDocument();
			expect(screen.getByText("(Iris)")).toBeInTheDocument();
		});
	});
});
