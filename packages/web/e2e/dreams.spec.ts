import { expect, test } from "@playwright/test";

const STORE_KEY = "openconcho:instances";
const STORE_VALUE = JSON.stringify({
	instances: [{ id: "i1", name: "Local", baseUrl: "http://localhost:9999", token: "" }],
	activeId: "i1",
});

test.describe("Dreams route", () => {
	test.beforeEach(async ({ context }) => {
		await context.addInitScript(
			([key, value]) => {
				window.localStorage.setItem(key, value);
			},
			[STORE_KEY, STORE_VALUE],
		);
		// Stub the conclusions/list endpoint so the route can render real dreams.
		// :9999 is unreachable; this intercept replaces the network call entirely.
		// Use a function matcher so the trailing query string (?page=&page_size=) doesn't
		// break a glob.
		await context.route(
			(url) => url.pathname.endsWith("/conclusions/list"),
			async (route) => {
			const now = Date.now();
			const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();
			const items = [
				// Dream A — burst
				{
					id: "ind-1",
					content: "Alice prefers asynchronous communication",
					observer_id: "alice",
					observed_id: "bob",
					session_id: "sess-1",
					created_at: iso(1000),
					conclusion_type: "inductive",
					reasoning_tree: {
						conclusion_id: "ind-1",
						premises: [{ conclusion_id: "ded-1" }],
					},
				},
				{
					id: "ded-1",
					content: "Alice mentioned email twice and declined two meetings",
					observer_id: "alice",
					observed_id: "bob",
					session_id: "sess-1",
					created_at: iso(2000),
					conclusion_type: "deductive",
					reasoning_tree: {
						conclusion_id: "ded-1",
						premises: [{ conclusion_id: "exp-1" }, { conclusion_id: "exp-2" }],
					},
				},
				{
					id: "exp-1",
					content: "Alice said 'just email me'",
					observer_id: "alice",
					observed_id: "bob",
					session_id: "sess-1",
					created_at: iso(3000),
					conclusion_type: "explicit",
				},
				{
					id: "exp-2",
					content: "Alice declined the Tuesday standup",
					observer_id: "alice",
					observed_id: "bob",
					session_id: "sess-1",
					created_at: iso(4000),
					conclusion_type: "explicit",
				},
				// Dream B — 30 minutes ago, different pair → clusters separately
				{
					id: "ded-2",
					content: "Carol responds in the evenings",
					observer_id: "carol",
					observed_id: "dan",
					session_id: "sess-2",
					created_at: iso(30 * 60_000),
					conclusion_type: "deductive",
				},
			];
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					items,
					total: items.length,
					pages: 1,
					page: 1,
					size: items.length,
				}),
			});
			},
		);
	});

	test("shows a Dreams entry in the workspace sub-nav", async ({ page }) => {
		await page.goto("/workspaces/ws-test/dreams");
		// Sidebar link with the Dreams label
		const dreamsLink = page.getByRole("link", { name: /^Dreams$/ });
		await expect(dreamsLink.first()).toBeVisible();
	});

	test("renders heading and breadcrumb on the dreams route", async ({ page }) => {
		await page.goto("/workspaces/ws-test/dreams");
		await expect(page.getByRole("heading", { name: /^Dreams$/ })).toBeVisible();
		// Breadcrumb specifically — the sidebar has a "Workspaces" link too, so scope.
		await expect(
			page.getByLabel("Breadcrumb").getByRole("link", { name: "Workspaces" }),
		).toBeVisible();
	});

	test("clusters mocked conclusions into dreams and opens detail on click", async ({ page }) => {
		await page.goto("/workspaces/ws-test/dreams");

		// Two dreams: alice→bob burst, and the older carol→dan
		const rows = page.locator('button[aria-pressed]');
		await expect(rows).toHaveCount(2);

		// Alice→bob row should show count chips
		await expect(rows.first()).toContainText("alice");
		await expect(rows.first()).toContainText("bob");
		await expect(rows.first()).toContainText("2 explicit");
		await expect(rows.first()).toContainText("1 deductive");
		await expect(rows.first()).toContainText("1 inductive");

		// Click → detail panel renders three columns
		await rows.first().click();
		await expect(page.getByText("Dream detail")).toBeVisible();
		await expect(page.getByText("Explicit", { exact: true })).toBeVisible();
		await expect(page.getByText("Deductive", { exact: true })).toBeVisible();
		await expect(page.getByText("Inductive", { exact: true })).toBeVisible();
	});

	test("expands premise tree for an inductive conclusion", async ({ page }) => {
		await page.goto("/workspaces/ws-test/dreams");
		await page.locator('button[aria-pressed]').first().click();

		const showPremises = page.getByRole("button", { name: /^Show premises$/i });
		await expect(showPremises).toBeVisible();
		await showPremises.click();

		// The reasoning chain renders with the deductive premise (ded-1)
		await expect(page.getByText("Reasoning chain")).toBeVisible();
		await expect(page.getByLabel("Premise tree")).toBeVisible();
	});
});
