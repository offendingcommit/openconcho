import { useQueryClient } from "@tanstack/react-query";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
	Boxes,
	Braces,
	Check,
	ChevronRight,
	ChevronsUpDown,
	Eye,
	EyeOff,
	Layers,
	LayoutDashboard,
	Lightbulb,
	MessageSquare,
	Moon,
	MoonStar,
	Settings,
	Sun,
	Users,
	Webhook,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HealthDot } from "@/components/shared/HealthDot";
import { useDemo } from "@/hooks/useDemo";
import { useHealthStatus } from "@/hooks/useHealthStatus";
import { useInstances } from "@/hooks/useInstances";
import { useMetadata } from "@/hooks/useMetadata";
import { useTheme } from "@/hooks/useTheme";
import { COLOR } from "@/lib/constants";

const TOP_NAV = [
	{ to: "/" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
	{ to: "/workspaces" as const, label: "Workspaces", icon: Boxes, exact: false },
	{ to: "/seed-kits" as const, label: "Seed Kits", icon: Layers, exact: false },
	{ to: "/settings" as const, label: "Settings", icon: Settings, exact: false },
];

const WORKSPACE_SECTIONS = [
	{ label: "Peers", icon: Users, section: "peers" },
	{ label: "Sessions", icon: MessageSquare, section: "sessions" },
	{ label: "Conclusions", icon: Lightbulb, section: "conclusions" },
	{ label: "Dreams", icon: MoonStar, section: "dreams" },
	{ label: "Webhooks", icon: Webhook, section: "webhooks" },
] as const;

function formatLastUpdated(value: number | null, now = Date.now()): string {
	if (!value) return "Not updated yet";
	const elapsed = Math.max(0, now - value);
	if (elapsed < 10_000) return "Updated just now";
	if (elapsed < 60_000) return `Updated ${Math.floor(elapsed / 1000)}s ago`;
	if (elapsed < 3_600_000) return `Updated ${Math.floor(elapsed / 60_000)}m ago`;
	return `Updated ${Math.floor(elapsed / 3_600_000)}h ago`;
}

function useLastDataUpdate(): string {
	const queryClient = useQueryClient();
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		function refresh() {
			// No setNow here — calling setNow on every cache event causes a render loop on
			// CI (each Date.now() call crosses a ms boundary → new value → React re-renders
			// Sidebar → cache events fire again → loop). setNow belongs only in the interval.
			const latest = queryClient
				.getQueryCache()
				.getAll()
				.reduce((max, query) => Math.max(max, query.state.dataUpdatedAt || 0), 0);
			setUpdatedAt(latest || null);
		}

		refresh();
		const unsubscribe = queryClient.getQueryCache().subscribe(refresh);
		const interval = window.setInterval(() => {
			setNow(Date.now()); // refresh relative-time display ("X ago") every 30s
			refresh();
		}, 30_000);
		return () => {
			unsubscribe();
			window.clearInterval(interval);
		};
	}, [queryClient]);

	return formatLastUpdated(updatedAt, now);
}

export function Sidebar() {
	const matchRoute = useMatchRoute();
	const { instances, active, activate } = useInstances();
	const { theme, toggle } = useTheme();
	const { demo, toggle: toggleDemo, mask } = useDemo();
	const { showMetadata, toggle: toggleMeta } = useMetadata();
	const { data: health } = useHealthStatus();
	const lastUpdated = useLastDataUpdate();
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

	// Detect workspace context — matchRoute returns params or false
	const wsMatch = matchRoute({
		to: "/workspaces/$workspaceId" as never,
		fuzzy: true,
	}) as { workspaceId: string } | false;
	const activeWorkspaceId = wsMatch ? wsMatch.workspaceId : null;

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
								<p
									className="text-xs font-medium truncate flex items-center gap-1.5"
									style={{ color: "var(--text-2)" }}
								>
									<HealthDot status={health?.status} message={health?.message} />
									<span className="truncate">{active.name}</span>
								</p>
								<p className="text-xs font-mono truncate" style={{ color: "var(--text-4)" }}>
									{mask(active.baseUrl.replace(/^https?:\/\//, ""))}
								</p>
								<p className="text-[10px] font-mono truncate" style={{ color: "var(--text-4)" }}>
									{lastUpdated}
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
			<nav className="flex-1 px-2 sm:px-3 py-3 space-y-0.5 overflow-y-auto">
				{TOP_NAV.map((item) => {
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

				{/* Workspace contextual sub-nav */}
				<AnimatePresence>
					{activeWorkspaceId && (
						<motion.div
							key="ws-subnav"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.22, ease: "easeInOut" }}
							className="overflow-hidden"
						>
							{/* Workspace ID label */}
							<div className="px-3 pt-2 pb-1 hidden sm:block">
								<p
									className="text-xs font-mono truncate"
									style={{ color: "var(--text-4)" }}
									title={mask(activeWorkspaceId)}
								>
									{mask(activeWorkspaceId)}
								</p>
							</div>

							{/* Section links — indented */}
							<div className="pl-2 sm:pl-3 space-y-0.5">
								{WORKSPACE_SECTIONS.map((s) => {
									const Icon = s.icon;
									const isActive = matchRoute({
										to: `/workspaces/$workspaceId/${s.section}` as never,
										params: { workspaceId: activeWorkspaceId } as never,
										fuzzy: true,
									});

									return (
										<Link
											key={s.section}
											to={`/workspaces/$workspaceId/${s.section}` as never}
											params={{ workspaceId: activeWorkspaceId } as never}
											className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all justify-center sm:justify-start"
											style={{
												color: isActive ? "var(--accent-text)" : "var(--text-3)",
											}}
											title={s.label}
										>
											{isActive && (
												<motion.div
													layoutId="ws-sub-indicator"
													className="absolute inset-0 rounded-lg"
													style={{
														background: "var(--accent-dim)",
														border: "1px solid var(--accent-border)",
													}}
													transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
												/>
											)}
											<Icon
												className="w-3.5 h-3.5 shrink-0 relative z-10"
												strokeWidth={isActive ? 2 : 1.5}
											/>
											<span className="relative z-10 font-medium hidden sm:block">{s.label}</span>
										</Link>
									);
								})}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</nav>

			{/* Footer — version, demo, metadata, theme */}
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
						onClick={toggleMeta}
						className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
						style={{
							background: showMetadata ? "rgba(245,158,11,0.1)" : "var(--surface)",
							border: `1px solid ${showMetadata ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
							color: showMetadata ? COLOR.warning : "var(--text-3)",
						}}
						title={showMetadata ? "Hide raw metadata" : "Show raw metadata"}
					>
						<Braces className="w-3.5 h-3.5" strokeWidth={1.5} />
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
