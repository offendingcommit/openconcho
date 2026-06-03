import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "@/lib/platform";

// Route fetch through Rust (reqwest) when running in Tauri — bypasses WebView CORS enforcement.
// Falls back to native browser fetch during plain web dev.
export const httpFetch: typeof globalThis.fetch = isTauri()
	? (tauriFetch as typeof globalThis.fetch)
	: globalThis.fetch;
