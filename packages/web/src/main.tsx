import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DemoProvider } from "./context/DemoContext";
import { MetadataProvider } from "./context/MetadataContext";
import { initDeepLinks } from "./lib/deep-link";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: 1,
		},
	},
});

const router = createRouter({
	routeTree,
	basepath: import.meta.env.BASE_URL,
	defaultPreload: "intent",
	scrollRestoration: true,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

void initDeepLinks(router as never);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<DemoProvider>
				<MetadataProvider>
					<RouterProvider router={router} />
				</MetadataProvider>
			</DemoProvider>
		</QueryClientProvider>
	</StrictMode>,
);
