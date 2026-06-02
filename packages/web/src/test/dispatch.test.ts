import { afterEach, describe, expect, it, vi } from "vitest";

const { mockIsTauri } = vi.hoisted(() => ({ mockIsTauri: vi.fn() }));
vi.mock("@/lib/platform", () => ({ isTauri: () => mockIsTauri() }));

import { API_PREFIX, dispatchFor, PROXY_REJECT_HEADER, UPSTREAM_HEADER } from "@/lib/dispatch";

afterEach(() => mockIsTauri.mockReset());

describe("dispatchFor — web mode", () => {
	it("targets the absolute same-origin /api base and carries the upstream header", () => {
		mockIsTauri.mockReturnValue(false);
		const d = dispatchFor({ baseUrl: "https://honcho.example.net/", token: "" });
		expect(d.baseUrl).toBe(`${location.origin}${API_PREFIX}`);
		expect(d.headers[UPSTREAM_HEADER]).toBe("https://honcho.example.net");
		expect(d.headers.Authorization).toBeUndefined();
	});

	it("adds Authorization only when a token is present", () => {
		mockIsTauri.mockReturnValue(false);
		const d = dispatchFor({ baseUrl: "https://honcho.example.net", token: "sk-1" });
		expect(d.headers.Authorization).toBe("Bearer sk-1");
	});
});

describe("dispatchFor — tauri mode", () => {
	it("targets the absolute URL with no upstream header", () => {
		mockIsTauri.mockReturnValue(true);
		const d = dispatchFor({ baseUrl: "https://honcho.example.net", token: "sk-1" });
		expect(d.baseUrl).toBe("https://honcho.example.net");
		expect(d.headers[UPSTREAM_HEADER]).toBeUndefined();
		expect(d.headers.Authorization).toBe("Bearer sk-1");
	});
});

describe("proxy reject header constant", () => {
	it("is the agreed sentinel name", () => {
		expect(PROXY_REJECT_HEADER).toBe("X-Honcho-Proxy-Reject");
	});
});
