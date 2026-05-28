import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHealthStatus } from "@/hooks/useHealthStatus";
import { saveStore } from "@/lib/config";

const httpFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/http", () => ({ httpFetch }));

function wrap(qc: QueryClient) {
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
}

describe("useHealthStatus", () => {
	beforeEach(() => {
		httpFetch.mockReset();
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("is disabled with no active instance", () => {
		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useHealthStatus(), { wrapper: wrap(qc) });
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("reports ok when the active instance responds 200", async () => {
		saveStore({
			instances: [{ id: "i1", name: "Local", baseUrl: "http://localhost:8000", token: "" }],
			activeId: "i1",
		});
		httpFetch.mockResolvedValue(new Response("{}", { status: 200 }));
		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useHealthStatus(), { wrapper: wrap(qc) });
		await waitFor(() => expect(result.current.data?.status).toBe("ok"));
	});

	it("does not include raw tokens in query cache keys", async () => {
		saveStore({
			instances: [
				{ id: "i1", name: "Local", baseUrl: "http://localhost:8000", token: "super-secret-token" },
			],
			activeId: "i1",
		});
		httpFetch.mockResolvedValue(new Response("{}", { status: 200 }));
		const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		renderHook(() => useHealthStatus(), { wrapper: wrap(qc) });
		await waitFor(() => expect(httpFetch).toHaveBeenCalled());

		const cacheKeys = qc
			.getQueryCache()
			.getAll()
			.map((query) => JSON.stringify(query.queryKey));
		expect(cacheKeys.join("\n")).not.toContain("super-secret-token");
	});
});
