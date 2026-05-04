import { Link, useMatchRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
	Boxes,
	Check,
	ChevronRight,
	ChevronsUpDown,
	Eye,
	EyeOff,
	LayoutDashboard,
	Moon,
	Settings,
	Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDemo } from "@/hooks/useDemo";
import { useInstances } from "@/hooks/useInstances";
import { useTheme } from "@/hooks/useTheme";
import { COLOR } from "@/lib/constants";

const navItems = [
	{ to: "/" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
	{ to: "/workspaces" as const, label: "Workspaces", icon: Boxes, exact: false },
	{ to: "/settings" as const, label: "Settings", icon: Settings, exact: false },
];

export function Sidebar() {
	const matchRoute = useMatchRoute();
	const { instances, active, activate } = useInstances();
	const { theme, toggle } = useTheme();
	const { demo, toggle: toggleDemo, mask } = useDemo();
	const [switcherOpen, setSwitcherOpen] = useState(false);
	const switcherRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!switcherOpen) return;
		function onClick(e: MouseEvent) {
			if (!switcherRef.current?.contains(e.target as Node)) {
				setSwitcherOpen(false);
			}
		}
		window.addEventListener("mousedown", onClick);
		return () => window.removeEventListener("mousedown", onClick);
	}, [switcherOpen]);

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
				{active && (
					<div ref={switcherRef} className="relative mt-2 hidden sm:block">
						<button
							type="button"
							onClick={() => setSwitcherOpen((v) => !v)}
							className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors"
							style={{
								background: switcherOpen ? "var(--surface)" : "transparent",
								border: `1px solid ${switcherOpen ? "var(--border)" : "transparent"}`,
							}}
							title={mask(active.baseUrl)}
						>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-medium truncate" style={{ color: "var(--text-2)" }}>
									{active.name}
								</p>
								<p className="text-xs font-mono truncate" style={{ color: "var(--text-4)" }}>
									{mask(active.baseUrl.replace(/^https?:\/\//, ""))}
								</p>
							</div>
							{instances.length > 1 && (
								<ChevronsUpDown
									className="w-3.5 h-3.5 shrink-0"
									style={{ color: "var(--text-4)" }}
									strokeWidth={1.5}
								/>
							)}
						</button>
						{switcherOpen && instances.length > 1 && (
							<div
								className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-20"
								style={{
									background: "var(--bg-2)",
									border: "1px solid var(--border)",
									boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
								}}
							>
								{instances.map((inst) => (
									<button
										key={inst.id}
										type="button"
										onClick={() => {
											activate(inst.id);
											setSwitcherOpen(false);
										}}
										className="w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors"
										style={{
											background: inst.id === active.id ? "var(--accent-dim)" : "transparent",
										}}
									>
										<div className="min-w-0 flex-1">
											<p
												className="text-xs font-medium truncate"
												style={{
													color: inst.id === active.id ? "var(--accent-text)" : "var(--text-2)",
												}}
											>
												{inst.name}
											</p>
											<p className="text-xs font-mono truncate" style={{ color: "var(--text-4)" }}>
												{mask(inst.baseUrl.replace(/^https?:\/\//, ""))}
											</p>
										</div>
										{inst.id === active.id && (
											<Check
												className="w-3.5 h-3.5 shrink-0"
												style={{ color: "var(--accent-text)" }}
												strokeWidth={2}
											/>
										)}
									</button>
								))}
							</div>
						)}
					</div>
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
					v{__APP_VERSION__}
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
