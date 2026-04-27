import { Link, useMatchRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
	Boxes,
	ChevronRight,
	Eye,
	EyeOff,
	LayoutDashboard,
	Moon,
	Settings,
	Sun,
} from "lucide-react";
import { useDemo } from "@/hooks/useDemo";
import { useTheme } from "@/hooks/useTheme";
import { loadConfig } from "@/lib/config";
import { COLOR } from "@/lib/constants";

const navItems = [
	{ to: "/" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
	{ to: "/workspaces" as const, label: "Workspaces", icon: Boxes, exact: false },
	{ to: "/settings" as const, label: "Settings", icon: Settings, exact: false },
];

export function Sidebar() {
	const matchRoute = useMatchRoute();
	const config = loadConfig();
	const { theme, toggle } = useTheme();
	const { demo, toggle: toggleDemo } = useDemo();

	return (
		<motion.aside
			initial={{ x: -20, opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			transition={{ duration: 0.3, ease: "easeOut" }}
			className="w-14 sm:w-56 shrink-0 flex flex-col h-full"
			style={{
				background: "var(--sidebar-bg)",
				borderRight: "1px solid var(--border)",
				position: "relative",
				zIndex: 10,
			}}
		>
			{/* Logo */}
			<div className="px-3 sm:px-5 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
				<div className="flex items-center gap-2.5 justify-center sm:justify-start">
					<img
						src="/favicon.svg"
						alt="OpenConcho"
						className="w-7 h-7 rounded-lg shrink-0"
						style={{ boxShadow: `0 0 16px ${COLOR.accentGlow}` }}
					/>
					<div className="hidden sm:block">
						<span
							className="font-semibold text-sm tracking-tight"
							style={{ color: "var(--text-1)" }}
						>
							OpenConcho
						</span>
					</div>
				</div>
				{config && (
					<p
						className="text-xs mt-2 truncate font-mono hidden sm:block"
						style={{ color: "var(--text-4)" }}
						title={config.baseUrl}
					>
						{config.baseUrl.replace(/^https?:\/\//, "")}
					</p>
				)}
			</div>

			{/* Nav */}
			<nav className="flex-1 px-2 sm:px-3 py-3 space-y-0.5">
				{navItems.map((item) => {
					const Icon = item.icon;
					const isActive = matchRoute({ to: item.to, fuzzy: !item.exact });

					return (
						<Link
							key={item.to}
							to={item.to}
							className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group justify-center sm:justify-start"
							style={{
								color: isActive ? "var(--accent-text)" : "var(--text-2)",
								background: isActive ? "var(--accent-dim)" : "transparent",
							}}
							title={item.label}
						>
							{isActive && (
								<motion.div
									layoutId="nav-indicator"
									className="absolute inset-0 rounded-lg"
									style={{
										background: "var(--accent-dim)",
										border: "1px solid var(--accent-border)",
									}}
									transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
								/>
							)}
							<Icon className="w-4 h-4 shrink-0 relative z-10" strokeWidth={isActive ? 2 : 1.5} />
							<span className="relative z-10 font-medium hidden sm:block">{item.label}</span>
							{isActive && (
								<ChevronRight
									className="w-3 h-3 ml-auto relative z-10 opacity-60 hidden sm:block"
									strokeWidth={2}
								/>
							)}
						</Link>
					);
				})}
			</nav>

			{/* Theme toggle + footer */}
			<div
				className="px-3 sm:px-5 py-3 flex items-center justify-between"
				style={{ borderTop: "1px solid var(--border)" }}
			>
				<p className="text-xs font-mono hidden sm:block" style={{ color: "var(--text-4)" }}>
					API v3
				</p>
				<div className="flex items-center gap-1.5 mx-auto sm:mx-0">
					<button
						type="button"
						onClick={toggleDemo}
						className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
						style={{
							background: demo ? "var(--accent-dim)" : "var(--surface)",
							border: `1px solid ${demo ? "var(--accent-border)" : "var(--border)"}`,
							color: demo ? "var(--accent-text)" : "var(--text-3)",
						}}
						title={demo ? "Disable demo mode" : "Enable demo mode"}
					>
						{demo ? (
							<EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />
						) : (
							<Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
						)}
					</button>
					<button
						type="button"
						onClick={toggle}
						className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
						style={{
							background: "var(--surface)",
							border: "1px solid var(--border)",
							color: "var(--text-3)",
						}}
						title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
					>
						{theme === "dark" ? (
							<Sun className="w-3.5 h-3.5" strokeWidth={1.5} />
						) : (
							<Moon className="w-3.5 h-3.5" strokeWidth={1.5} />
						)}
					</button>
				</div>
			</div>
		</motion.aside>
	);
}
