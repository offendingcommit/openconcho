// One-off screenshot capture for PR documentation.
// Usage: BASE_URL=http://localhost:5177 node scripts/screenshot-seed-kits.mjs

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5177";
const OUT_DIR = resolve(process.cwd(), "docs/seed-kits");
await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	deviceScaleFactor: 2,
});

await ctx.addInitScript(() => {
	window.localStorage.setItem(
		"openconcho:instances",
		JSON.stringify({
			instances: [
				{ id: "neo", name: "Neo (personal)", baseUrl: "http://localhost:8001", token: "" },
				{ id: "jeeves", name: "Jeeves (CodeWalnut)", baseUrl: "http://localhost:8002", token: "" },
			],
			activeId: "neo",
		}),
	);
	window.localStorage.setItem(
		"openconcho:seed-kits",
		JSON.stringify([
			{
				id: "kit_ben_personal",
				name: "Ben — personal core",
				description: "Identity facts Ben wants every personal-tier agent to know.",
				lines: [
					"Name: Ben Sheridan-Edwards",
					"Preferred address: Chief",
					"Email: ben@codewalnut.com",
					"Role: Founder",
					"Github: BenSheridanEdwards",
				],
			},
			{
				id: "kit_codewalnut_context",
				name: "CodeWalnut work context",
				description: "Work-tier identity for Jeeves and any future CodeWalnut agents.",
				lines: ["Employer: CodeWalnut", "Role: Founder", "Reports to: (self)"],
			},
		]),
	);
});

const page = await ctx.newPage();

async function shot(name, options = {}) {
	const file = resolve(OUT_DIR, `${name}.png`);
	await page.screenshot({ path: file, fullPage: false, ...options });
	console.log("wrote", file);
}

// 1. List view with built-ins + user kits
await page.goto(`${BASE_URL}/seed-kits`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Seed Kits");
await page.waitForTimeout(400); // settle animations
await shot("01-list");

// 2. Create form (use the "New kit" button)
await page
	.getByRole("button", { name: /^New kit$/ })
	.first()
	.click();
await page.waitForSelector("text=New seed kit");
await page.waitForTimeout(300);
await shot("02-create-form");

// 3. Back to list, then open apply dialog on the "Ben — personal core" user kit
await page.goto(`${BASE_URL}/seed-kits`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Ben — personal core");
await page.waitForTimeout(400);

// Find the Apply button next to "Ben — personal core" card
const benCard = page.locator("div", { hasText: /^Ben — personal core/ }).first();
// Just click the visible Apply button on that kit row
const applyButtons = page.getByRole("button", { name: /^Apply$/ });
const applyCount = await applyButtons.count();
// User kits are rendered after built-ins; the Ben card is the 4th apply button (0-3 built-ins, 4 = first user kit)
await applyButtons.nth(3).click();
await page.waitForSelector("text=Apply seed kit");
await page.waitForTimeout(500);
await shot("03-apply-dialog");

await browser.close();
console.log("done");
