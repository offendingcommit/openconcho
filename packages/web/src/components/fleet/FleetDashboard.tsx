import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Network, Server, Settings as SettingsIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Body, PageTitle, SectionHeading } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import { COLOR } from "@/lib/constants";
import { formatCount } from "@/lib/utils";
import { FleetRow } from "./FleetRow";
import {
	computeFleetAggregates,
	DEFAULT_ROW_METRICS,
	type FleetRowMetrics,
} from "./fleetAggregates";

export function FleetDashboard() {
	const { instances } = useInstances();
	const [metricsById, setMetricsById] = useState<Record<string, FleetRowMetrics>>({});

	const setMetrics = useCallback((id: string, m: FleetRowMetrics) => {
		setMetricsById((prev) => ({ ...prev, [id]: m }));
	}, []);

	const rows = useMemo(
		() => instances.map((i) => metricsById[i.id] ?? DEFAULT_ROW_METRICS),
		[instances, metricsById],
	);
	const agg = useMemo(() => computeFleetAggregates(rows), [rows]);

	if (instances.length === 0) {
		return (
			<div className="page-container page-container--xl">
				<EmptyState
					icon={Network}
					title="No instances configured"
					description="Add at least one Honcho instance in Settings to use the Fleet view."
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
					<Network className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<PageTitle>Fleet</PageTitle>
					<span
						className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full"
						style={{
							background: COLOR.accentSubtle,
							color: COLOR.accentText,
							border: `1px solid ${COLOR.accentBorder}`,
						}}
					>
						{agg.totalInstances} agent{agg.totalInstances !== 1 ? "s" : ""}
					</span>
				</div>
				<Body className="leading-none">Cross-instance overview of all configured agents</Body>
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
					<Server className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<SectionHeading className="mb-0">Agents</SectionHeading>
					<span className="text-xs ml-1" style={{ color: "var(--text-4)" }}>
						all configured instances · queue updates every 10s
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr style={{ background: "var(--bg-3)" }}>
								<th className="py-2 px-4 font-medium text-left" style={{ color: "var(--text-3)" }}>
									Agent
								</th>
								<th className="py-2 px-4 font-medium text-right" style={{ color: "var(--text-3)" }}>
									Workspaces
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
								<th className="py-2 px-4 font-medium text-right" style={{ color: "var(--text-3)" }}>
									Last seen
								</th>
							</tr>
						</thead>
						<tbody>
							{instances.map((inst) => (
								<FleetRow key={inst.id} instance={inst} onMetrics={setMetrics} />
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
