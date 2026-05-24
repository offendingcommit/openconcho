import { expect, test } from "@playwright/test";

const STORE_KEY = "openconcho:instances";

// Two unreachable instances — the rows still render with their configured
// names; only the health column flips to "unreachable" once the workspaces
// query errors. We only assert on the rendered names + row count, so the
// test doesn't depend on a live backend.
const FLEET_STORE = JSON.stringify({
	instances: [
		{ id: "a", name: "Neo", baseUrl: "http://localhost:9001", token: "" },
		{ id: "b", name: "Iris", baseUrl: "http://localhost:9002", token: "" },
		{ id: "c", name: "Lexi", baseUrl: "http://localhost:9003", token: "" },
	],
	activeId: "a",
});

test.describe("Fleet route", () => {
	test.beforeEach(async ({ context }) => {
		await context.addInitScript(
			([key, value]) => {
				window.localStorage.setItem(key, value);
			},
			[STORE_KEY, FLEET_STORE],
		);
	});

	test("renders one row per configured instance and the Fleet heading", async ({ page }) => {
		await page.goto("/fleet");

		// Page header
		await expect(page.getByRole("heading", { name: /^Fleet$/ })).toBeVisible();

		// One row per instance, asserted via the table not the sidebar (the
		// active instance's name also appears in the sidebar switcher).
		const table = page.getByRole("table");
		await expect(table.getByText("Neo", { exact: true })).toBeVisible();
		await expect(table.getByText("Iris", { exact: true })).toBeVisible();
		await expect(table.getByText("Lexi", { exact: true })).toBeVisible();

		// 1 header row + 3 instance rows
		await expect(table.getByRole("row")).toHaveCount(4);
	});

	test("Fleet link in the sidebar navigates to /fleet", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("link", { name: /fleet/i }).click();
		await expect(page).toHaveURL(/\/fleet$/);
		await expect(page.getByRole("heading", { name: /^Fleet$/ })).toBeVisible();
	});
});
