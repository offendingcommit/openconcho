import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import { saveStore, updateInstance } from "@/lib/config";
import { routeTree } from "@/routeTree.gen";

const { httpFetch } = vi.hoisted(() => ({ httpFetch: vi.fn() }));
vi.mock("@/lib/http", () => ({ httpFetch }));

const INSTANCE_ID = "inst-1";
const FAKE_TOKEN = "test-token";

function jsonResponse(
	status: number,
	body: unknown = { items: [], total: 0, page: 1, size: 1, pages: 0 },
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function seedInstance(token = "") {
	saveStore({
		instances: [
			{
				id: INSTANCE_ID,
				name: "Local",
				baseUrl: "http://localhost:8000",
				token,
			},
		],
		activeId: INSTANCE_ID,
	});
}

function renderApp(initialPath = "/") {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return {
		qc,
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

describe("missing token warning", () => {
	afterEach(() => {
		httpFetch.mockReset();
		localStorage.clear();
	});

	it("shows a visible alert when health is 401 and no token is configured", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		expect(await screen.findByRole("alert")).toBeInTheDocument();
	});

	it("shows a visible alert when health is 403 and no token is configured", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(403));
		renderApp();
		expect(await screen.findByRole("alert")).toBeInTheDocument();
	});

	it("states that the Honcho instance requires a token and none is configured", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		expect(await screen.findByRole("alert")).toHaveTextContent(
			/requires an authentication token[\s\S]*none is configured/i,
		);
	});

	it("links the warning to instance settings", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		const action = await screen.findByRole("link", { name: /add token in settings/i });
		expect(action).toHaveAttribute("href", "/settings");
	});

	it("opens settings from the warning action", async () => {
		const user = userEvent.setup();
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		await user.click(await screen.findByRole("link", { name: /add token in settings/i }));
		expect(await screen.findByText(/Manage your Honcho connections/i)).toBeInTheDocument();
	});

	it("does not warn when a public instance responds 200 without a token", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(200));
		renderApp();
		await screen.findByLabelText(/Connection status: Connected/i);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("does not treat a generic server error as a missing token", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(500));
		renderApp();
		await screen.findByLabelText(/Connection status: Unreachable/i);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("does not warn that a token is missing when one is already configured", async () => {
		seedInstance(FAKE_TOKEN);
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		await screen.findByLabelText(/Connection status: Auth required/i);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("keeps the sidebar health indicator when auth is required", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		await screen.findByRole("alert");
		expect(screen.getByLabelText(/Connection status: Auth required/i)).toBeInTheDocument();
	});

	it("hides the warning after a token is saved and health succeeds", async () => {
		seedInstance();
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		await screen.findByRole("alert");

		httpFetch.mockResolvedValue(jsonResponse(200));
		act(() => {
			updateInstance(INSTANCE_ID, { token: FAKE_TOKEN });
			window.dispatchEvent(new Event("openconcho:instances-changed"));
		});

		await waitFor(() => {
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});
	});

	it("does not put the configured token into the document", async () => {
		seedInstance(FAKE_TOKEN);
		httpFetch.mockResolvedValue(jsonResponse(401));
		renderApp();
		await screen.findByLabelText(/Connection status: Auth required/i);
		expect(document.body.textContent).not.toContain(FAKE_TOKEN);
	});

	it("does not put the configured token into query cache keys", async () => {
		seedInstance(FAKE_TOKEN);
		httpFetch.mockResolvedValue(jsonResponse(401));
		const { qc } = renderApp();
		await screen.findByLabelText(/Connection status: Auth required/i);
		const cacheKeys = qc
			.getQueryCache()
			.getAll()
			.map((query) => JSON.stringify(query.queryKey));
		expect(cacheKeys.join("\n")).not.toContain(FAKE_TOKEN);
	});
});
