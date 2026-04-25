import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Search, X, Clock, ArrowLeft, Eye } from "lucide-react";
import { useConclusions, useQueryConclusions } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import type { components } from "@/api/schema.d.ts";

type Conclusion = components["schemas"]["Conclusion"];

const itemVariants = {
	hidden: { opacity: 0, y: 8 },
	show: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: i * 0.04, type: "spring" as const, stiffness: 300, damping: 25 },
	}),
};

export function ConclusionBrowser() {
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	const [page, setPage] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeSearch, setActiveSearch] = useState("");

	const { data, isLoading, error } = useConclusions(workspaceId, {}, page);
	const { data: searchResults, isLoading: searchLoading } = useQueryConclusions(
		workspaceId,
		activeSearch,
		{},
		Boolean(activeSearch),
	);

	const conclusions: Conclusion[] = (data as { items?: Conclusion[] } | undefined)?.items ?? [];
	const totalPages = (data as { pages?: number } | undefined)?.pages ?? 1;
	const total = (data as { total?: number } | undefined)?.total ?? 0;

	const displayedConclusions: Conclusion[] = activeSearch
		? Array.isArray(searchResults) ? searchResults : []
		: conclusions;

	function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setActiveSearch(searchQuery.trim());
		setPage(1);
	}

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
					<Lightbulb className="w-5 h-5" style={{ color: "#6366f1" }} strokeWidth={1.5} />
					<h1 className="text-xl font-semibold tracking-tight" style={{ color: "#e4e4f0" }}>
						Conclusions
					</h1>
					{total > 0 && !activeSearch && (
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
				<p className="text-sm mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
					Distilled memory observations about peers
				</p>
			</motion.div>

			{/* Search */}
			<form onSubmit={handleSearch} className="flex gap-2 mb-6">
				<div className="relative flex-1">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
						style={{ color: "rgba(148,163,184,0.4)" }}
						strokeWidth={1.5}
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Semantic search across conclusions..."
						className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono outline-none transition-all"
						style={{
							background: "rgba(255,255,255,0.03)",
							border: "1px solid rgba(255,255,255,0.08)",
							color: "#e4e4f0",
						}}
						onFocus={(e) => {
							e.target.style.borderColor = "rgba(99,102,241,0.4)";
						}}
						onBlur={(e) => {
							e.target.style.borderColor = "rgba(255,255,255,0.08)";
						}}
					/>
				</div>
				<button
					type="submit"
					className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
					style={{ background: "#4f46e5", color: "#fff" }}
				>
					Search
				</button>
				<AnimatePresence>
					{activeSearch && (
						<motion.button
							type="button"
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							onClick={() => { setActiveSearch(""); setSearchQuery(""); }}
							className="px-3 py-2.5 rounded-xl text-sm transition-all"
							style={{
								background: "rgba(255,255,255,0.05)",
								border: "1px solid rgba(255,255,255,0.08)",
								color: "rgba(148,163,184,0.7)",
							}}
						>
							<X className="w-4 h-4" strokeWidth={1.5} />
						</motion.button>
					)}
				</AnimatePresence>
			</form>

			<ErrorAlert error={error instanceof Error ? error : null} />
			{(isLoading || (activeSearch && searchLoading)) && <PageLoader />}

			{!isLoading && !searchLoading && displayedConclusions.length === 0 && (
				<EmptyState
					icon={Lightbulb}
					title={activeSearch ? "No results found" : "No conclusions yet"}
					description={
						activeSearch
							? `No conclusions match "${activeSearch}"`
							: "Conclusions are created when Honcho processes sessions."
					}
				/>
			)}

			{displayedConclusions.length > 0 && (
				<>
					{activeSearch && (
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="text-xs font-mono mb-3"
							style={{ color: "rgba(148,163,184,0.4)" }}
						>
							{displayedConclusions.length} result{displayedConclusions.length !== 1 ? "s" : ""}{" "}
							for &ldquo;{activeSearch}&rdquo;
						</motion.p>
					)}
					<div className="space-y-3">
						{displayedConclusions.map((c, i) => (
							<motion.div
								key={c.id}
								custom={i}
								variants={itemVariants}
								initial="hidden"
								animate="show"
								className="rounded-xl p-5"
								style={{
									background: "rgba(255,255,255,0.02)",
									border: "1px solid rgba(255,255,255,0.06)",
								}}
							>
								<p
									className="text-sm leading-relaxed whitespace-pre-wrap"
									style={{ color: "#d4d4f5" }}
								>
									{c.content}
								</p>
								<div
									className="flex items-center gap-3 mt-4 pt-3"
									style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
								>
									<div className="flex items-center gap-1.5">
										<Eye className="w-3 h-3" style={{ color: "rgba(148,163,184,0.35)" }} strokeWidth={1.5} />
										<span className="text-xs font-mono" style={{ color: "rgba(148,163,184,0.4)" }}>
											{c.observer_id}
										</span>
									</div>
									{c.observed_id && (
										<div className="flex items-center gap-1">
											<span className="text-xs" style={{ color: "rgba(148,163,184,0.2)" }}>→</span>
											<span className="text-xs font-mono" style={{ color: "rgba(148,163,184,0.4)" }}>
												{c.observed_id}
											</span>
										</div>
									)}
									{c.created_at && (
										<div className="flex items-center gap-1 ml-auto">
											<Clock className="w-3 h-3" style={{ color: "rgba(148,163,184,0.25)" }} strokeWidth={1.5} />
											<span className="text-xs font-mono" style={{ color: "rgba(148,163,184,0.3)" }}>
												{new Date(c.created_at).toLocaleString()}
											</span>
										</div>
									)}
								</div>
							</motion.div>
						))}
					</div>
					{!activeSearch && (
						<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
					)}
				</>
			)}
		</div>
	);
}
