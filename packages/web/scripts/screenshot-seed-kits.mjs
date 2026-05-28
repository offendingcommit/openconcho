// One-off screenshot capture for PR documentation.
// Usage: BASE_URL=http://localhost:5177 node scripts/screenshot-seed-kits.mjs
//
// Produces both light- and dark-mode variants for each panel into
// docs/seed-kits/{light,dark}/.

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5177";
const OUT_ROOT = resolve(process.cwd(), "docs/seed-kits");

const SEED_INSTANCES = {
	instances: [
		{ id: "neo", name: "Neo (personal)", baseUrl: "http://localhost:8001", token: "" },
		{ id: "jeeves", name: "Jeeves (CodeWalnut)", baseUrl: "http://localhost:8002", token: "" },
	],
	activeId: "neo",
};

const SEED_KITS = [
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
];

async function captureTheme(browser, theme) {
	const outDir = resolve(OUT_ROOT, theme);
	await mkdir(outDir, { recursive: true });

	const ctx = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		colorScheme: theme === "dark" ? "dark" : "light",
	});

	await ctx.addInitScript(
		([instances, kits, themeValue]) => {
			window.localStorage.setItem("openconcho:instances", instances);
			window.localStorage.setItem("openconcho:seed-kits", kits);
			window.localStorage.setItem("openconcho:theme", themeValue);
		},
		[JSON.stringify(SEED_INSTANCES), JSON.stringify(SEED_KITS), theme],
	);

	const page = await ctx.newPage();

	async function shot(name) {
		const file = resolve(outDir, `${name}.png`);
		await page.screenshot({ path: file, fullPage: false });
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

	// 3. Back to list, then open apply dialog on the first user kit
	await page.goto(`${BASE_URL}/seed-kits`, { waitUntil: "networkidle" });
	await page.waitForSelector("text=Ben — personal core");
	await page.waitForTimeout(400);
	const applyButtons = page.getByRole("button", { name: /^Apply$/ });
	// User kits render after the 3 built-ins, so index 3 = first user kit.
	await applyButtons.nth(3).click();
	await page.waitForSelector("text=Apply seed kit");
	await page.waitForTimeout(500);
	await shot("03-apply-dialog");

	await ctx.close();
}

const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
	await captureTheme(browser, theme);
}
await browser.close();
console.log("done");
