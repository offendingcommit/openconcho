import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import { saveStore } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

const { httpFetch } = vi.hoisted(() => ({ httpFetch: vi.fn() }));
vi.mock("@/lib/http", () => ({ httpFetch }));

const WORKSPACE_ID = "ws-alpha";
const INSTANCE = {
	id: "inst-1",
	name: "Local",
	baseUrl: "http://localhost:8000",
	token: "",
};

function jsonResponse(body: unknown = { items: [], total: 0, page: 1, size: 1, pages: 0 }) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

function seedApp() {
	saveStore({ instances: [INSTANCE], activeId: INSTANCE.id });
	httpFetch.mockResolvedValue(jsonResponse());
}

function renderAt(initialPath: string) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return {
		router,
		...render(
			<QueryClientProvider client={qc}>
				<DemoProvider>
					<MetadataProvider>
						{/* biome-ignore lint/suspicious/noExplicitAny: test router type */}
						<RouterProvider router={router as any} />
					</MetadataProvider>
				</DemoProvider>
			</QueryClientProvider>,
		),
	};
}

function sidebarWorkspaceLink() {
	return within(screen.getByRole("complementary")).getByRole("link", {
		name: /workspace overview/i,
	});
}

describe("sidebar workspace overview link", () => {
	afterEach(() => {
		httpFetch.mockReset();
		localStorage.clear();
	});

	it("exposes the workspace label as a link from a nested workspace page", async () => {
		seedApp();
		renderAt(`/workspaces/${WORKSPACE_ID}/peers`);
		await screen.findByRole("heading", { name: "Peers" });
		expect(sidebarWorkspaceLink()).toHaveAttribute("href", `/workspaces/${WORKSPACE_ID}`);
	});

	it("navigates to the workspace overview when the sidebar label is activated", async () => {
		const user = userEvent.setup();
		seedApp();
		renderAt(`/workspaces/${WORKSPACE_ID}/peers`);
		await user.click(await screen.findByRole("link", { name: /workspace overview/i }));
		expect(await screen.findByText("Workspace overview")).toBeInTheDocument();
	});

	it("keeps the real workspace id in the link href when demo mode is on", async () => {
		localStorage.setItem("openconcho:demo", "true");
		seedApp();
		renderAt(`/workspaces/${WORKSPACE_ID}/peers`);
		expect(await screen.findByRole("link", { name: /workspace overview/i })).toHaveAttribute(
			"href",
			`/workspaces/${WORKSPACE_ID}`,
		);
	});

	it("masks the visible workspace identifier in demo mode", async () => {
		localStorage.setItem("openconcho:demo", "true");
		seedApp();
		renderAt(`/workspaces/${WORKSPACE_ID}/peers`);
		expect(await screen.findByRole("link", { name: /workspace overview/i })).toHaveTextContent(
			"*".repeat(WORKSPACE_ID.length),
		);
	});

	it("puts the masked identifier in the tooltip, not the raw id, in demo mode", async () => {
		localStorage.setItem("openconcho:demo", "true");
		seedApp();
		renderAt(`/workspaces/${WORKSPACE_ID}/peers`);
		expect(await screen.findByRole("link", { name: /workspace overview/i })).toHaveAttribute(
			"title",
			"*".repeat(WORKSPACE_ID.length),
		);
	});

	it("does not render a workspace overview link outside workspace routes", async () => {
		seedApp();
		renderAt("/");
		await screen.findByRole("link", { name: /dashboard/i });
		expect(
			within(screen.getByRole("complementary")).queryByRole("link", {
				name: /workspace overview/i,
			}),
		).not.toBeInTheDocument();
	});

	it("leaves the Peers contextual nav link working", async () => {
		seedApp();
		renderAt(`/workspaces/${WORKSPACE_ID}/sessions`);
		expect(await screen.findByRole("link", { name: /^peers$/i })).toHaveAttribute(
			"href",
			`/workspaces/${WORKSPACE_ID}/peers`,
		);
	});
});
