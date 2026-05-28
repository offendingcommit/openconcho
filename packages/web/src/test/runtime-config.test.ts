import { afterEach, describe, expect, it } from "vitest";
import { runtimeDefaultBaseUrl } from "@/lib/runtimeConfig";

const KEY = "__OPENCONCHO_DEFAULT_HONCHO_URL__";

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[KEY];
});

describe("runtimeDefaultBaseUrl", () => {
	it("returns null when the global is unset", () => {
		expect(runtimeDefaultBaseUrl()).toBeNull();
	});

	it("returns null when the global is blank", () => {
		(globalThis as Record<string, unknown>)[KEY] = "   ";
		expect(runtimeDefaultBaseUrl()).toBeNull();
	});

	it("returns an absolute URL verbatim", () => {
		(globalThis as Record<string, unknown>)[KEY] = "https://honcho.example.net";
		expect(runtimeDefaultBaseUrl()).toBe("https://honcho.example.net");
	});

	it("resolves 'same-origin' to the page origin", () => {
		(globalThis as Record<string, unknown>)[KEY] = "same-origin";
		expect(runtimeDefaultBaseUrl()).toBe(location.origin);
	});
});
