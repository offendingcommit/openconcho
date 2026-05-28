import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoProvider } from "@/context/DemoContext";
import { MetadataProvider } from "@/context/MetadataContext";
import { useDemo } from "@/hooks/useDemo";
import { routeTree } from "@/routeTree.gen";

function renderAt(initialPath: string) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={qc}>
			<DemoProvider>
				<MetadataProvider>
					{/* biome-ignore lint/suspicious/noExplicitAny: test router type */}
					<RouterProvider router={router as any} />
				</MetadataProvider>
			</DemoProvider>
		</QueryClientProvider>,
	);
}

describe("first load with no config", () => {
	it("renders the settings form on first paint when no config exists", async () => {
		localStorage.clear();
		renderAt("/");
		// Should be visible immediately — bug 1: RootLayout returns null while
		// a useEffect-driven navigate fires, leaving a blank screen.
		expect(
			await screen.findByText(/Connect to Honcho Cloud or your self-hosted instance/i),
		).toBeInTheDocument();
	});
});

describe("Sidebar/useDemo availability across routes", () => {
	it("does not throw when a useDemo consumer mounts alongside the routed app", () => {
		function DemoConsumer() {
			const { demo } = useDemo();
			return <span data-testid="demo-flag">{String(demo)}</span>;
		}
		// After the fix, DemoProvider wraps the app at the root (main.tsx /
		// __root.tsx) so consumers anywhere in the tree resolve. This test
		// renders a consumer as a sibling of the router under the same provider
		// the production wiring uses.
		localStorage.clear();
		expect(() => {
			const router = createRouter({
				routeTree,
				history: createMemoryHistory({ initialEntries: ["/settings"] }),
			});
			const qc = new QueryClient({
				defaultOptions: { queries: { retry: false } },
			});
			render(
				<QueryClientProvider client={qc}>
					<DemoProvider>
						<MetadataProvider>
							{/* biome-ignore lint/suspicious/noExplicitAny: test router type */}
							<RouterProvider router={router as any} />
							<DemoConsumer />
						</MetadataProvider>
					</DemoProvider>
				</QueryClientProvider>,
			);
		}).not.toThrow();
		expect(screen.getByTestId("demo-flag")).toBeInTheDocument();
	});
});
