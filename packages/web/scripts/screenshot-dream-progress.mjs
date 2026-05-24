#!/usr/bin/env node
/**
 * Capture documentation screenshots for the Dream Progress panel.
 *
 * The dev server must already be running at the URL passed in via PREVIEW_URL
 * (defaults to http://localhost:5178). The /dream-progress showcase route is
 * DEV-only and renders three variants of the panel against mock data.
 *
 * Usage:
 *   PREVIEW_URL=http://localhost:5178 OUT_DIR=../../docs/screenshots/live-dream-progress \
 *     node scripts/screenshot-dream-progress.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:5178";
const OUT_DIR = path.resolve(
	__dirname,
	process.env.OUT_DIR ?? "../../../docs/screenshots/live-dream-progress",
);

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
		colorScheme: "dark",
	});
	const page = await context.newPage();

	// Seed localStorage with a fake instance so the root redirect doesn't kick
	// us to the settings page. The showcase doesn't actually make any network
	// requests — it renders against in-memory mock data.
	await page.addInitScript(() => {
		localStorage.setItem(
			"openconcho:instances",
			JSON.stringify({
				instances: [
					{
						id: "inst_dev_demo",
						name: "Demo (mock)",
						baseUrl: "http://localhost:9999",
						token: "",
					},
				],
				activeId: "inst_dev_demo",
			}),
		);
	});

	await page.goto(`${PREVIEW_URL}/dream-progress`, { waitUntil: "networkidle" });
	await page.waitForSelector('[data-testid="dream-progress-panel"]');
	// Let framer-motion entrance animations settle.
	await page.waitForTimeout(600);

	// Full showcase — top-to-bottom view of all three variants.
	await page.screenshot({
		path: path.join(OUT_DIR, "overview.png"),
		fullPage: true,
	});

	// Variant: idle
	{
		const handle = await page.locator("section").nth(0);
		await handle.scrollIntoViewIfNeeded();
		await page.waitForTimeout(150);
		await handle.screenshot({ path: path.join(OUT_DIR, "idle.png") });
	}

	// Variant: active (with per-session breakdown)
	{
		const handle = await page.locator("section").nth(1);
		await handle.scrollIntoViewIfNeeded();
		await page.waitForTimeout(150);
		await handle.screenshot({ path: path.join(OUT_DIR, "active.png") });
	}

	// Variant: stalled (>30m without forward progress)
	{
		const handle = await page.locator("section").nth(2);
		await handle.scrollIntoViewIfNeeded();
		await page.waitForTimeout(150);
		await handle.screenshot({ path: path.join(OUT_DIR, "stalled.png") });
	}

	await browser.close();
	console.log(`Saved screenshots to ${OUT_DIR}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
