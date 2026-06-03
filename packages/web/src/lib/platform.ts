/** True when running inside the Tauri desktop shell (WebView with injected internals). */
export function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
