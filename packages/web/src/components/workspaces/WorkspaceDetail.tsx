import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
	Activity,
	Boxes,
	ChevronDown,
	CircleDot,
	Lightbulb,
	MessageSquare,
	Trash2,
	Users,
	Webhook,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { useDeleteWorkspace, useQueueStatus, useScheduleDream, useWorkspace } from "@/api/queries";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { Skeleton } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Body, Caption, PageTitle, SectionHeading } from "@/components/ui/typography";
import { ScheduleDreamModal } from "@/components/workspaces/ScheduleDreamModal";
import { useDemo } from "@/hooks/useDemo";
import { useMetadata } from "@/hooks/useMetadata";
import { COLOR } from "@/lib/constants";

const NAV_SECTIONS = [
	{
		label: "Peers",
		icon: Users,
		to: "peers" as const,
		description: "Browse peer identities and memory",
	},
	{
		label: "Sessions",
		icon: MessageSquare,
		to: "sessions" as const,
		description: "View conversation sessions",
	},
	{
		label: "Conclusions",
		icon: Lightbulb,
		to: "conclusions" as const,
		description: "Browse memory conclusions",
	},
	{
		label: "Webhooks",
		icon: Webhook,
		to: "webhooks" as const,
		description: "Manage event webhooks",
	},
	{
		label: "Queue & dreams",
		icon: Activity,
		to: "queue" as const,
		description: "Live view of in-flight work",
	},
] as const;

export function WorkspaceDetail() {
	const { mask } = useDemo();
	const { showMetadata } = useMetadata();
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	const navigate = useNavigate();

	const { data: workspace, isLoading, error } = useWorkspace(workspaceId);
	const { data: queue } = useQueueStatus(workspaceId);

	const deleteWorkspace = useDeleteWorkspace();
	const scheduleDream = useScheduleDream(workspaceId);

	const [confirmDelete, setConfirmDelete] = useState(false);
	const [dreamOpen, setDreamOpen] = useState(false);
	const [sessionsExpanded, setSessionsExpanded] = useState(false);

	const handleDelete = async () => {
		await deleteWorkspace.mutateAsync(workspaceId);
		navigate({ to: "/workspaces" as never });
	};

	return (
		<div className="page-container page-container--wide">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<Breadcrumb />
				<div className="flex items-start justify-between gap-4 mb-1">
					<div className="flex items-center gap-2 min-w-0">
						<Boxes
							className="w-5 h-5 flex-shrink-0"
							style={{ color: "var(--accent)" }}
							strokeWidth={1.5}
						/>
						<PageTitle className="font-mono break-all">{mask(workspaceId)}</PageTitle>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						<Button variant="accent" size="sm" onClick={() => setDreamOpen(true)}>
							<Zap className="w-3.5 h-3.5" strokeWidth={2} />
							Schedule Dream
						</Button>
						<Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
							<Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
							Delete
						</Button>
					</div>
				</div>
				<Body className="leading-none">Workspace overview</Body>
			</motion.div>

			<div className="mt-8">
				<ErrorAlert error={error instanceof Error ? error : null} />
				{isLoading && <WorkspaceDetailSkeleton />}

				{!isLoading && workspace && (
					<div className="space-y-4">
						{/* Nav cards */}
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
							{NAV_SECTIONS.map((s, i) => {
								const Icon = s.icon;
								return (
									<motion.div
										key={s.to}
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }}
									>
										<Link
											to={`/workspaces/$workspaceId/${s.to}` as never}
											params={{ workspaceId } as never}
											className="block h-full rounded-xl p-5 group transition-all theme-card"
										>
											<Icon
												className="w-5 h-5 mb-3"
												style={{ color: "var(--accent)" }}
												strokeWidth={1.5}
											/>
											<SectionHeading className="mb-0.5">{s.label}</SectionHeading>
											<Caption as="p">{s.description}</Caption>
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
								transition={{ delay: 0.28 }}
								className="rounded-xl p-5 theme-card"
							>
								<div className="flex items-center justify-between mb-4">
									<SectionHeading className="mb-0">Queue Status</SectionHeading>
									<div className="flex items-center gap-1.5">
										{queue.pending_work_units > 0 ? (
											<motion.div
												animate={{ opacity: [0.5, 1, 0.5] }}
												transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
											>
												<CircleDot
													className="w-3.5 h-3.5"
													style={{ color: COLOR.warning }}
													strokeWidth={2}
												/>
											</motion.div>
										) : (
											<CircleDot
												className="w-3.5 h-3.5"
												style={{ color: COLOR.success }}
												strokeWidth={2}
											/>
										)}
										<span
											className="text-xs font-medium"
											style={{
												color: queue.pending_work_units > 0 ? COLOR.warning : COLOR.success,
											}}
										>
											{queue.pending_work_units === 0
												? "Idle"
												: `${queue.pending_work_units} pending`}
										</span>
									</div>
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
									{(
										[
											"total_work_units",
											"completed_work_units",
											"in_progress_work_units",
											"pending_work_units",
										] as const
									).map((key) => (
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

								{/* Per-session breakdown */}
								{queue.sessions && Object.keys(queue.sessions).length > 0 && (
									<div>
										<button
											type="button"
											onClick={() => setSessionsExpanded((v) => !v)}
											className="flex items-center gap-1.5 text-xs font-medium w-full text-left"
											style={{ color: "var(--text-3)" }}
										>
											<motion.div
												animate={{ rotate: sessionsExpanded ? 0 : -90 }}
												transition={{ duration: 0.15 }}
											>
												<ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
											</motion.div>
											{Object.keys(queue.sessions).length} session
											{Object.keys(queue.sessions).length !== 1 ? "s" : ""}
										</button>
										<AnimatePresence initial={false}>
											{sessionsExpanded && (
												<motion.div
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: "auto", opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.2 }}
													className="overflow-hidden"
												>
													<div
														className="mt-3 rounded-lg overflow-hidden"
														style={{ border: "1px solid var(--border)" }}
													>
														<table className="w-full text-xs">
															<thead>
																<tr
																	style={{
																		background: "var(--bg-3)",
																		borderBottom: "1px solid var(--border)",
																	}}
																>
																	{["Session", "Total", "Done", "Active", "Pending"].map((h) => (
																		<th
																			key={h}
																			className={`py-2 px-3 font-medium text-left ${h !== "Session" ? "text-right" : ""}`}
																			style={{ color: "var(--text-3)" }}
																		>
																			{h}
																		</th>
																	))}
																</tr>
															</thead>
															<tbody>
																{Object.entries(queue.sessions).map(([sid, s], i) => (
																	<tr
																		key={sid}
																		style={{
																			borderTop: i > 0 ? "1px solid var(--border)" : undefined,
																		}}
																	>
																		<td className="py-1.5 px-3">
																			<Link
																				to={"/workspaces/$workspaceId/sessions/$sessionId" as never}
																				params={{ workspaceId, sessionId: sid } as never}
																				className="font-mono truncate block max-w-[180px] hover:underline"
																				style={{ color: "var(--accent-text)" }}
																			>
																				{mask(sid)}
																			</Link>
																		</td>
																		<td
																			className="py-1.5 px-3 text-right font-mono"
																			style={{ color: "var(--text-2)" }}
																		>
																			{s.total_work_units}
																		</td>
																		<td
																			className="py-1.5 px-3 text-right font-mono"
																			style={{ color: COLOR.success }}
																		>
																			{s.completed_work_units}
																		</td>
																		<td
																			className="py-1.5 px-3 text-right font-mono"
																			style={{ color: COLOR.warning }}
																		>
																			{s.in_progress_work_units}
																		</td>
																		<td
																			className="py-1.5 px-3 text-right font-mono"
																			style={{ color: "var(--text-3)" }}
																		>
																			{s.pending_work_units}
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								)}
							</motion.div>
						)}

						{/* Metadata — global toggle */}
						<AnimatePresence>
							{showMetadata && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.2 }}
									className="overflow-hidden"
								>
									<div
										className="rounded-xl p-5"
										style={{
											background: "rgba(245,158,11,0.04)",
											border: "1px solid rgba(245,158,11,0.2)",
										}}
									>
										<SectionHeading style={{ color: COLOR.warning }}>Metadata</SectionHeading>
										<JsonViewer data={workspace.metadata} />
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={confirmDelete}
				title="Delete workspace"
				description={`This will permanently delete workspace "${mask(workspaceId)}" and all its data. This cannot be undone.`}
				confirmLabel="Delete workspace"
				onConfirm={handleDelete}
				onCancel={() => setConfirmDelete(false)}
				loading={deleteWorkspace.isPending}
			/>

			<ScheduleDreamModal
				open={dreamOpen}
				workspaceId={workspaceId}
				onClose={() => setDreamOpen(false)}
				mutation={scheduleDream}
			/>
		</div>
	);
}

function WorkspaceDetailSkeleton() {
	return (
		<div className="space-y-4" aria-hidden="true">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className="rounded-xl p-5 theme-card">
						<Skeleton accent className="h-5 w-5 rounded" />
						<Skeleton className="mt-4 h-4 w-24 rounded" />
						<Skeleton className="mt-3 h-3 w-32 rounded" />
						<Skeleton className="mt-2 h-3 w-24 rounded" />
					</div>
				))}
			</div>

			<div className="rounded-xl p-5 theme-card">
				<div className="flex items-center justify-between mb-4">
					<Skeleton className="h-4 w-28 rounded" />
					<Skeleton className="h-4 w-20 rounded" />
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index}>
							<Skeleton accent className="h-8 w-12 rounded" />
							<Skeleton className="mt-2 h-3 w-16 rounded" />
						</div>
					))}
				</div>
			</div>

			<div className="rounded-xl p-5 theme-card">
				<Skeleton className="h-4 w-20 rounded" />
				<Skeleton className="mt-4 h-3 w-full rounded" />
				<Skeleton className="mt-2 h-3 w-[92%] rounded" />
				<Skeleton className="mt-2 h-3 w-[64%] rounded" />
			</div>
		</div>
	);
}
