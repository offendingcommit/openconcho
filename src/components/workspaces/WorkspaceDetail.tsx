import { Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Boxes, Users, MessageSquare, Lightbulb, ArrowLeft, CircleDot } from "lucide-react";
import { useWorkspace, useQueueStatus } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { JsonViewer } from "@/components/shared/JsonViewer";

const sections = [
	{ label: "Peers", icon: Users, to: "peers" as const, description: "Browse peer identities and memory" },
	{ label: "Sessions", icon: MessageSquare, to: "sessions" as const, description: "View conversation sessions" },
	{ label: "Conclusions", icon: Lightbulb, to: "conclusions" as const, description: "Browse memory conclusions" },
];

export function WorkspaceDetail() {
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	const { data: workspace, isLoading, error } = useWorkspace(workspaceId);
	const { data: queue } = useQueueStatus(workspaceId);

	return (
		<div className="page-container">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<Link
					to="/workspaces"
					className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
					style={{ color: "var(--text-3)" }}
				>
					<ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
					Workspaces
				</Link>
				<div className="flex items-center gap-2 mb-1">
					<Boxes className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<h1
						className="text-xl font-semibold font-mono break-all tracking-tight"
						style={{ color: "var(--text-1)" }}
					>
						{workspaceId}
					</h1>
				</div>
				<p className="text-sm" style={{ color: "var(--text-2)" }}>Workspace overview</p>
			</motion.div>

			<div className="mt-8">
				<ErrorAlert error={error instanceof Error ? error : null} />
				{isLoading && <PageLoader />}

				{!isLoading && workspace && (
					<div className="space-y-4">
						{/* Nav cards */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							{sections.map((s, i) => {
								const Icon = s.icon;
								return (
									<motion.div
										key={s.to}
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: i * 0.07, type: "spring", stiffness: 300, damping: 25 }}
									>
										<Link
											to={`/workspaces/$workspaceId/${s.to}` as never}
											params={{ workspaceId } as never}
											className="block rounded-xl p-5 group transition-all theme-card"
										>
											<Icon
												className="w-5 h-5 mb-3"
												style={{ color: "var(--accent)" }}
												strokeWidth={1.5}
											/>
											<h2
												className="text-sm font-medium mb-0.5"
												style={{ color: "var(--text-1)" }}
											>
												{s.label}
											</h2>
											<p className="text-xs" style={{ color: "var(--text-3)" }}>
												{s.description}
											</p>
										</Link>
									</motion.div>
								);
							})}
						</div>

						{/* Queue status */}
						{queue && (
							<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.25 }}
								className="rounded-xl p-5 theme-card"
							>
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
										Queue Status
									</h2>
									<div className="flex items-center gap-1.5">
										{queue.pending_work_units > 0 ? (
											<motion.div
												animate={{ opacity: [0.5, 1, 0.5] }}
												transition={{ duration: 1.5, repeat: Infinity }}
											>
												<CircleDot className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} strokeWidth={2} />
											</motion.div>
										) : (
											<CircleDot className="w-3.5 h-3.5" style={{ color: "#34d399" }} strokeWidth={2} />
										)}
										<span
											className="text-xs font-medium"
											style={{ color: queue.pending_work_units > 0 ? "#f59e0b" : "#34d399" }}
										>
											{queue.pending_work_units === 0 ? "Idle" : `${queue.pending_work_units} pending`}
										</span>
									</div>
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
									{(["total_work_units", "completed_work_units", "in_progress_work_units", "pending_work_units"] as const).map((key) => (
										<div key={key}>
											<div
												className="text-2xl font-semibold font-mono"
												style={{ color: "var(--text-1)" }}
											>
												{queue[key]}
											</div>
											<div className="text-xs capitalize mt-0.5" style={{ color: "var(--text-3)" }}>
												{key.replace(/_work_units$/, "").replace(/_/g, " ")}
											</div>
										</div>
									))}
								</div>
							</motion.div>
						)}

						{/* Metadata */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.35 }}
							className="rounded-xl p-5 theme-card"
						>
							<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>
								Metadata
							</h2>
							<JsonViewer data={workspace.metadata} />
						</motion.div>
					</div>
				)}
			</div>
		</div>
	);
}
