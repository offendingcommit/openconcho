// Run: node packages/web/scripts/test-dev-proxy.mjs
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer, loadConfigFromFile } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const loaded = await loadConfigFromFile(
	{ command: "serve", mode: "development" },
	`${root}vite.config.ts`,
);
const proxy = loaded.config.plugins.find((plugin) => plugin.name === "honcho-api-proxy");

for (const base of ["/", "/honcho/"]) {
	test(`dev proxy forwards requests under ${base}`, async () => {
		const upstream = createHttpServer((req, res) => res.end(req.url));
		upstream.listen(0, "127.0.0.1");
		await once(upstream, "listening");
		const vite = await createServer({
			configFile: false,
			root,
			base,
			plugins: [proxy],
			optimizeDeps: { noDiscovery: true, include: [] },
			server: { host: "127.0.0.1", port: 0, strictPort: false },
		});
		try {
			await vite.listen();
			const response = await fetch(
				`http://127.0.0.1:${vite.httpServer.address().port}${base}api/v3/workspaces/list?limit=1`,
				{ headers: { "X-Honcho-Upstream": `http://127.0.0.1:${upstream.address().port}` } },
			);
			assert.equal(await response.text(), "/v3/workspaces/list?limit=1");
		} finally {
			await vite.close();
			await new Promise((resolve) => upstream.close(resolve));
		}
	});
}
