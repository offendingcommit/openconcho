import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Boxes, Activity, LayoutDashboard } from "lucide-react";
import { useWorkspaces, useQueueStatus } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";

function QueueCard({ workspaceId }: { workspaceId: string }) {
	const { data, isLoading } = useQueueStatus(workspaceId);

	if (isLoading)
		return (
			<div className="rounded-xl p-5 theme-card">
				<PageLoader />
			</div>
		);
	if (!data) return null;

	const pending = data.pending_work_units;

	return (
		<div className="rounded-xl p-5 theme-card">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<Activity className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<h3 className="text-sm font-medium" style={{ color: "var(--text-1)" }}>Queue Status</h3>
				</div>
				<span
					className="text-xs font-mono px-2 py-0.5 rounded-full"
					style={{
						background: pending === 0 ? "rgba(52,211,153,0.1)" : "rgba(245,158,11,0.1)",
						color: pending === 0 ? "#34d399" : "#f59e0b",
						border: `1px solid ${pending === 0 ? "rgba(52,211,153,0.2)" : "rgba(245,158,11,0.2)"}`,
					}}
				>
					{pending === 0 ? "Idle" : "Active"}
				</span>
			</div>
			<div className="space-y-2">
				{(["total_work_units", "completed_work_units", "in_progress_work_units", "pending_work_units"] as const).map((key) => (
					<div key={key} className="flex justify-between text-xs">
						<span className="capitalize" style={{ color: "var(--text-3)" }}>
							{key.replace(/_work_units$/, "").replace(/_/g, " ")}
						</span>
						<span className="font-mono font-medium" style={{ color: "var(--text-1)" }}>
							{data[key]}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export function Dashboard() {
	const [page] = useState(1);
	const { data, isLoading, error } = useWorkspaces(page, 6);

	const workspaces = (data as { items?: Array<{ id: string; created_at?: string }> } | undefined)?.items ?? [];
	const total = (data as { total?: number } | undefined)?.total ?? 0;

	return (
		<div className="page-container">
			<motion.div
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-8"
			>
				<div className="flex items-center gap-2 mb-1">
					<LayoutDashboard className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
						Dashboard
					</h1>
				</div>
				<p className="text-sm" style={{ color: "var(--text-2)" }}>
					Overview of your Honcho instance
				</p>
			</motion.div>

			<ErrorAlert error={error instanceof Error ? error : null} />
			{isLoading && <PageLoader />}

			{!isLoading && (
				<div className="space-y-4">
					{/* Stat row */}
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.05 }}
						className="grid grid-cols-1 sm:grid-cols-3 gap-3"
					>
						{[
							{ label: "Workspaces", value: total, icon: Boxes },
						].map((stat) => {
							const Icon = stat.icon;
							return (
								<div key={stat.label} className="rounded-xl p-5 theme-card">
									<Icon className="w-5 h-5 mb-3" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
									<div className="text-3xl font-semibold font-mono" style={{ color: "var(--text-1)" }}>
										{stat.value}
									</div>
									<div className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
										{stat.label}
									</div>
								</div>
							);
						})}
					</motion.div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{/* Workspace list */}
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="rounded-xl p-5 theme-card"
						>
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<Boxes className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
									<h2 className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
										Recent Workspaces
									</h2>
								</div>
								<Link
									to="/workspaces"
									className="text-xs transition-colors"
									style={{ color: "var(--accent-text)" }}
								>
									View all →
								</Link>
							</div>

							{workspaces.length === 0 ? (
								<p className="text-sm" style={{ color: "var(--text-3)" }}>No workspaces found.</p>
							) : (
								<div className="space-y-1">
									{workspaces.map((ws) => (
										<Link
											key={ws.id}
											to="/workspaces/$workspaceId"
											params={{ workspaceId: ws.id } as never}
											className="flex items-center justify-between py-2 px-3 rounded-lg transition-all group"
											style={{ color: "var(--text-2)" }}
										>
											<span
												className="font-mono text-xs truncate"
												style={{ color: "var(--accent-text)" }}
											>
												{ws.id}
											</span>
											<span
												className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
												style={{ color: "var(--text-4)" }}
											>
												→
											</span>
										</Link>
									))}
								</div>
							)}
						</motion.div>

						{/* Queue for first workspace */}
						{workspaces[0] && (
							<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.15 }}
							>
								<QueueCard workspaceId={workspaces[0].id} />
							</motion.div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
