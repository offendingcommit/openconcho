import { afterEach, describe, expect, it } from "vitest";
import { isTauri } from "@/lib/platform";

describe("isTauri", () => {
	afterEach(() => {
		delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
	});

	it("returns false in a plain browser/jsdom environment", () => {
		expect(isTauri()).toBe(false);
	});

	it("returns true when the Tauri internals global is present", () => {
		(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
		expect(isTauri()).toBe(true);
	});
});
