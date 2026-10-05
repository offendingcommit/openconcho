import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Node >= 26 ships an experimental global `localStorage` that is undefined
// unless `--localstorage-file` is set. That undefined value bleeds through
// the environment compat layer and clobbers jsdom's real Storage, so every
// test touching localStorage crashes. Install a small in-memory Storage to
// keep the browser contract intact under any node version.
function installMemoryStorage(target: typeof globalThis): void {
	const hadStorage = (() => {
		try {
			return target.localStorage instanceof Storage;
		} catch {
			return false;
		}
	})();
	if (hadStorage) return;

	const store = new Map<string, string>();
	const storage: Storage = {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (key: string) => (store.has(key) ? (store.get(key) ?? null) : null),
		key: (index: number) => Array.from(store.keys())[index] ?? null,
		removeItem: (key: string) => {
			store.delete(key);
		},
		setItem: (key: string, value: string) => {
			store.set(key, String(value));
		},
	};
	Object.defineProperty(target, "localStorage", { value: storage, configurable: true });
	Object.defineProperty(target, "sessionStorage", { value: storage, configurable: true });
}

installMemoryStorage(globalThis);
if (typeof window !== "undefined") {
	installMemoryStorage(window as unknown as typeof globalThis);
}

// jsdom defines scrollTo but leaves it unimplemented; router scroll restoration calls it.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

if (!window.matchMedia) {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

afterEach(() => {
	cleanup();
	localStorage.clear();
});
