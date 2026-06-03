import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Boxes, LayoutDashboard, Network, Settings as SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	computeFleetAggregates,
	DEFAULT_ROW_METRICS,
	type FleetRowMetrics,
} from "@/components/fleet/fleetAggregates";
import { EmptyState } from "@/components/shared/EmptyState";
import { Body, PageTitle, SectionHeading } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import type { Instance } from "@/lib/config";
import { COLOR } from "@/lib/constants";
import { formatCount } from "@/lib/utils";
import { ServerWorkspaceRows } from "./ServerWorkspaceRows";

const ALL_SERVERS = "all";

/**
 * Unified, server-aware dashboard: every workspace across every configured server,
 * labelled `<workspace> (<server>)` and filterable by server. Aggregates fold in the
 * cross-server totals (formerly the standalone Fleet view). Opening a workspace
 * activates its server, then drills into the existing workspace detail route.
 */
export function Dashboard() {
	const { instances, activeId, activate } = useInstances();
	const navigate = useNavigate();
	const [serverFilter, setServerFilter] = useState<string>(ALL_SERVERS);
	const [metricsById, setMetricsById] = useState<Record<string, FleetRowMetrics>>({});

	useEffect(() => {
		if (serverFilter !== ALL_SERVERS && !instances.find((i) => i.id === serverFilter)) {
			setServerFilter(ALL_SERVERS);
		}
	}, [instances, serverFilter]);

	const onMetrics = useCallback((id: string, m: FleetRowMetrics) => {
		setMetricsById((prev) => ({ ...prev, [id]: m }));
	}, []);

	const onOpenWorkspace = useCallback(
		(instance: Instance, workspaceId: string) => {
			if (instance.id !== activeId) activate(instance.id);
			navigate({ to: "/workspaces/$workspaceId", params: { workspaceId } as never });
		},
		[activeId, activate, navigate],
	);

	const shownInstances = useMemo(
		() =>
			serverFilter === ALL_SERVERS ? instances : instances.filter((i) => i.id === serverFilter),
		[instances, serverFilter],
	);

	const agg = useMemo(
		() =>
			computeFleetAggregates(shownInstances.map((i) => metricsById[i.id] ?? DEFAULT_ROW_METRICS)),
		[shownInstances, metricsById],
	);

	if (instances.length === 0) {
		return (
			<div className="page-container page-container--xl">
				<EmptyState
					icon={Boxes}
					title="No servers configured"
					description="Add at least one Honcho server in Settings to see your workspaces."
					action={
						<Link
							to="/settings"
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md"
							style={{
								background: "var(--accent-dim)",
								border: "1px solid var(--accent-border)",
								color: "var(--accent-text)",
							}}
						>
							<SettingsIcon className="w-4 h-4" strokeWidth={1.5} />
							Go to Settings
						</Link>
					}
				/>
			</div>
		);
	}

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
					<span
						className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full"
						style={{
							background: COLOR.accentSubtle,
							color: COLOR.accentText,
							border: `1px solid ${COLOR.accentBorder}`,
						}}
					>
						{agg.totalInstances} server{agg.totalInstances !== 1 ? "s" : ""}
					</span>
				</div>
				<Body className="leading-none">Workspaces across every configured server</Body>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.05 }}
				className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4"
			>
				<MetricCard label="Workspaces" value={agg.totalWorkspaces} />
				<MetricCard label="Conclusions" value={agg.totalConclusions} accent />
				<MetricCard
					label="Healthy"
					value={agg.healthyCount}
					total={agg.totalInstances}
					color={agg.healthyCount === agg.totalInstances ? COLOR.success : COLOR.warning}
				/>
				<MetricCard
					label="Unreachable"
					value={agg.unreachableCount}
					color={agg.unreachableCount > 0 ? COLOR.destructive : "var(--text-3)"}
				/>
			</motion.div>

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
					<Network className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<SectionHeading className="mb-0">Workspaces</SectionHeading>
					{instances.length > 1 && (
						<label className="ml-auto flex items-center gap-1.5 text-xs">
							<span style={{ color: "var(--text-4)" }}>Server</span>
							<select
								aria-label="Filter by server"
								value={serverFilter}
								onChange={(e) => setServerFilter(e.target.value)}
								className="rounded-md px-2 py-1 text-xs"
								style={{
									background: "var(--bg-3)",
									border: "1px solid var(--border)",
									color: "var(--text-2)",
								}}
							>
								<option value={ALL_SERVERS}>All servers</option>
								{instances.map((i) => (
									<option key={i.id} value={i.id}>
										{i.name}
									</option>
								))}
							</select>
						</label>
					)}
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr style={{ background: "var(--bg-3)" }}>
								<th className="py-2 px-4 font-medium text-left" style={{ color: "var(--text-3)" }}>
									Workspace (server)
								</th>
								<th className="py-2 px-4 font-medium text-right" style={{ color: "var(--text-3)" }}>
									Conclusions
								</th>
								<th
									className="py-2 px-4 font-medium text-right"
									style={{ color: "var(--text-3)" }}
									title="Active / Pending queue work units"
								>
									Queue (a/p)
								</th>
							</tr>
						</thead>
						<tbody>
							{shownInstances.map((inst) => (
								<ServerWorkspaceRows
									key={inst.id}
									instance={inst}
									onOpenWorkspace={onOpenWorkspace}
									onMetrics={onMetrics}
								/>
							))}
						</tbody>
					</table>
				</div>
			</motion.div>
		</div>
	);
}

interface MetricCardProps {
	label: string;
	value: number;
	total?: number;
	color?: string;
	accent?: boolean;
}

function MetricCard({ label, value, total, color, accent }: MetricCardProps) {
	const valueColor = color ?? (accent ? COLOR.accentText : "var(--text-1)");
	return (
		<div className="rounded-xl p-4 theme-card">
			<div className="text-2xl font-semibold font-mono" style={{ color: valueColor }}>
				{formatCount(value)}
				{total !== undefined && (
					<span className="text-base ml-1" style={{ color: "var(--text-4)" }}>
						/ {formatCount(total)}
					</span>
				)}
			</div>
			<div className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
				{label}
			</div>
		</div>
	);
}
