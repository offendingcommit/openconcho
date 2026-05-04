import type { Router } from "@tanstack/react-router";

const SCHEME = "openconcho:";

function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function navigateFromUrl(router: Router<never, never>, raw: string): void {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return;
	}
	if (parsed.protocol !== SCHEME) return;

	const host = parsed.hostname || parsed.pathname.replace(/^\/+/, "").split("/")[0];
	const search = parsed.search;

	if (host === "explore") {
		router.navigate({ to: `/explore${search}` as never });
		return;
	}

	const path = parsed.pathname.startsWith("/") ? parsed.pathname : `/${parsed.pathname}`;
	router.navigate({ to: `${path}${search}` as never });
}

export async function initDeepLinks(router: Router<never, never>): Promise<void> {
	if (!isTauri()) return;
	const { onOpenUrl, getCurrent } = await import("@tauri-apps/plugin-deep-link");

	const initial = await getCurrent();
	if (initial?.length) navigateFromUrl(router, initial[0]);

	await onOpenUrl((urls) => {
		if (urls[0]) navigateFromUrl(router, urls[0]);
	});
}
