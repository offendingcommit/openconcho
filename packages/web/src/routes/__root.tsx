import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/shared/Toaster";
import { loadConfig } from "@/lib/config";
import { applyTheme, getStoredTheme } from "@/lib/theme";

const SETTINGS_PATH = "/settings";

function RootLayout() {
	useEffect(() => {
		applyTheme(getStoredTheme());
	}, []);

	return (
		<div
			className="flex h-screen w-full overflow-hidden"
			style={{ background: "var(--bg)", position: "relative", zIndex: 1 }}
		>
			<Sidebar />
			<main className="flex-1 overflow-auto" style={{ position: "relative", zIndex: 1 }}>
				<Outlet />
			</main>
			<Toaster />
		</div>
	);
}

export const Route = createRootRoute({
	beforeLoad: ({ location }) => {
		// Redirect to settings synchronously when no config is present, so the
		// first paint already shows the settings form instead of a blank screen.
		if (location.pathname !== SETTINGS_PATH && !loadConfig()) {
			throw redirect({ to: SETTINGS_PATH as never });
		}
	},
	component: RootLayout,
});
