import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.TAURI_DEV_HOST;
const { version } = JSON.parse(
	readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8"),
) as { version: string };

// Dev-mode mirror of the nginx /api reverse proxy: read X-Honcho-Upstream and
// forward /api/* there, so `make dev-web` behaves identically to the docker image
// (same-origin requests, no browser CORS). Connect strips the /api mount prefix,
// so req.url is already the upstream path (e.g. /v3/workspaces/list).
function honchoApiProxy(): Plugin {
	const HEADER = "x-honcho-upstream";
	// Mirror nginx's allowlist (spec §D): unset/empty => open; otherwise only
	// matching upstream hosts forward. Glob `*` -> any non-slash run, like nginx.
	const raw = process.env.OPENCONCHO_UPSTREAM_ALLOWLIST?.trim();
	const allowlist: RegExp[] | null = raw
		? raw
				.split(",")
				.map((h) => h.trim())
				.filter(Boolean)
				.map((host) => {
					const esc = host.replace(/[.]/g, "\\.").replace(/[*]/g, "[^/]*");
					return new RegExp(`^https?://${esc}(:[0-9]+)?(/.*)?$`);
				})
		: null;
	return {
		name: "honcho-api-proxy",
		configureServer(server) {
			server.middlewares.use("/api", async (req, res) => {
				const upstream = req.headers[HEADER];
				if (typeof upstream !== "string" || upstream.trim() === "") {
					res.statusCode = 421;
					res.setHeader("X-Honcho-Proxy-Reject", "no-upstream");
					res.end();
					return;
				}
				if (allowlist && !allowlist.some((re) => re.test(upstream))) {
					res.statusCode = 403;
					res.setHeader("X-Honcho-Proxy-Reject", "allowlist");
					res.end();
					return;
				}
				const target = upstream.replace(/\/+$/, "") + (req.url ?? "");
				const chunks: Buffer[] = [];
				for await (const c of req) chunks.push(c as Buffer);
				try {
					const upstreamRes = await fetch(target, {
						method: req.method,
						headers: {
							"content-type": req.headers["content-type"] ?? "application/json",
							...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
						},
						body: ["GET", "HEAD"].includes(req.method ?? "") ? undefined : Buffer.concat(chunks),
					});
					res.statusCode = upstreamRes.status;
					upstreamRes.headers.forEach((v, k) => {
						res.setHeader(k, v);
					});
					res.end(Buffer.from(await upstreamRes.arrayBuffer()));
				} catch (e) {
					res.statusCode = 502;
					res.end(`proxy error: ${e instanceof Error ? e.message : String(e)}`);
				}
			});
		},
	};
}

export default defineConfig({
	clearScreen: false,
	plugins: [tanstackRouter({ autoCodeSplitting: true }), react(), honchoApiProxy(), tailwindcss()],
	define: {
		__APP_VERSION__: JSON.stringify(version),
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 5173,
		strictPort: true,
		host: host || false,
		hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
		watch: { ignored: ["**/src-tauri/**"] },
	},
	envPrefix: ["VITE_", "TAURI_ENV_*"],
	build: {
		target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome120" : "esnext",
		minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
		sourcemap: !!process.env.TAURI_ENV_DEBUG,
	},
});
