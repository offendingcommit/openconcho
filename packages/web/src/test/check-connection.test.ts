import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the platform predicate (web mode) and the fetch boundary. We mock
// @/lib/http — NOT globalThis.fetch — because httpFetch captures the fetch
// reference at module load, so vi.stubGlobal would not be observed by dispatchFor.
const { mockIsTauri, httpFetchMock } = vi.hoisted(() => ({
	mockIsTauri: vi.fn(() => false),
	httpFetchMock: vi.fn(),
}));
vi.mock("@/lib/platform", () => ({ isTauri: () => mockIsTauri() }));
vi.mock("@/lib/http", () => ({ httpFetch: httpFetchMock }));

import { checkConnection } from "@/lib/config";

afterEach(() => {
	httpFetchMock.mockReset();
	mockIsTauri.mockReturnValue(false);
});

describe("checkConnection — web proxy mode", () => {
	it("calls the absolute same-origin /api path with the upstream header", async () => {
		httpFetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
		const res = await checkConnection("https://honcho.example.net", "sk-1");
		expect(res.status).toBe("ok");
		const [url, init] = httpFetchMock.mock.calls[0];
		expect(String(url)).toBe(`${location.origin}/api/v3/workspaces/list`);
		expect((init.headers as Record<string, string>)["X-Honcho-Upstream"]).toBe(
			"https://honcho.example.net",
		);
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-1");
	});

	it("maps an upstream 401 to auth-required", async () => {
		httpFetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
		const res = await checkConnection("https://honcho.example.net");
		expect(res.status).toBe("auth-required");
	});

	it("treats a proxy reject as unreachable, not auth-required", async () => {
		httpFetchMock.mockResolvedValue(
			new Response("", { status: 403, headers: { "X-Honcho-Proxy-Reject": "allowlist" } }),
		);
		const res = await checkConnection("https://blocked.example.net");
		expect(res.status).toBe("unreachable");
		expect(res.message).toMatch(/allowlist/i);
	});
});
