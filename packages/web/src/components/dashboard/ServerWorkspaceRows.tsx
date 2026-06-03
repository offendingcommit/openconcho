import { useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronRight, CircleDot } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import {
	scopedConclusionsCountOptions,
	scopedQueueStatusOptions,
	useScopedWorkspaces,
} from "@/api/compareQueries";
import type { components } from "@/api/schema.d.ts";
import type { FleetRowMetrics } from "@/components/fleet/fleetAggregates";
import { useDemo } from "@/hooks/useDemo";
import type { Instance } from "@/lib/config";
import { COLOR } from "@/lib/constants";
import { formatCount } from "@/lib/utils";

type Workspace = components["schemas"]["Workspace"];
type QueueStatus = components["schemas"]["QueueStatus"];
type ConclusionPage = components["schemas"]["Page_Conclusion_"];

interface Props {
	instance: Instance;
	/** Open a workspace's drill-down (activates the instance first if needed). */
	onOpenWorkspace: (instance: Instance, workspaceId: string) => void;
	/** Report this server's summed metrics up for the aggregate header. */
	onMetrics: (id: string, metrics: FleetRowMetrics) => void;
}

const WORKSPACE_PAGE_SIZE = 100;

function metricsEqual(a: FleetRowMetrics, b: FleetRowMetrics): boolean {
	return (
		a.workspaceCount === b.workspaceCount &&
		a.conclusionCount === b.conclusionCount &&
		a.queueActive === b.queueActive &&
		a.queuePending === b.queuePending &&
		a.health === b.health
	);
}

/**
 * Renders one `<tr>` per workspace on a single server (instance), labelled
 * `<workspace> (<server>)`, and reports the server's summed metrics up so the
 * Dashboard header can aggregate across servers. Per-instance data fetching lives
 * here (not in a parent loop) to satisfy the rules of hooks — one child per server.
 */
export function ServerWorkspaceRows({ instance, onOpenWorkspace, onMetrics }: Props) {
	const { mask } = useDemo();
	const workspacesQ = useScopedWorkspaces(instance, 1, WORKSPACE_PAGE_SIZE);

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

	const metrics: FleetRowMetrics = useMemo(
		() => ({
			workspaceCount: totalWorkspaces,
			conclusionCount,
			queueActive,
			queuePending,
			lastSeen: null,
			health,
		}),
		[totalWorkspaces, conclusionCount, queueActive, queuePending, health],
	);

	const lastReported = useRef<FleetRowMetrics | null>(null);
	useEffect(() => {
		if (lastReported.current && metricsEqual(lastReported.current, metrics)) return;
		lastReported.current = metrics;
		onMetrics(instance.id, metrics);
	}, [instance.id, metrics, onMetrics]);

	if (workspacesQ.isError) {
		return (
			<tr
				style={{ borderTop: "1px solid var(--border)" }}
				data-testid={`server-error-${instance.id}`}
			>
				<td className="py-2.5 px-4" colSpan={3}>
					<span className="text-xs" style={{ color: COLOR.destructive }}>
						{instance.name} — unreachable
					</span>
				</td>
			</tr>
		);
	}

	if (workspaces.length === 0) {
		return (
			<tr style={{ borderTop: "1px solid var(--border)" }}>
				<td className="py-2.5 px-4" colSpan={3}>
					<span className="text-xs" style={{ color: "var(--text-4)" }}>
						{instance.name} — {workspacesQ.isLoading ? "loading…" : "no workspaces"}
					</span>
				</td>
			</tr>
		);
	}

	return (
		<>
			{workspaces.map((ws, i) => {
				const queue = queueResults[i]?.data as QueueStatus | undefined;
				const active = queue?.in_progress_work_units ?? 0;
				const pending = queue?.pending_work_units ?? 0;
				const isActive = active > 0 || pending > 0;
				const conclusions = (conclusionsResults[i]?.data as ConclusionPage | undefined)?.total;

				return (
					<tr
						key={`${instance.id}:${ws.id}`}
						data-testid={`ws-row-${instance.id}-${ws.id}`}
						style={{
							borderTop: "1px solid var(--border)",
							background: isActive ? COLOR.warningDim : undefined,
						}}
					>
						<td className="py-2 px-4">
							<button
								type="button"
								onClick={() => onOpenWorkspace(instance, ws.id)}
								className="flex items-center gap-2 group text-left"
							>
								<span
									className="font-mono text-xs truncate max-w-[200px] group-hover:underline"
									style={{ color: "var(--accent-text)" }}
								>
									{mask(ws.id)}
								</span>
								<span className="text-xs" style={{ color: "var(--text-4)" }}>
									({instance.name})
								</span>
								<ChevronRight
									className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0"
									style={{ color: "var(--accent)" }}
									strokeWidth={2}
								/>
							</button>
						</td>

						<td
							className="py-2 px-4 text-right font-mono text-xs"
							style={{ color: "var(--text-2)" }}
						>
							{conclusions === undefined ? "—" : formatCount(conclusions)}
						</td>

						<td className="py-2 px-4 text-right">
							<div className="flex items-center justify-end gap-1.5">
								{isActive ? (
									<motion.div
										animate={{ opacity: [0.5, 1, 0.5] }}
										transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
									>
										<CircleDot
											className="w-3 h-3"
											style={{ color: COLOR.warning }}
											strokeWidth={2}
										/>
									</motion.div>
								) : (
									<CircleDot className="w-3 h-3" style={{ color: COLOR.success }} strokeWidth={2} />
								)}
								<span
									className="text-xs font-medium font-mono"
									style={{ color: isActive ? COLOR.warning : "var(--text-3)" }}
								>
									{isActive ? `${formatCount(active)}/${formatCount(pending)}` : "idle"}
								</span>
							</div>
						</td>
					</tr>
				);
			})}
		</>
	);
}
