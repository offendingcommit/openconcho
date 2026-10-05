import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import { saveStore } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

const { httpFetch } = vi.hoisted(() => ({ httpFetch: vi.fn() }));
vi.mock("@/lib/http", () => ({ httpFetch }));

const WORKSPACE_ID = "ws-alpha";
const CONFLICT_DETAIL =
	"Cannot delete workspace 'ws-alpha': active session(s) remain. Delete all sessions first.";
const INSTANCE = {
	id: "inst-1",
	name: "Local",
	baseUrl: "http://localhost:8000",
	token: "secret-token",
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function requestOf(input: Request | string, init?: RequestInit) {
	return typeof input === "string" ? new Request(input, init) : input;
}

function mockHoncho(options: { onDelete?: (req: Request) => Promise<Response> | Response } = {}) {
	httpFetch.mockImplementation(async (input: Request | string, init?: RequestInit) => {
		const req = requestOf(input, init);
		const url = req.url;
		if (req.method === "DELETE") {
			return options.onDelete ? options.onDelete(req) : json({}, 202);
		}
		if (url.includes("/queue/status")) {
			return json({
				in_progress_work_units: 0,
				pending_work_units: 0,
				completed_work_units: 0,
				total_work_units: 0,
			});
		}
		if (url.includes("/v3/workspaces") && !url.includes("list")) {
			return json({
				id: WORKSPACE_ID,
				metadata: {},
				created_at: "2026-01-01T00:00:00Z",
			});
		}
		return json({
			items: [{ id: WORKSPACE_ID, created_at: "2026-01-01T00:00:00Z" }],
			total: 1,
			page: 1,
			size: 20,
			pages: 1,
		});
	});
}

function renderWorkspace() {
	saveStore({ instances: [INSTANCE], activeId: INSTANCE.id });
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [`/workspaces/${WORKSPACE_ID}`] }),
	});
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
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

async function confirmDelete() {
	const user = userEvent.setup();
	await user.click(await screen.findByRole("button", { name: "Delete" }));
	const dialog = await screen.findByRole("dialog");
	await user.click(within(dialog).getByRole("button", { name: "Delete workspace" }));
	return { user, dialog };
}

describe("workspace delete errors", () => {
	afterEach(() => {
		httpFetch.mockReset();
		localStorage.clear();
	});

	it("shows the 409 detail after confirming deletion", async () => {
		mockHoncho({
			onDelete: () => json({ detail: CONFLICT_DETAIL }, 409),
		});
		renderWorkspace();
		await confirmDelete();
		expect((await screen.findByRole("alert")).textContent).toBe(CONFLICT_DETAIL);
	});

	it("keeps the confirmation dialog open after a 409", async () => {
		mockHoncho({
			onDelete: () => json({ detail: CONFLICT_DETAIL }, 409),
		});
		renderWorkspace();
		await confirmDelete();
		await screen.findByRole("alert");
		expect(screen.getByRole("dialog")).toHaveAccessibleName("Delete workspace");
	});

	it("leaves the confirm button usable after a failed deletion", async () => {
		mockHoncho({
			onDelete: () => json({ detail: CONFLICT_DETAIL }, 409),
		});
		renderWorkspace();
		const { dialog } = await confirmDelete();
		await screen.findByRole("alert");
		expect(within(dialog).getByRole("button", { name: "Delete workspace" })).toBeEnabled();
	});

	it("retries deletion from the open dialog after a 409", async () => {
		let deletes = 0;
		mockHoncho({
			onDelete: () => {
				deletes += 1;
				return json({ detail: CONFLICT_DETAIL }, 409);
			},
		});
		renderWorkspace();
		const { user, dialog } = await confirmDelete();
		await screen.findByRole("alert");
		await user.click(within(dialog).getByRole("button", { name: "Delete workspace" }));
		await waitFor(() => {
			expect(deletes).toBe(2);
		});
	});

	it("does not keep a stale error after cancel and reopen", async () => {
		mockHoncho({
			onDelete: () => json({ detail: CONFLICT_DETAIL }, 409),
		});
		renderWorkspace();
		const { user, dialog } = await confirmDelete();
		await screen.findByRole("alert");
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
		await user.click(await screen.findByRole("button", { name: "Delete" }));
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("shows a fallback message when deletion fails without an API detail", async () => {
		mockHoncho({
			onDelete: () => Promise.reject(new Error("Network request failed")),
		});
		renderWorkspace();
		await confirmDelete();
		expect((await screen.findByRole("alert")).textContent).toBe("Network request failed");
	});

	it("navigates to the workspace list after a successful deletion", async () => {
		mockHoncho();
		const { router } = renderWorkspace();
		await confirmDelete();
		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/workspaces");
		});
	});

	it("does not render an alert when ConfirmDialog has no error", () => {
		render(
			<ConfirmDialog
				open
				title="Delete webhook"
				description="This endpoint will stop receiving events immediately."
				onConfirm={() => {}}
				onCancel={() => {}}
			/>,
		);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("does not put the instance token in the delete dialog", async () => {
		mockHoncho({
			onDelete: () => json({ detail: CONFLICT_DETAIL }, 409),
		});
		renderWorkspace();
		await confirmDelete();
		await screen.findByRole("alert");
		expect(screen.getByRole("dialog").textContent).not.toContain(INSTANCE.token);
	});
});
