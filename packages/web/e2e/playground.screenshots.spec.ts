/**
 * One-off screenshot script for the dialectic playground.
 * Run with: pnpm exec playwright test packages/web/e2e/playground.screenshots.ts
 * Outputs are written to docs/screenshots/.
 */

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT_DIR = resolve(__dirname, "../../../docs/screenshots");

const STORE_KEY = "openconcho:instances";
const STORE_VALUE = JSON.stringify({
	instances: [
		{
			id: "demo-inst",
			name: "Demo Honcho",
			baseUrl: "http://localhost:8001",
			token: "",
		},
	],
	activeId: "demo-inst",
});

const WORKSPACE = "demo-workspace";
const PEER = "alice@example.com";

// Per-level mocked latency (ms) and answer.
const FIXTURES: Record<string, { delayMs: number; content: string }> = {
	minimal: {
		delayMs: 140,
		content:
			"Quick gist: Alice prefers async standups, dislikes meetings on Mondays, and tracks priorities in Linear.",
	},
	low: {
		delayMs: 410,
		content:
			"Alice runs the platform team. She prefers async standups, batches code review in the afternoons, and pushes back on meetings before 10am. Linear is her source of truth for priorities.",
	},
	medium: {
		delayMs: 1180,
		content:
			"Alice leads the platform team and operates on async-by-default. Three recurring patterns:\n\n• Async over sync — she explicitly skips standups in favor of written status posts on Wednesdays.\n• Deep-work mornings — meetings before 10am are pushed back; she protects 9–11am for coding.\n• Single-source-of-truth in Linear — anything not tracked there is treated as not happening.",
	},
	high: {
		delayMs: 2410,
		content:
			"Alice's working model has stayed remarkably stable over the last three months. She leads platform, treats async writing as the default communication mode, and resists synchronous coordination unless a decision is actively blocked. Three concrete patterns recur:\n\n1. Async-first standups — Wednesday written status, no daily sync.\n2. Morning deep work — calendar protected 9–11am, meetings pushed past 10.\n3. Linear as system-of-record — verbal commitments she hasn't written into Linear are treated as not real.\n\nShe also pushes back hard on cross-team meetings without a clear decision owner.",
	},
	max: {
		delayMs: 3920,
		content:
			"Across her recent sessions Alice consistently surfaces three reinforcing patterns and one tension worth flagging.\n\nPatterns:\n1. Async-first communication — explicit preference for written status (Wednesday Linear updates) over standups; she's said \"if it's not in Linear it isn't real\" in three separate threads.\n2. Protected morning deep-work — calendar is blocked 9–11am every weekday; she'll move meetings rather than break the block.\n3. Decision-owner gating — she refuses cross-team meetings without a named decision owner; this has come up six times since March.\n\nTension to flag: Alice's async-default occasionally collides with newer hires who prefer synchronous onboarding. She's aware of this — last month she experimented with a weekly 30-min office hour — but the data is too thin to call it resolved.",
	},
};

// Default baseURL comes from playwright.config.ts (localhost:5173); override
// with PLAYWRIGHT_BASE_URL=http://localhost:5184 if regenerating screenshots
// against a worktree dev server on a different port.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL;

test.use({
	viewport: { width: 1600, height: 1000 },
	...(BASE_URL ? { baseURL: BASE_URL } : {}),
});

test("playground screenshots", async ({ page }) => {
	mkdirSync(OUT_DIR, { recursive: true });

	await page.addInitScript(
		([key, value]) => {
			window.localStorage.setItem(key, value);
		},
		[STORE_KEY, STORE_VALUE],
	);

	// Mock the Honcho health probe so the SPA doesn't show a disconnected banner.
	await page.route("**/v3/health*", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ status: "ok" }),
		}),
	);

	// Mock the chat POST with per-level fixtures.
	await page.route("**/v3/workspaces/*/peers/*/chat", async (route) => {
		const body = JSON.parse(route.request().postData() ?? "{}") as {
			reasoning_level?: keyof typeof FIXTURES;
		};
		const level = body.reasoning_level ?? "low";
		const fx = FIXTURES[level];
		await new Promise((r) => setTimeout(r, fx.delayMs));
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ content: fx.content }),
		});
	});

	// 1. Idle: empty playground.
	await page.goto(`/workspaces/${WORKSPACE}/peers/${encodeURIComponent(PEER)}/playground`);
	await page.waitForSelector('[data-testid="column-minimal"]');
	await page.screenshot({
		path: `${OUT_DIR}/playground-idle.png`,
		fullPage: false,
	});

	// 2. Mid-flight: type a query, fire, capture while columns are still pending.
	await page.getByLabel("Query").fill("What patterns does Alice show across her recent sessions?");
	await page.getByLabel("Run selected levels").click();
	await page.waitForSelector('[data-testid="column-minimal"][data-status="success"]');
	// minimal returns at ~140ms; capture now so medium/high/max are still pending.
	await page.screenshot({
		path: `${OUT_DIR}/playground-running.png`,
		fullPage: false,
	});

	// 3. Settled: wait for max to finish.
	await page.waitForSelector('[data-testid="column-max"][data-status="success"]', {
		timeout: 10_000,
	});
	await page.screenshot({
		path: `${OUT_DIR}/playground-results.png`,
		fullPage: false,
	});
});
