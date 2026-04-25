import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { loadConfig } from "@/lib/config";
import { Sidebar } from "@/components/layout/Sidebar";
import { applyTheme, getStoredTheme } from "@/lib/theme";

function RootLayout() {
	const config = loadConfig();
	const router = useRouter();
	const isSettings = router.state.location.pathname === "/settings";

	useEffect(() => {
		applyTheme(getStoredTheme());
	}, []);

	useEffect(() => {
		if (!config && !isSettings) {
			router.navigate({ to: "/settings" as never });
		}
	}, [config, isSettings, router]);

	if (isSettings) {
		return <Outlet />;
	}

	if (!config) return null;

	return (
		<div
			className="flex h-screen w-full overflow-hidden"
			style={{ background: "var(--bg)", position: "relative", zIndex: 1 }}
		>
			<Sidebar />
			<main
				className="flex-1 overflow-auto"
				style={{ position: "relative", zIndex: 1 }}
			>
				<Outlet />
			</main>
		</div>
	);
}

export const Route = createRootRoute({
	component: RootLayout,
});
