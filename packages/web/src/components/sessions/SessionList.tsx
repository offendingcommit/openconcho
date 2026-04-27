import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, ChevronRight, CircleDot, Clock, MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { useSessions } from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Pagination } from "@/components/shared/Pagination";
import { SortControl, type SortDir } from "@/components/shared/SortControl";
import { MonoCaption, PageTitle } from "@/components/ui/typography";
import { COLOR } from "@/lib/constants";

type Session = components["schemas"]["Session"];

const SORT_OPTIONS = [
	{ value: "created_at", label: "Newest" },
	{ value: "active", label: "Active" },
	{ value: "id", label: "ID" },
];

const container: Variants = {
	hidden: { opacity: 0 },
	show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item: Variants = {
	hidden: { opacity: 0, y: 10 },
	show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 24 } },
};

export function SessionList() {
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState("created_at");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const navigate = useNavigate();
	const { data, isLoading, error } = useSessions(workspaceId, page);

	const sessions: Session[] = (data as { items?: Session[] } | undefined)?.items ?? [];
	const totalPages = (data as { pages?: number } | undefined)?.pages ?? 1;
	const total = (data as { total?: number } | undefined)?.total ?? 0;

	const sorted = useMemo(() => {
		return [...sessions].sort((a, b) => {
			let cmp = 0;
			if (sortField === "created_at") {
				cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
			} else if (sortField === "active") {
				// active sessions first (true > false)
				cmp = Number(a.is_active) - Number(b.is_active);
			} else if (sortField === "id") {
				cmp = a.id.localeCompare(b.id);
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [sessions, sortField, sortDir]);

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
					<MessageSquare className="w-5 h-5" style={{ color: COLOR.accent }} strokeWidth={1.5} />
					<PageTitle>Sessions</PageTitle>
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

			<ErrorAlert error={error instanceof Error ? error : null} />
			{isLoading && <PageLoader />}

			{!isLoading && sessions.length === 0 && (
				<EmptyState
					icon={MessageSquare}
					title="No sessions found"
					description="No sessions exist in this workspace."
				/>
			)}

			{!isLoading && sorted.length > 0 && (
				<>
					<motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
						{sorted.map((session) => (
							<motion.button
								key={session.id}
								variants={item}
								onClick={() =>
									navigate({
										to: "/workspaces/$workspaceId/sessions/$sessionId",
										params: { workspaceId, sessionId: session.id } as never,
									})
								}
								className="w-full text-left rounded-xl px-5 py-4 group"
								style={{
									background: COLOR.cardBaseBg,
									border: `1px solid ${COLOR.cardBaseBorder}`,
								}}
								whileHover={{
									background: COLOR.accentDimHover,
									borderColor: COLOR.accentBorder,
									x: 2,
								}}
							>
								<div className="flex items-center justify-between">
									<span
										className="font-mono text-sm font-medium truncate"
										style={{ color: COLOR.accentSoft }}
									>
										{session.id}
									</span>
									<div className="flex items-center gap-2 shrink-0 ml-2">
										{session.is_active && (
											<div className="flex items-center gap-1">
												<motion.div
													animate={{ opacity: [0.5, 1, 0.5] }}
													transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
												>
													<CircleDot
														className="w-3 h-3"
														style={{ color: COLOR.success }}
														strokeWidth={2}
													/>
												</motion.div>
												<span className="text-xs" style={{ color: COLOR.success }}>
													Active
												</span>
											</div>
										)}
										<ChevronRight
											className="w-4 h-4 opacity-30 group-hover:opacity-70 transition-opacity"
											style={{ color: COLOR.accent }}
											strokeWidth={1.5}
										/>
									</div>
								</div>
								<div className="flex items-center gap-2 mt-2">
									{session.created_at && (
										<div className="flex items-center gap-1.5">
											<Clock
												className="w-3 h-3"
												style={{ color: COLOR.dimIcon }}
												strokeWidth={1.5}
											/>
											<MonoCaption>{new Date(session.created_at).toLocaleString()}</MonoCaption>
										</div>
									)}
									{(session.metadata as Record<string, string> | null)?.source && (
										<span
											className="text-xs font-mono px-1.5 py-0.5 rounded"
											style={{
												background: COLOR.accentDim,
												border: `1px solid ${COLOR.accentBorderStrong}`,
												color: COLOR.dimText,
											}}
										>
											{(session.metadata as Record<string, string>).source}
										</span>
									)}
								</div>
							</motion.button>
						))}
					</motion.div>
					<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
				</>
			)}
		</div>
	);
}
