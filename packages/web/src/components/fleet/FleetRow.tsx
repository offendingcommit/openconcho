import { useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CircleDot } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import {
	scopedConclusionsCountOptions,
	scopedQueueStatusOptions,
	useScopedWorkspaces,
} from "@/api/compareQueries";
import type { components } from "@/api/schema.d.ts";
import { HealthDot } from "@/components/shared/HealthDot";
import { useDemo } from "@/hooks/useDemo";
import type { Instance } from "@/lib/config";
import { COLOR } from "@/lib/constants";
import { formatCount } from "@/lib/utils";
import type { FleetRowMetrics } from "./fleetAggregates";

type Workspace = components["schemas"]["Workspace"];
type QueueStatus = components["schemas"]["QueueStatus"];
type ConclusionPage = components["schemas"]["Page_Conclusion_"];

interface Props {
	instance: Instance;
	onMetrics: (id: string, metrics: FleetRowMetrics) => void;
}

function shallowEqualMetrics(a: FleetRowMetrics, b: FleetRowMetrics): boolean {
	return (
		a.workspaceCount === b.workspaceCount &&
		a.conclusionCount === b.conclusionCount &&
		a.queueActive === b.queueActive &&
		a.queuePending === b.queuePending &&
		a.lastSeen === b.lastSeen &&
		a.health === b.health
	);
}

function formatRelative(ts: number | null): string {
	if (!ts) return "—";
	const seconds = Math.round((Date.now() - ts) / 1000);
	if (seconds < 5) return "just now";
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	return `${days}d ago`;
}

export function FleetRow({ instance, onMetrics }: Props) {
	const { mask } = useDemo();
	const workspacesQ = useScopedWorkspaces(instance, 1, 100);

	const workspaces: Workspace[] = useMemo(
		() => (workspacesQ.data as { items?: Workspace[] } | undefined)?.items ?? [],
		[workspacesQ.data],
	);
	const totalWorkspaces =
		(workspacesQ.data as { total?: number } | undefined)?.total ?? workspaces.length;

	const queueResults = useQueries({
		queries: workspaces.map((ws) => scopedQueueStatusOptions(instance, ws.id)),
	});
	const conclusionsResults = useQueries({
		queries: workspaces.map((ws) => scopedConclusionsCountOptions(instance, ws.id)),
	});

	const queueActive = queueResults.reduce(
		(s, q) => s + ((q.data as QueueStatus | undefined)?.in_progress_work_units ?? 0),
		0,
	);
	const queuePending = queueResults.reduce(
		(s, q) => s + ((q.data as QueueStatus | undefined)?.pending_work_units ?? 0),
		0,
	);
	const conclusionCount = conclusionsResults.reduce(
		(s, c) => s + ((c.data as ConclusionPage | undefined)?.total ?? 0),
		0,
	);

	const health: FleetRowMetrics["health"] = workspacesQ.isError
		? "unreachable"
		: workspacesQ.isSuccess
			? "ok"
			: "loading";
	const lastSeen = workspacesQ.dataUpdatedAt > 0 ? workspacesQ.dataUpdatedAt : null;

	const isActive = queueActive > 0 || queuePending > 0;
	const isLoading =
		workspacesQ.isLoading ||
		queueResults.some((q) => q.isLoading) ||
		conclusionsResults.some((c) => c.isLoading);

	const metrics: FleetRowMetrics = useMemo(
		() => ({
			workspaceCount: totalWorkspaces,
			conclusionCount,
			queueActive,
			queuePending,
			lastSeen,
			health,
		}),
		[totalWorkspaces, conclusionCount, queueActive, queuePending, lastSeen, health],
	);

	const lastReported = useRef<FleetRowMetrics | null>(null);
	useEffect(() => {
		if (lastReported.current && shallowEqualMetrics(lastReported.current, metrics)) return;
		lastReported.current = metrics;
		onMetrics(instance.id, metrics);
	}, [instance.id, metrics, onMetrics]);

	const hostname = instance.baseUrl.replace(/^https?:\/\//, "");

	return (
		<tr
			data-testid={`fleet-row-${instance.id}`}
			style={{
				borderTop: "1px solid var(--border)",
				background: isActive ? COLOR.warningDim : undefined,
			}}
		>
			<td className="py-2.5 px-4">
				<div className="flex items-center gap-2 min-w-0">
					<HealthDot
						status={health === "ok" ? "ok" : health === "unreachable" ? "unreachable" : "checking"}
					/>
					<div className="min-w-0">
						<div className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
							{instance.name}
						</div>
						<div
							className="text-xs font-mono truncate max-w-[16rem]"
							style={{ color: "var(--text-4)" }}
							title={mask(hostname)}
						>
							{mask(hostname)}
						</div>
					</div>
				</div>
			</td>

			<td className="py-2.5 px-4 text-right font-mono text-xs" style={{ color: "var(--text-2)" }}>
				{workspacesQ.isLoading ? "—" : formatCount(totalWorkspaces)}
			</td>

			<td className="py-2.5 px-4 text-right font-mono text-xs" style={{ color: "var(--text-2)" }}>
				{isLoading ? "—" : formatCount(conclusionCount)}
			</td>

			<td className="py-2.5 px-4 text-right">
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
							<CircleDot
								className="w-3 h-3"
								style={{ color: health === "ok" ? COLOR.success : "var(--text-4)" }}
								strokeWidth={2}
							/>
						)}
						<span
							className="text-xs font-medium font-mono"
							style={{ color: isActive ? COLOR.warning : "var(--text-3)" }}
						>
							{isActive ? `${formatCount(queueActive)}/${formatCount(queuePending)}` : "idle"}
						</span>
					</div>
				)}
			</td>

			<td
				className="py-2.5 px-4 text-right text-xs font-mono"
				style={{ color: "var(--text-4)" }}
				title={lastSeen ? new Date(lastSeen).toLocaleString() : undefined}
			>
				{health === "unreachable" ? "unreachable" : formatRelative(lastSeen)}
			</td>
		</tr>
	);
}
