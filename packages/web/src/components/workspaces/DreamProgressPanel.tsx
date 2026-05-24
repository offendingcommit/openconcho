import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CircleDot, Info, Sparkles, TimerReset } from "lucide-react";
import { QUEUE_REFETCH_ACTIVE_MS, QUEUE_REFETCH_IDLE_MS } from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { Skeleton } from "@/components/shared/Skeleton";
import { Body, Caption, Muted, SectionHeading } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import { type StaleQueueState, useStaleQueueDetection } from "@/hooks/useStaleQueueDetection";
import { COLOR } from "@/lib/constants";
import { formatCount } from "@/lib/utils";

type QueueStatus = components["schemas"]["QueueStatus"];

export interface DreamProgressPanelProps {
	workspaceId: string;
	data: QueueStatus | undefined;
	isLoading: boolean;
	error: Error | null;
	/** Override the stale-detection hook output (used by the dev showcase). */
	staleOverride?: StaleQueueState;
}

function formatElapsed(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

export function DreamProgressPanel({
	workspaceId,
	data,
	isLoading,
	error,
	staleOverride,
}: DreamProgressPanelProps) {
	const { mask } = useDemo();
	const detected = useStaleQueueDetection(data);
	const stale = staleOverride ?? detected;

	const inProgress = data?.in_progress_work_units ?? 0;
	const pending = data?.pending_work_units ?? 0;
	const completed = data?.completed_work_units ?? 0;
	const total = data?.total_work_units ?? 0;
	const active = inProgress + pending;
	const isActive = active > 0;

	const pollSeconds = isActive
		? Math.round(QUEUE_REFETCH_ACTIVE_MS / 100) / 10
		: Math.round(QUEUE_REFETCH_IDLE_MS / 100) / 10;

	if (error) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				className="rounded-xl p-5 theme-card"
				style={{
					background: COLOR.destructiveDim,
					border: `1px solid ${COLOR.destructiveBorder}`,
				}}
			>
				<SectionHeading style={{ color: COLOR.destructive }} className="mb-1">
					Could not load queue status
				</SectionHeading>
				<Caption as="p">{error.message}</Caption>
			</motion.div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className="rounded-xl theme-card overflow-hidden"
			data-testid="dream-progress-panel"
		>
			{/* Header */}
			<div
				className="flex items-center justify-between px-5 py-4"
				style={{ borderBottom: "1px solid var(--border)" }}
			>
				<div className="flex items-center gap-2 min-w-0">
					<Sparkles
						className="w-4 h-4 flex-shrink-0"
						style={{ color: "var(--accent)" }}
						strokeWidth={1.5}
					/>
					<SectionHeading className="mb-0">Dreams in progress</SectionHeading>
				</div>
				<div className="flex items-center gap-1.5 flex-shrink-0">
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
						data-testid="dream-progress-status"
					>
						{isActive ? `${formatCount(active)} active` : "Idle"}
					</span>
					<span className="mx-1 text-xs" style={{ color: "var(--text-4)" }}>
						·
					</span>
					<span className="text-xs font-mono" style={{ color: "var(--text-4)" }}>
						polling every {pollSeconds}s
					</span>
				</div>
			</div>

			{/* Stale warning */}
			{stale.isStale && stale.stalledSince !== null && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					className="overflow-hidden"
					data-testid="stale-dream-warning"
				>
					<div
						className="flex items-start gap-2 px-5 py-3"
						style={{
							background: COLOR.warningDim,
							borderBottom: `1px solid ${COLOR.warningBorder}`,
						}}
					>
						<AlertTriangle
							className="w-4 h-4 flex-shrink-0 mt-0.5"
							style={{ color: COLOR.warning }}
							strokeWidth={2}
						/>
						<div className="min-w-0">
							<Body className="font-medium" style={{ color: COLOR.warning }}>
								Stalled for {formatElapsed(stale.elapsedMs)} without forward progress
							</Body>
							<Caption as="p" className="mt-0.5">
								Work has been in-flight since {new Date(stale.stalledSince).toLocaleTimeString()}{" "}
								with no advance in the completed count. A specialist may be hung — check Honcho
								logs.
							</Caption>
						</div>
					</div>
				</motion.div>
			)}

			{/* Counts */}
			<div className="px-5 py-5">
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					{(
						[
							{ label: "Total", value: total, color: "var(--text-1)" },
							{ label: "Done", value: completed, color: COLOR.success },
							{ label: "In progress", value: inProgress, color: COLOR.warning },
							{ label: "Pending", value: pending, color: "var(--text-3)" },
						] as const
					).map(({ label, value, color }) => (
						<div key={label}>
							{isLoading ? (
								<Skeleton accent className="h-8 w-16 rounded" />
							) : (
								<div
									className="text-2xl font-semibold font-mono"
									style={{ color }}
									data-testid={`count-${label.toLowerCase().replace(/\s+/g, "-")}`}
								>
									{formatCount(value)}
								</div>
							)}
							<Caption as="div" className="mt-0.5">
								{label}
							</Caption>
						</div>
					))}
				</div>

				{/* API limitation note */}
				<div
					className="flex items-start gap-2 mt-5 rounded-lg px-3 py-2"
					style={{
						background: COLOR.accentSubtle,
						border: `1px solid ${COLOR.accentBorder}`,
					}}
				>
					<Info
						className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
						style={{ color: COLOR.accentText }}
						strokeWidth={2}
					/>
					<Caption as="p">
						Honcho's <code className="font-mono">/queue/status</code> exposes aggregate counts only.
						Per-dream observer/observed pair, specialist phase (deduction vs. induction), and token
						telemetry are tracked in{" "}
						<a
							href="https://github.com/plastic-labs/honcho/issues/724"
							target="_blank"
							rel="noreferrer"
							style={{ color: COLOR.accentText }}
							className="underline"
						>
							plastic-labs/honcho#724
						</a>{" "}
						— once the API exposes them, this panel will surface them.
					</Caption>
				</div>
			</div>

			<SessionsTable workspaceId={workspaceId} sessions={data?.sessions} mask={mask} />
		</motion.div>
	);
}

function SessionsTable({
	workspaceId,
	sessions,
	mask,
}: {
	workspaceId: string;
	sessions: QueueStatus["sessions"];
	mask: (s: string) => string;
}) {
	const entries = sessions ? Object.entries(sessions) : [];
	if (entries.length === 0) {
		return (
			<div className="px-5 pb-5">
				<div
					className="flex items-center gap-2 rounded-lg px-3 py-3"
					style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}
				>
					<Activity className="w-3.5 h-3.5" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
					<Muted className="text-xs">No session-scoped work tracked right now.</Muted>
				</div>
			</div>
		);
	}

	return (
		<div className="px-5 pb-5">
			<div className="flex items-center gap-1.5 mb-2">
				<TimerReset className="w-3.5 h-3.5" style={{ color: "var(--text-3)" }} strokeWidth={1.5} />
				<Caption>
					{entries.length} session{entries.length !== 1 ? "s" : ""} with active work
				</Caption>
			</div>
			<div
				className="rounded-lg overflow-hidden"
				style={{ border: "1px solid var(--border)" }}
				data-testid="sessions-table"
			>
				<table className="w-full text-xs">
					<thead>
						<tr
							style={{
								background: "var(--bg-3)",
								borderBottom: "1px solid var(--border)",
							}}
						>
							{["Session", "Total", "Done", "In progress", "Pending"].map((h) => (
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
						{entries.map(([sid, s], i) => (
							<tr key={sid} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
								<td className="py-1.5 px-3">
									<Link
										to={"/workspaces/$workspaceId/sessions/$sessionId" as never}
										params={{ workspaceId, sessionId: sid } as never}
										className="font-mono truncate block max-w-[220px] hover:underline"
										style={{ color: "var(--accent-text)" }}
									>
										{mask(sid)}
									</Link>
								</td>
								<td className="py-1.5 px-3 text-right font-mono" style={{ color: "var(--text-2)" }}>
									{s.total_work_units}
								</td>
								<td className="py-1.5 px-3 text-right font-mono" style={{ color: COLOR.success }}>
									{s.completed_work_units}
								</td>
								<td className="py-1.5 px-3 text-right font-mono" style={{ color: COLOR.warning }}>
									{s.in_progress_work_units}
								</td>
								<td className="py-1.5 px-3 text-right font-mono" style={{ color: "var(--text-3)" }}>
									{s.pending_work_units}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
