import { Link, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, Lightbulb, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
	useConclusions,
	useCreateConclusion,
	useDeleteConclusion,
	useQueryConclusions,
} from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { FormModal } from "@/components/shared/FormModal";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Pagination } from "@/components/shared/Pagination";
import { SortControl, type SortDir } from "@/components/shared/SortControl";
import { TimestampChip } from "@/components/shared/TimestampChip";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Body, Caption, MonoCaption, Muted, PageTitle } from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import { COLOR } from "@/lib/constants";

type Conclusion = components["schemas"]["Conclusion"];

const createSchema = z.object({
	observer_id: z.string().min(1, { message: "Observer peer ID is required" }),
	observed_id: z.string().min(1, { message: "Observed peer ID is required" }),
	content: z.string().min(1, { message: "Content is required" }),
	session_id: z.string().optional(),
});

const SORT_OPTIONS = [
	{ value: "created_at", label: "Date" },
	{ value: "observer_id", label: "Observer" },
	{ value: "observed_id", label: "Observed" },
];

const itemVariants = {
	hidden: { opacity: 0, y: 8 },
	show: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: i * 0.04, type: "spring" as const, stiffness: 300, damping: 25 },
	}),
};

export function ConclusionBrowser() {
	const { mask } = useDemo();
	const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState("created_at");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [searchQuery, setSearchQuery] = useState("");
	const [activeSearch, setActiveSearch] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

	// created_at uses server-side reverse; other fields use client-side sort
	const serverReverse = sortField === "created_at" && sortDir === "asc";
	const { data, isLoading, error } = useConclusions(workspaceId, {}, page, 20, serverReverse);
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

	const sortedConclusions = useMemo(() => {
		if (sortField === "created_at") return conclusions; // server handles this
		return [...conclusions].sort((a, b) => {
			const cmp =
				sortField === "observer_id"
					? a.observer_id.localeCompare(b.observer_id)
					: (a.observed_id ?? "").localeCompare(b.observed_id ?? "");
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [conclusions, sortField, sortDir]);

	const displayedConclusions: Conclusion[] = activeSearch
		? Array.isArray(searchResults)
			? searchResults
			: []
		: sortedConclusions;

	function handleSort(field: string, dir: SortDir) {
		setSortField(field);
		setSortDir(dir);
		setPage(1);
	}

	function handleSearch(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setActiveSearch(searchQuery.trim());
		setPage(1);
	}

	return (
		<div className="page-container">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
				<Link
					to="/workspaces/$workspaceId"
					params={{ workspaceId } as never}
					className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
					style={{ color: "var(--text-3)" }}
				>
					<ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
					{mask(workspaceId)}
				</Link>
				<div className="flex items-center gap-2 mb-1">
					<Lightbulb className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<PageTitle>Conclusions</PageTitle>
					{total > 0 && !activeSearch && (
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
					<div className="ml-auto flex items-center gap-2">
						{!activeSearch && (
							<SortControl
								options={SORT_OPTIONS}
								field={sortField}
								dir={sortDir}
								onChange={handleSort}
							/>
						)}
						<Button variant="accent" size="sm" onClick={() => setCreateOpen(true)}>
							<Plus className="w-3.5 h-3.5" strokeWidth={2} />
							New
						</Button>
					</div>
				</div>
				<Muted className="mt-0.5">Distilled memory observations about peers</Muted>
			</motion.div>

			{/* Search */}
			<form onSubmit={handleSearch} className="flex gap-2 mb-6">
				<div className="relative flex-1">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
						style={{ color: "var(--text-4)" }}
						strokeWidth={1.5}
					/>
					<Input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Semantic search across conclusions..."
						className="rounded-xl pl-9 pr-4 py-2.5 font-mono"
					/>
				</div>
				<Button type="submit" variant="primary" className="rounded-xl">
					Search
				</Button>
				<AnimatePresence>
					{activeSearch && (
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
						>
							<Button
								type="button"
								variant="surface"
								onClick={() => {
									setActiveSearch("");
									setSearchQuery("");
								}}
								className="rounded-xl"
							>
								<X className="w-4 h-4" strokeWidth={1.5} />
							</Button>
						</motion.div>
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
							{displayedConclusions.length} result{displayedConclusions.length !== 1 ? "s" : ""} for
							&ldquo;{activeSearch}&rdquo;
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
									<Body className="whitespace-pre-wrap flex-1">{mask(c.content)}</Body>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setDeleteTarget(c.id)}
										className="opacity-0 group-hover:opacity-100 flex-shrink-0"
										aria-label="Delete conclusion"
									>
										<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
									</Button>
								</div>
								<div
									className="flex items-center gap-3 mt-4 pt-3"
									style={{ borderTop: "1px solid var(--border)" }}
								>
									<div className="flex items-center gap-1.5">
										<Eye className="w-3 h-3" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
										<MonoCaption>{mask(c.observer_id)}</MonoCaption>
									</div>
									{c.observed_id && (
										<div className="flex items-center gap-1">
											<Caption>→</Caption>
											<MonoCaption>{mask(c.observed_id)}</MonoCaption>
										</div>
									)}
									{c.session_id && (
										<Link
											to={"/workspaces/$workspaceId/sessions/$sessionId" as never}
											params={{ workspaceId, sessionId: c.session_id } as never}
											onClick={(e: React.MouseEvent) => e.stopPropagation()}
											className="flex items-center gap-1 text-xs font-mono hover:underline"
											style={{ color: "var(--accent-text)" }}
										>
											{mask(c.session_id)}
										</Link>
									)}
									{c.created_at && (
										<div className="ml-auto">
											<TimestampChip
												value={c.created_at.replace("T", " ").replace(/\.\d+Z?$/, "")}
											/>
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
	onSubmit: (v: {
		observer_id: string;
		observed_id: string;
		content: string;
		session_id?: string | null;
	}) => Promise<void>;
	loading: boolean;
	error?: string;
}) {
	const [fields, setFields] = useState({
		observer_id: "",
		observed_id: "",
		content: "",
		session_id: "",
	});
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	const set =
		(k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setFields((f) => ({ ...f, [k]: e.target.value }));

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const result = createSchema.safeParse(fields);
		if (!result.success) {
			const errs: Record<string, string> = {};
			for (const issue of result.error.issues) errs[issue.path[0] as string] = issue.message;
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
						<Label className="mb-1">
							{field === "observer_id" ? "Observer peer ID" : "Observed peer ID"}{" "}
							<span style={{ color: COLOR.destructive }}>*</span>
						</Label>
						<Input value={fields[field]} onChange={set(field)} placeholder="peer_id" />
						{validationErrors[field] && (
							<p className="text-xs mt-1" style={{ color: COLOR.destructive }}>
								{validationErrors[field]}
							</p>
						)}
					</div>
				))}
				<div>
					<Label className="mb-1">
						Content <span style={{ color: COLOR.destructive }}>*</span>
					</Label>
					<Textarea
						value={fields.content}
						onChange={set("content")}
						rows={4}
						placeholder="The conclusion content…"
						className="resize-y"
					/>
					{validationErrors.content && (
						<p className="text-xs mt-1" style={{ color: COLOR.destructive }}>
							{validationErrors.content}
						</p>
					)}
				</div>
				<div>
					<Label className="mb-1">
						Session ID <span style={{ color: "var(--text-4)" }}>(optional)</span>
					</Label>
					<Input value={fields.session_id} onChange={set("session_id")} placeholder="session_id" />
				</div>
				{error && (
					<p className="text-xs" style={{ color: COLOR.destructive }}>
						{error}
					</p>
				)}
				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="surface" size="sm" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" variant="accent" size="sm" disabled={loading}>
						{loading ? "Creating..." : "Create"}
					</Button>
				</div>
			</form>
		</FormModal>
	);
}
