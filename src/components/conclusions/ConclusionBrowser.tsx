import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Lightbulb, Search, X, Clock, ArrowLeft, Eye, Plus, Trash2 } from "lucide-react";
import {
	useConclusions,
	useQueryConclusions,
	useCreateConclusion,
	useDeleteConclusion,
} from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormModal } from "@/components/shared/FormModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { components } from "@/api/schema.d.ts";

type Conclusion = components["schemas"]["Conclusion"];

const createSchema = z.object({
	observer_id: z.string().min(1, "Observer peer ID is required"),
	observed_id: z.string().min(1, "Observed peer ID is required"),
	content: z.string().min(1, "Content is required"),
	session_id: z.string().optional(),
});

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
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	const { data, isLoading, error } = useConclusions(workspaceId, {}, page);
	const { data: searchResults, isLoading: searchLoading } = useQueryConclusions(
		workspaceId,
		activeSearch,
		{},
		Boolean(activeSearch),
	);
	const createConclusion = useCreateConclusion(workspaceId);
	const deleteConclusion = useDeleteConclusion(workspaceId);

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
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
				<Link
					to="/workspaces/$workspaceId"
					params={{ workspaceId } as never}
					className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
					style={{ color: "var(--text-3)" }}
				>
					<ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
					{workspaceId}
				</Link>
				<div className="flex items-center gap-2 mb-1">
					<Lightbulb className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
						Conclusions
					</h1>
					{total > 0 && !activeSearch && (
						<span
							className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
							style={{
								background: "var(--accent-dim)",
								color: "var(--accent-text)",
								border: "1px solid var(--accent-border)",
							}}
						>
							{total}
						</span>
					)}
					<button
						onClick={() => setCreateOpen(true)}
						className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
						style={{
							background: "var(--accent-dim)",
							border: "1px solid var(--accent-border)",
							color: "var(--accent-text)",
						}}
					>
						<Plus className="w-3.5 h-3.5" strokeWidth={2} />
						New
					</button>
				</div>
				<p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
					Distilled memory observations about peers
				</p>
			</motion.div>

			{/* Search */}
			<form onSubmit={handleSearch} className="flex gap-2 mb-6">
				<div className="relative flex-1">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
						style={{ color: "var(--text-4)" }}
						strokeWidth={1.5}
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Semantic search across conclusions..."
						className="theme-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm font-mono"
					/>
				</div>
				<button
					type="submit"
					className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
					style={{ background: "var(--accent)", color: "#fff" }}
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
								background: "var(--surface)",
								border: "1px solid var(--border)",
								color: "var(--text-3)",
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
							style={{ color: "var(--text-4)" }}
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
								className="group rounded-xl p-5"
								style={{
									background: "var(--surface)",
									border: "1px solid var(--border)",
								}}
							>
								<div className="flex items-start justify-between gap-3">
									<p className="text-sm leading-relaxed whitespace-pre-wrap flex-1" style={{ color: "var(--text-2)" }}>
										{c.content}
									</p>
									<button
										onClick={() => setDeleteTarget(c.id)}
										className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all flex-shrink-0"
										style={{ color: "var(--text-4)" }}
									>
										<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
									</button>
								</div>
								<div
									className="flex items-center gap-3 mt-4 pt-3"
									style={{ borderTop: "1px solid var(--border)" }}
								>
									<div className="flex items-center gap-1.5">
										<Eye className="w-3 h-3" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
										<span className="text-xs font-mono" style={{ color: "var(--text-4)" }}>
											{c.observer_id}
										</span>
									</div>
									{c.observed_id && (
										<div className="flex items-center gap-1">
											<span className="text-xs" style={{ color: "var(--text-4)" }}>→</span>
											<span className="text-xs font-mono" style={{ color: "var(--text-4)" }}>
												{c.observed_id}
											</span>
										</div>
									)}
									{c.created_at && (
										<div className="flex items-center gap-1 ml-auto">
											<Clock className="w-3 h-3" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
											<span className="text-xs font-mono" style={{ color: "var(--text-4)" }}>
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

			<CreateConclusionModal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onSubmit={async (values) => {
					await createConclusion.mutateAsync(values);
					setCreateOpen(false);
				}}
				loading={createConclusion.isPending}
				error={createConclusion.error?.message}
			/>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title="Delete conclusion"
				description="This conclusion will be permanently removed."
				confirmLabel="Delete"
				onConfirm={async () => {
					if (deleteTarget) await deleteConclusion.mutateAsync(deleteTarget);
					setDeleteTarget(null);
				}}
				onCancel={() => setDeleteTarget(null)}
				loading={deleteConclusion.isPending}
			/>
		</div>
	);
}

function CreateConclusionModal({
	open,
	onClose,
	onSubmit,
	loading,
	error,
}: {
	open: boolean;
	onClose: () => void;
	onSubmit: (v: { observer_id: string; observed_id: string; content: string; session_id?: string | null }) => Promise<void>;
	loading: boolean;
	error?: string;
}) {
	const [fields, setFields] = useState({ observer_id: "", observed_id: "", content: "", session_id: "" });
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setFields((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const result = createSchema.safeParse(fields);
		if (!result.success) {
			const errs: Record<string, string> = {};
			for (const issue of result.error.errors) errs[issue.path[0] as string] = issue.message;
			setValidationErrors(errs);
			return;
		}
		setValidationErrors({});
		await onSubmit({
			...result.data,
			session_id: result.data.session_id ?? null,
		});
		setFields({ observer_id: "", observed_id: "", content: "", session_id: "" });
	};

	return (
		<FormModal open={open} title="New conclusion" onClose={onClose}>
			<form onSubmit={handleSubmit} className="space-y-3">
				{(["observer_id", "observed_id"] as const).map((field) => (
					<div key={field}>
						<label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>
							{field === "observer_id" ? "Observer peer ID" : "Observed peer ID"}{" "}
							<span style={{ color: "#f87171" }}>*</span>
						</label>
						<input
							value={fields[field]}
							onChange={set(field)}
							placeholder="peer_id"
							className="theme-input w-full text-sm px-3 py-2 rounded-lg"
						/>
						{validationErrors[field] && (
							<p className="text-xs mt-1" style={{ color: "#f87171" }}>{validationErrors[field]}</p>
						)}
					</div>
				))}
				<div>
					<label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>
						Content <span style={{ color: "#f87171" }}>*</span>
					</label>
					<textarea
						value={fields.content}
						onChange={set("content")}
						rows={4}
						placeholder="The conclusion content…"
						className="theme-input w-full text-sm px-3 py-2 rounded-lg resize-y"
					/>
					{validationErrors.content && (
						<p className="text-xs mt-1" style={{ color: "#f87171" }}>{validationErrors.content}</p>
					)}
				</div>
				<div>
					<label className="block text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>
						Session ID <span style={{ color: "var(--text-4)" }}>(optional)</span>
					</label>
					<input
						value={fields.session_id}
						onChange={set("session_id")}
						placeholder="session_id"
						className="theme-input w-full text-sm px-3 py-2 rounded-lg"
					/>
				</div>
				{error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
				<div className="flex justify-end gap-2 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="px-3 py-1.5 text-sm rounded-lg"
						style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						className="px-3 py-1.5 text-sm rounded-lg font-medium disabled:opacity-50"
						style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent-text)" }}
					>
						{loading ? "Creating..." : "Create"}
					</button>
				</div>
			</form>
		</FormModal>
	);
}
