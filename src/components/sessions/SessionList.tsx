import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { MessageSquare, ChevronRight, Clock, CircleDot, ArrowLeft } from "lucide-react";
import { useSessions } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import type { components } from "@/api/schema.d.ts";

type Session = components["schemas"]["Session"];

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
	const navigate = useNavigate();
	const { data, isLoading, error } = useSessions(workspaceId, page);

	const sessions: Session[] = (data as { items?: Session[] } | undefined)?.items ?? [];
	const totalPages = (data as { pages?: number } | undefined)?.pages ?? 1;
	const total = (data as { total?: number } | undefined)?.total ?? 0;

	return (
		<div className="p-8 max-w-3xl mx-auto">
			<motion.div
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-8"
			>
				<Link
					to="/workspaces/$workspaceId"
					params={{ workspaceId }}
					className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
					style={{ color: "rgba(148,163,184,0.5)" }}
				>
					<ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
					{workspaceId}
				</Link>
				<div className="flex items-center gap-2 mb-1">
					<MessageSquare className="w-5 h-5" style={{ color: "#6366f1" }} strokeWidth={1.5} />
					<h1 className="text-xl font-semibold tracking-tight" style={{ color: "#e4e4f0" }}>
						Sessions
					</h1>
					{total > 0 && (
						<span
							className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
							style={{
								background: "rgba(99,102,241,0.1)",
								color: "#818cf8",
								border: "1px solid rgba(99,102,241,0.2)",
							}}
						>
							{total}
						</span>
					)}
				</div>
				<p className="text-xs font-mono mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>
					{workspaceId}
				</p>
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

			{!isLoading && sessions.length > 0 && (
				<>
					<motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
						{sessions.map((session) => (
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
									background: "rgba(255,255,255,0.02)",
									border: "1px solid rgba(255,255,255,0.06)",
								}}
								whileHover={{
									background: "rgba(99,102,241,0.06)",
									borderColor: "rgba(99,102,241,0.2)",
									x: 2,
								}}
							>
								<div className="flex items-center justify-between">
									<span className="font-mono text-sm font-medium truncate" style={{ color: "#c7d2fe" }}>
										{session.id}
									</span>
									<div className="flex items-center gap-2 shrink-0 ml-2">
										{session.is_active && (
											<div className="flex items-center gap-1">
												<motion.div
													animate={{ opacity: [0.5, 1, 0.5] }}
													transition={{ duration: 2, repeat: Infinity }}
												>
													<CircleDot className="w-3 h-3" style={{ color: "#34d399" }} strokeWidth={2} />
												</motion.div>
												<span className="text-xs" style={{ color: "#34d399" }}>Active</span>
											</div>
										)}
										<ChevronRight
											className="w-4 h-4 opacity-30 group-hover:opacity-70 transition-opacity"
											style={{ color: "#6366f1" }}
											strokeWidth={1.5}
										/>
									</div>
								</div>
								{session.created_at && (
									<div className="flex items-center gap-1.5 mt-2">
										<Clock className="w-3 h-3" style={{ color: "rgba(148,163,184,0.3)" }} strokeWidth={1.5} />
										<p className="text-xs font-mono" style={{ color: "rgba(148,163,184,0.3)" }}>
											{new Date(session.created_at).toLocaleString()}
										</p>
									</div>
								)}
							</motion.button>
						))}
					</motion.div>
					<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
				</>
			)}
		</div>
	);
}
