import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, ChevronRight, Clock, Eye, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { usePeers } from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Pagination } from "@/components/shared/Pagination";
import { SortControl, type SortDir } from "@/components/shared/SortControl";
import { MonoCaption, PageTitle } from "@/components/ui/typography";
import { COLOR } from "@/lib/constants";

type Peer = components["schemas"]["Peer"];

type KindStyle = { bg: string; text: string; border: string };

const KIND_STYLES: Record<string, KindStyle> = {
	agent: { bg: COLOR.warningDim, text: COLOR.warning, border: COLOR.warningBorder },
	discord: { bg: "rgba(14,165,233,0.08)", text: "#38bdf8", border: "rgba(14,165,233,0.2)" },
	ai: { bg: COLOR.accentDim, text: COLOR.accentText, border: COLOR.accentBorder },
};

function peerKind(id: string): (KindStyle & { label: string }) | null {
	if (id.startsWith("agent-")) return { label: "agent", ...KIND_STYLES.agent };
	if (id.startsWith("discord-")) return { label: "discord", ...KIND_STYLES.discord };
	if (["claude", "hermes", "codex"].includes(id)) return { label: "ai", ...KIND_STYLES.ai };
	return null;
}

const SORT_OPTIONS = [
	{ value: "created_at", label: "Newest" },
	{ value: "id", label: "ID" },
];

const container: Variants = {
	hidden: { opacity: 0 },
	show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item: Variants = {
	hidden: { opacity: 0, y: 10 },
	show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export function PeerList() {
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState("created_at");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [expandedMeta, setExpandedMeta] = useState<Set<string>>(new Set());
	const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
	const navigate = useNavigate();
	const { data, isLoading, error } = usePeers(workspaceId, page);

	const peers: Peer[] = (data as { items?: Peer[] } | undefined)?.items ?? [];
	const totalPages = (data as { pages?: number } | undefined)?.pages ?? 1;
	const total = (data as { total?: number } | undefined)?.total ?? 0;

	const availableLabels = useMemo(() => {
		const labels = new Set<string>();
		for (const peer of peers) {
			const kind = peerKind(peer.id);
			if (kind) labels.add(kind.label);
		}
		return labels;
	}, [peers]);

	const sorted = useMemo(() => {
		return [...peers].sort((a, b) => {
			let cmp = 0;
			if (sortField === "created_at") {
				cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
			} else if (sortField === "id") {
				cmp = a.id.localeCompare(b.id);
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [peers, sortField, sortDir]);

	const filtered = useMemo(() => {
		if (activeFilters.size === 0) return sorted;
		return sorted.filter((peer) => {
			const kind = peerKind(peer.id);
			return kind ? activeFilters.has(kind.label) : false;
		});
	}, [sorted, activeFilters]);

	function toggleFilter(label: string) {
		setActiveFilters((prev) => {
			const next = new Set(prev);
			next.has(label) ? next.delete(label) : next.add(label);
			return next;
		});
	}

	function handleSort(field: string, dir: SortDir) {
		setSortField(field);
		setSortDir(dir);
	}

	return (
		<div className="page-container">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
				<Link
					to="/workspaces/$workspaceId"
					params={{ workspaceId } as never}
					className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
					style={{ color: COLOR.dimText }}
				>
					<ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
					{workspaceId}
				</Link>
				<div className="flex items-center gap-2 mb-1">
					<Users className="w-5 h-5" style={{ color: COLOR.accent }} strokeWidth={1.5} />
					<PageTitle>Peers</PageTitle>
					{total > 0 && (
						<span
							className="ml-1 text-xs font-mono px-2 py-0.5 rounded-full"
							style={{
								background: COLOR.accentSubtle,
								color: COLOR.accentText,
								border: `1px solid ${COLOR.accentBorder}`,
							}}
						>
							{total}
						</span>
					)}
					<div className="ml-auto">
						<SortControl
							options={SORT_OPTIONS}
							field={sortField}
							dir={sortDir}
							onChange={handleSort}
						/>
					</div>
				</div>
				<MonoCaption className="mt-0.5" as="p">
					{workspaceId}
				</MonoCaption>
			</motion.div>

			{availableLabels.size > 0 && (
				<div className="flex items-center gap-2 flex-wrap mb-4">
					{[...availableLabels].map((label) => {
						const style = KIND_STYLES[label];
						const active = activeFilters.has(label);
						return (
							<button
								key={label}
								type="button"
								onClick={() => toggleFilter(label)}
								className="text-xs font-mono px-2 py-1 rounded transition-opacity hover:opacity-90"
								style={{
									background: active ? style.bg : "transparent",
									color: active ? style.text : "var(--text-4)",
									border: `1px solid ${active ? style.border : "var(--border)"}`,
								}}
							>
								{label}
							</button>
						);
					})}
					{activeFilters.size > 0 && (
						<button
							type="button"
							onClick={() => setActiveFilters(new Set())}
							className="text-xs font-mono px-2 py-1 rounded transition-opacity hover:opacity-80"
							style={{ color: "var(--text-4)" }}
						>
							clear
						</button>
					)}
				</div>
			)}

			<ErrorAlert error={error instanceof Error ? error : null} />
			{isLoading && <PageLoader />}

			{!isLoading && peers.length === 0 && (
				<EmptyState
					icon={Users}
					title="No peers found"
					description="No peers exist in this workspace."
				/>
			)}

			{!isLoading && peers.length > 0 && filtered.length === 0 && (
				<EmptyState
					icon={Users}
					title="No peers match"
					description="No peers match the selected filters."
				/>
			)}

			{!isLoading && filtered.length > 0 && (
				<>
					<motion.div
						variants={container}
						initial="hidden"
						animate="show"
						className="grid grid-cols-1 sm:grid-cols-2 gap-2"
					>
						{filtered.map((peer) => {
							const kind = peerKind(peer.id);
							const metaKeys = Object.keys(peer.metadata ?? {});
							const hasMeta = metaKeys.length > 0;
							const metaOpen = expandedMeta.has(peer.id);

							function toggleMeta(e: React.MouseEvent) {
								e.stopPropagation();
								setExpandedMeta((prev) => {
									const next = new Set(prev);
									next.has(peer.id) ? next.delete(peer.id) : next.add(peer.id);
									return next;
								});
							}

							return (
								<motion.div
									key={peer.id}
									variants={item}
									className="rounded-xl overflow-hidden group"
									style={{
										background: COLOR.cardBaseBg,
										border: `1px solid ${COLOR.cardBaseBorder}`,
									}}
									whileHover={{
										background: COLOR.accentDimHover,
										borderColor: COLOR.accentBorder,
									}}
								>
									<button
										type="button"
										onClick={() =>
											navigate({
												to: "/workspaces/$workspaceId/peers/$peerId",
												params: { workspaceId, peerId: peer.id } as never,
											})
										}
										className="text-left w-full px-5 py-4"
									>
										<div className="flex items-center justify-between mb-1">
											<span
												className="font-mono text-sm font-medium truncate"
												style={{ color: COLOR.accentSoft }}
											>
												{peer.id}
											</span>
											<ChevronRight
												className="w-4 h-4 shrink-0 ml-2 opacity-30 group-hover:opacity-70 transition-opacity"
												style={{ color: COLOR.accent }}
												strokeWidth={1.5}
											/>
										</div>
										<div className="flex items-center gap-2 flex-wrap">
											{kind && (
												<span
													className="text-xs font-mono px-1.5 py-0.5 rounded"
													style={{
														background: kind.bg,
														color: kind.text,
														border: `1px solid ${kind.border}`,
													}}
												>
													{kind.label}
												</span>
											)}
											{(peer.configuration as { observe_me?: boolean } | null)?.observe_me && (
												<div className="flex items-center gap-1">
													<Eye
														className="w-3 h-3"
														style={{ color: COLOR.accentText }}
														strokeWidth={1.5}
													/>
													<span className="text-xs" style={{ color: COLOR.accentText }}>
														observed
													</span>
												</div>
											)}
											{peer.created_at && (
												<div className="flex items-center gap-1">
													<Clock
														className="w-3 h-3"
														style={{ color: COLOR.dimIcon }}
														strokeWidth={1.5}
													/>
													<MonoCaption>{new Date(peer.created_at).toLocaleString()}</MonoCaption>
												</div>
											)}
										</div>
									</button>

									{hasMeta && (
										<>
											<button
												type="button"
												onClick={toggleMeta}
												className="w-full flex items-center gap-1.5 px-5 py-1.5 text-xs font-mono transition-opacity hover:opacity-80"
												style={{
													borderTop: `1px solid ${COLOR.cardBaseBorder}`,
													color: COLOR.dimText,
												}}
											>
												<ChevronRight
													className="w-3 h-3 transition-transform duration-150"
													style={{ transform: metaOpen ? "rotate(90deg)" : "rotate(0deg)" }}
													strokeWidth={2}
												/>
												{metaKeys.length} metadata key{metaKeys.length !== 1 ? "s" : ""}
											</button>
											{metaOpen && (
												<div className="px-4 pb-4">
													<JsonViewer data={peer.metadata} maxHeight="200px" />
												</div>
											)}
										</>
									)}
								</motion.div>
							);
						})}
					</motion.div>
					<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
				</>
			)}
		</div>
	);
}
