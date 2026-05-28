import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

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
