/**
 * Regression: sessions-list sort must be GLOBAL over the whole result set.
 *
 * The honcho fork's POST /v3/workspaces/{id}/sessions/list orders by
 * created_at only; `reverse` is the one server-side sort lever. The client
 * must request the direction (Newest => reverse=true, Oldest => false) and
 * must NOT re-sort the loaded page slice — the old behavior sorted only the
 * 20 loaded cards, so "Oldest" showed the oldest entry OF THE CURRENT PAGE,
 * not of the workspace.
 *
 * The mock serves a 3-session workspace in 2-per-page slices (more sessions
 * than one page holds): reverse=true  => [s-new, s-mid] | [s-old]
 *                        reverse=false => [s-old, s-mid] | [s-new]
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCalls, resetListCalls } from "./sessions-api-mock";

vi.mock("@/api/client", () => import("./sessions-api-mock"));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
	useParams: () => ({ workspaceId: "ws-1" }),
	useRouter: () => ({ state: { location: { pathname: "/workspaces/ws-1/sessions" } } }),
	useMatch: () => false,
	Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { SessionList } from "@/components/sessions/SessionList";
import { DemoProvider } from "@/context/DemoContext";

function makeQc() {
	return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function renderList() {
	return render(
		<QueryClientProvider client={makeQc()}>
			<DemoProvider>
				<SessionList />
			</DemoProvider>
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	resetListCalls();
});

describe("SessionList — global server-side ordering", () => {
	it("requests reverse=true by default (Newest first, page 1 = globally newest)", async () => {
		const { container } = renderList();
		await waitFor(() => expect(listCalls.length).toBeGreaterThan(0));
		expect(listCalls[0].reverse).toBe(true);
		// The rendered page-1 slice comes from the mocked server order
		// (reverse=true => newest first): s-new is on page 1, s-old is not.
		const ids = await waitForRenderedIds(container);
		expect(ids[0]).toBe("s-new");
		expect(ids).toContain("s-mid");
		// the globally OLDEST session is NOT on page 1 when Newest is selected
		expect(ids).not.toContain("s-old");
	});

	it("toggling to Oldest re-requests page 1 with reverse=false and renders the GLOBALLY oldest session", async () => {
		const { container } = renderList();
		await waitFor(() => expect(listCalls.length).toBeGreaterThan(0));

		// Act like a user on page 2 of Newest: flip the sort direction.
		const toggle = screen.getByRole("button", { name: /newest/i });
		await userEvent.click(toggle);

		const last = await waitFor(() => {
			const call = listCalls[listCalls.length - 1];
			expect(call.reverse).toBe(false);
			return call;
		});
		// Direction change resets to page 1, requested from the server.
		expect(last.page).toBe(1);
		expect(last.reverse).toBe(false);
		// Page 1 of the ASC server order is [s-old, s-mid]: the globally
		// OLDEST session is now the first rendered card.
		const ids = await waitForRenderedIds(container);
		expect(ids[0]).toBe("s-old");
		expect(ids).not.toContain("s-new");
	});

	it("paginates within the server order: page 2 of Oldest holds the globally newest session", async () => {
		const { container } = renderList();
		await waitFor(() => expect(listCalls.length).toBeGreaterThan(0));

		// Switch to Oldest (reverse=false), then walk to page 2.
		await userEvent.click(screen.getByRole("button", { name: /newest/i }));
		await waitFor(() => expect(listCalls[listCalls.length - 1].reverse).toBe(false));
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		const last = await waitFor(() => {
			const call = listCalls[listCalls.length - 1];
			expect(call.page).toBe(2);
			return call;
		});
		// Same direction rides every page change — the client never re-sorts.
		expect(last.reverse).toBe(false);
		// reverse=false page 2 is [s-new]: the GLOBALLY newest session shows up
		// on the LAST page under Oldest — proof ordering spans all pages.
		const ids = await waitForRenderedIds(container);
		expect(ids[0]).toBe("s-new");
		expect(ids).not.toContain("s-old");
	});
});

async function waitForRenderedIds(container: HTMLElement): Promise<string[]> {
	await waitFor(() =>
		expect(container.querySelectorAll("button span.font-mono").length).toBeGreaterThan(0),
	);
	// Only the session cards' mono id spans, not the metadata/date captions.
	return [...container.querySelectorAll("button span.font-mono")]
		.map((el) => el.textContent ?? "")
		.filter((t) => t.startsWith("s-"));
}
