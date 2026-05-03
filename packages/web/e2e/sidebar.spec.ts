import { expect, test } from "@playwright/test";

const CONFIG_KEY = "openconcho:config";
const CONFIG_VALUE = JSON.stringify({ baseUrl: "http://localhost:9999", token: "" });

test.describe("Sidebar", () => {
	test.beforeEach(async ({ context }) => {
		await context.addInitScript(
			([key, value]) => {
				window.localStorage.setItem(key, value);
			},
			[CONFIG_KEY, CONFIG_VALUE],
		);
	});

	test("renders the sidebar nav on the dashboard route", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("complementary")).toBeVisible();
		await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /workspaces/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
	});

	test("renders the sidebar nav on the settings route", async ({ page }) => {
		await page.goto("/settings");
		await expect(page.getByRole("complementary")).toBeVisible();
		await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
	});
});
