import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Boxes, ChevronRight, CircleDot, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useQueueStatus, useWorkspaces } from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Skeleton } from "@/components/shared/Skeleton";
import { Body, Muted, PageTitle, SectionHeading } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import { COLOR } from "@/lib/constants";
import { formatCount } from "@/lib/utils";

type QueueStatus = components["schemas"]["QueueStatus"];

// ─── Per-workspace queue row ─────────────────────────────────────────────────

function WorkspaceQueueRow({ workspaceId }: { workspaceId: string }) {
	const { mask } = useDemo();
	const { data, isLoading } = useQueueStatus(workspaceId);

	const pending = data?.pending_work_units ?? 0;
	const active = data?.in_progress_work_units ?? 0;
	const done = data?.completed_work_units ?? 0;
	const total = data?.total_work_units ?? 0;
	const isActive = active > 0 || pending > 0;

	return (
		<tr
			style={{
				borderTop: "1px solid var(--border)",
				background: isActive ? COLOR.warningDim : undefined,
			}}
		>
			<td className="py-2 px-4">
				<Link
					to="/workspaces/$workspaceId"
					params={{ workspaceId } as never}
					className="flex items-center gap-2 group"
				>
					<span
						className="font-mono text-xs truncate max-w-[200px] group-hover:underline"
						style={{ color: "var(--accent-text)" }}
					>
						{mask(workspaceId)}
					</span>
					<ChevronRight
						className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0"
						style={{ color: "var(--accent)" }}
						strokeWidth={2}
					/>
				</Link>
			</td>

			<td className="py-2 px-4 text-right">
				{isLoading ? (
					<span className="text-xs font-mono" style={{ color: "var(--text-4)" }}>
						…
					</span>
				) : (
					<div className="flex items-center justify-end gap-1.5">
						{isActive ? (
							<motion.div
								animate={{ opacity: [0.5, 1, 0.5] }}
								transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
							>
								<CircleDot className="w-3 h-3" style={{ color: COLOR.warning }} strokeWidth={2} />
							</motion.div>
						) : (
							<CircleDot className="w-3 h-3" style={{ color: COLOR.success }} strokeWidth={2} />
						)}
						<span
							className="text-xs font-medium"
							style={{ color: isActive ? COLOR.warning : COLOR.success }}
						>
							{isActive ? `${formatCount(pending + active)} pending` : "Idle"}
						</span>
					</div>
				)}
			</td>

			{(
				[
					{ key: "total", val: total, color: "var(--text-2)" },
					{ key: "done", val: done, color: COLOR.success },
					{ key: "active", val: active, color: COLOR.warning },
					{ key: "pending", val: pending, color: "var(--text-3)" },
				] satisfies Array<{ key: string; val: number; color: string }>
			).map(({ key, val, color }) => (
				<td
					key={key}
					className="py-2 px-4 text-right font-mono text-xs"
					style={{ color: isLoading ? "var(--text-4)" : color }}
				>
					{isLoading ? "—" : formatCount(val)}
				</td>
			))}
		</tr>
	);
}

// ─── Aggregate banner ─────────────────────────────────────────────────────────
// Each workspace row already called useQueueStatus — TanStack Query deduplicates
// the fetches so calling the same hooks here just reads from cache.

function GlobalQueueBanner({ workspaces }: { workspaces: Array<{ id: string }> }) {
	const statuses = workspaces.map((ws) => {
		const { data } = useQueueStatus(ws.id);
		return data as QueueStatus | undefined;
	});

	const totalPending = statuses.reduce((s, d) => s + (d?.pending_work_units ?? 0), 0);
	const totalActive = statuses.reduce((s, d) => s + (d?.in_progress_work_units ?? 0), 0);
	const totalDone = statuses.reduce((s, d) => s + (d?.completed_work_units ?? 0), 0);
	const allLoaded = statuses.every((d) => d !== undefined);

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{(
				[
					{ label: "Workspaces", value: workspaces.length, color: "var(--text-1)", always: true },
					{ label: "Total done", value: totalDone, color: COLOR.success, always: false },
					{ label: "Active", value: totalActive, color: COLOR.warning, always: false },
					{
						label: "Pending",
						value: totalPending,
						color: totalPending > 0 ? COLOR.warning : "var(--text-3)",
						always: false,
					},
				] as Array<{ label: string; value: number; color: string; always: boolean }>
			).map(({ label, value, color, always }) => (
				<div key={label} className="rounded-xl p-4 theme-card">
					<div
						className="text-2xl font-semibold font-mono"
						style={{ color: allLoaded || always ? color : "var(--text-4)" }}
					>
						{allLoaded || always ? formatCount(value) : "—"}
					</div>
					<div className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
						{label}
					</div>
				</div>
			))}
		</div>
	);
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function Dashboard() {
	const [page] = useState(1);
	const { data, isLoading, error } = useWorkspaces(page, 50);

	const workspaces =
		(data as { items?: Array<{ id: string; created_at?: string }> } | undefined)?.items ?? [];
	const total = (data as { total?: number } | undefined)?.total ?? 0;

	return (
		<div className="page-container page-container--xl">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
				<div className="flex items-center gap-2 mb-1">
					<LayoutDashboard
						className="w-5 h-5"
						style={{ color: "var(--accent)" }}
						strokeWidth={1.5}
					/>
					<PageTitle>Dashboard</PageTitle>
					{total > 0 && (
						<span
							className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full"
							style={{
								background: COLOR.accentSubtle,
								color: COLOR.accentText,
								border: `1px solid ${COLOR.accentBorder}`,
							}}
						>
							{total} workspace{total !== 1 ? "s" : ""}
						</span>
					)}
				</div>
				<Body className="leading-none">Overview of your Honcho instance</Body>
			</motion.div>

			<ErrorAlert error={error instanceof Error ? error : null} />
			{isLoading && <DashboardSkeleton />}

			{!isLoading && workspaces.length > 0 && (
				<div className="space-y-4">
					{/* Aggregate stat row */}
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.05 }}
					>
						<GlobalQueueBanner workspaces={workspaces} />
					</motion.div>

					{/* Per-workspace queue table */}
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.12 }}
						className="rounded-xl theme-card overflow-hidden"
					>
						<div
							className="flex items-center gap-2 px-4 py-3"
							style={{ borderBottom: "1px solid var(--border)" }}
						>
							<Activity className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
							<SectionHeading className="mb-0">Queue Status</SectionHeading>
							<span className="text-xs ml-1" style={{ color: "var(--text-4)" }}>
								all workspaces · live polling
							</span>
						</div>

						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr style={{ background: "var(--bg-3)" }}>
										{["Workspace", "Status", "Total", "Done", "Active", "Pending"].map((h) => (
											<th
												key={h}
												className={`py-2 px-4 font-medium text-left ${h !== "Workspace" && h !== "Status" ? "text-right" : ""}`}
												style={{ color: "var(--text-3)" }}
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{workspaces.map((ws) => (
										<WorkspaceQueueRow key={ws.id} workspaceId={ws.id} />
									))}
								</tbody>
							</table>
						</div>
					</motion.div>

					{total > workspaces.length && (
						<p className="text-xs text-center" style={{ color: "var(--text-4)" }}>
							Showing {workspaces.length} of {total} workspaces.{" "}
							<Link
								to="/workspaces"
								className="hover:underline"
								style={{ color: "var(--accent-text)" }}
							>
								View all →
							</Link>
						</p>
					)}
				</div>
			)}

			{!isLoading && workspaces.length === 0 && (
				<div className="rounded-xl p-10 text-center theme-card">
					<Boxes
						className="w-8 h-8 mx-auto mb-3"
						style={{ color: "var(--text-4)" }}
						strokeWidth={1}
					/>
					<Muted>No workspaces found.</Muted>
				</div>
			)}
		</div>
	);
}

function DashboardSkeleton() {
	return (
		<div className="space-y-4" aria-hidden="true">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className="rounded-xl p-4 theme-card">
						<Skeleton accent={index === 0} className="h-8 w-16 rounded-lg" />
						<Skeleton className="mt-3 h-3 w-20 rounded" />
					</div>
				))}
			</div>

			<div className="rounded-xl theme-card overflow-hidden">
				<div
					className="flex items-center gap-2 px-4 py-3"
					style={{ borderBottom: "1px solid var(--border)" }}
				>
					<Skeleton accent className="h-4 w-4 rounded" />
					<Skeleton className="h-4 w-28 rounded" />
					<Skeleton className="ml-1 h-3 w-32 rounded" />
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr style={{ background: "var(--bg-3)" }}>
								{Array.from({ length: 6 }).map((_, index) => (
									<th key={index} className="px-4 py-2 text-left">
										<Skeleton className="h-3 w-14 rounded" />
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{Array.from({ length: 5 }).map((_, rowIndex) => (
								<tr key={rowIndex} style={{ borderTop: "1px solid var(--border)" }}>
									<td className="px-4 py-3">
										<Skeleton accent className="h-3 w-28 rounded" />
									</td>
									<td className="px-4 py-3">
										<div className="flex justify-end">
											<Skeleton className="h-3 w-20 rounded" />
										</div>
									</td>
									{Array.from({ length: 4 }).map((__, cellIndex) => (
										<td key={cellIndex} className="px-4 py-3">
											<div className="flex justify-end">
												<Skeleton className="h-3 w-8 rounded" />
											</div>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
