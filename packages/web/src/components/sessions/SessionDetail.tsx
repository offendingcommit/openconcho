import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlignLeft, Clock, Copy, MessageSquare, Search, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import {
	useAddPeersToSession,
	useCloneSession,
	useDeleteSession,
	usePeers,
	useRemovePeersFromSession,
	useSearchSession,
	useSessionContext,
	useSessionMessages,
	useSessionPeers,
	useSessionSummaries,
} from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { Badge } from "@/components/shared/Badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Body,
	Caption,
	MonoCaption,
	Muted,
	PageTitle,
	SectionHeading,
} from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";

type Message = components["schemas"]["Message"];
type SessionSummaries = components["schemas"]["SessionSummaries"];
type Summary = components["schemas"]["Summary"];
type Tab = "messages" | "summaries" | "context" | "peers";

export function SessionDetail() {
	const { mask } = useDemo();
	const { workspaceId, sessionId } = useParams({ strict: false }) as {
		workspaceId: string;
		sessionId: string;
	};
	const navigate = useNavigate();

	const [tab, setTab] = useState<Tab>("messages");
	const [page, setPage] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchActive, setSearchActive] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const { data: msgData, isLoading: msgsLoading } = useSessionMessages(
		workspaceId,
		sessionId,
		page,
	);
	const { data: summaries, isLoading: summariesLoading } = useSessionSummaries(
		workspaceId,
		sessionId,
	);
	const { data: context, isLoading: contextLoading } = useSessionContext(workspaceId, sessionId);
	const { data: sessionPeers, isLoading: peersLoading } = useSessionPeers(workspaceId, sessionId);
	const { data: allPeers } = usePeers(workspaceId, 1, 100);

	const deleteSession = useDeleteSession(workspaceId);
	const cloneSession = useCloneSession(workspaceId);
	const searchSession = useSearchSession(workspaceId, sessionId);
	const removePeers = useRemovePeersFromSession(workspaceId, sessionId);
	const addPeers = useAddPeersToSession(workspaceId, sessionId);

	const messages: Message[] = (msgData as { items?: Message[] } | undefined)?.items ?? [];
	const totalPages = (msgData as { pages?: number } | undefined)?.pages ?? 1;

	const sessionPeerItems =
		(sessionPeers as { items?: Array<{ id?: string; peer_id?: string }> } | undefined)?.items ?? [];

	const memberPeerIds = new Set(sessionPeerItems.map((p) => p.id ?? p.peer_id ?? ""));

	const availablePeers = (
		(allPeers as { items?: Array<{ id: string }> } | undefined)?.items ?? []
	).filter((p) => !memberPeerIds.has(p.id));

	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: "messages", label: "Messages" },
		{ id: "summaries", label: "Summaries" },
		{ id: "context", label: "Context" },
		{ id: "peers", label: "Peers" },
	];

	const handleDelete = async () => {
		await deleteSession.mutateAsync(sessionId);
		navigate({
			to: "/workspaces/$workspaceId/sessions" as never,
			params: { workspaceId } as never,
		});
	};

	const handleClone = async () => {
		const cloned = await cloneSession.mutateAsync(sessionId);
		if ((cloned as { id?: string })?.id) {
			navigate({
				to: "/workspaces/$workspaceId/sessions/$sessionId" as never,
				params: { workspaceId, sessionId: (cloned as { id: string }).id } as never,
			});
		}
	};

	return (
		<div className="page-container page-container--wide">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-3)" }}>
					<Link
						to="/workspaces/$workspaceId"
						params={{ workspaceId } as never}
						className="hover:underline font-mono"
					>
						{mask(workspaceId)}
					</Link>
					<span>/</span>
					<Link
						to="/workspaces/$workspaceId/sessions"
						params={{ workspaceId } as never}
						className="hover:underline"
					>
						Sessions
					</Link>
				</div>

				<div className="flex items-start justify-between gap-4 mb-1">
					<div className="flex items-center gap-2 min-w-0">
						<MessageSquare
							className="w-5 h-5 flex-shrink-0"
							style={{ color: "var(--accent)" }}
							strokeWidth={1.5}
						/>
						<PageTitle className="font-mono break-all">{mask(sessionId)}</PageTitle>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						<Button
							variant={searchActive ? "accent" : "surface"}
							size="icon"
							onClick={() => setSearchActive((v) => !v)}
							aria-label="Search session"
						>
							<Search className="w-3.5 h-3.5" strokeWidth={2} />
						</Button>
						<Button
							variant="surface"
							size="icon"
							onClick={handleClone}
							disabled={cloneSession.isPending}
							aria-label="Clone session"
						>
							<Copy className="w-3.5 h-3.5" strokeWidth={2} />
						</Button>
						<Button
							variant="destructive"
							size="icon"
							onClick={() => setConfirmDelete(true)}
							aria-label="Delete session"
						>
							<Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
						</Button>
					</div>
				</div>
				<Body className="leading-none">Session detail</Body>
			</motion.div>

			{/* Inline search bar */}
			<AnimatePresence>
				{searchActive && (
					<motion.div
						initial={{ opacity: 0, height: 0, marginTop: 0 }}
						animate={{ opacity: 1, height: "auto", marginTop: 16 }}
						exit={{ opacity: 0, height: 0, marginTop: 0 }}
						className="overflow-hidden"
					>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (searchQuery.trim()) searchSession.mutate(searchQuery.trim());
							}}
							className="flex gap-2"
						>
							<Input
								autoFocus
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search within this session…"
								className="flex-1"
							/>
							<Button type="submit" variant="accent" disabled={searchSession.isPending}>
								{searchSession.isPending ? "…" : "Search"}
							</Button>
						</form>
						{searchSession.data && (
							<div className="mt-3 rounded-xl p-4 theme-card space-y-2">
								{(searchSession.data as Array<{ id: string; content: string; peer_id?: string }>)
									.length === 0 ? (
									<Muted>No results.</Muted>
								) : (
									(
										searchSession.data as Array<{ id: string; content: string; peer_id?: string }>
									).map((r) => (
										<div
											key={r.id}
											className="text-sm py-2"
											style={{ borderBottom: "1px solid var(--border)", color: "var(--text-2)" }}
										>
											{r.peer_id && <Badge variant="blue">{mask(r.peer_id)}</Badge>}
											<p className="mt-1 whitespace-pre-wrap">{mask(r.content)}</p>
										</div>
									))
								)}
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			<div className="mt-8">
				{/* Tab bar */}
				<div
					className="flex gap-0.5 mb-4 p-1 rounded-xl"
					style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}
				>
					{tabs.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => setTab(t.id)}
							className="relative flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
							style={{ color: tab === t.id ? "var(--text-1)" : "var(--text-3)" }}
						>
							{tab === t.id && (
								<motion.div
									layoutId="session-tab-active"
									className="absolute inset-0 rounded-lg"
									style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
									transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
								/>
							)}
							<span className="relative z-10">{t.label}</span>
						</button>
					))}
				</div>

				<motion.div
					key={tab}
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2 }}
					className="rounded-xl p-5 theme-card"
				>
					{tab === "messages" &&
						(msgsLoading ? (
							<PageLoader />
						) : (
							<div>
								{messages.length === 0 ? (
									<Muted>No messages.</Muted>
								) : (
									<div className="space-y-4">
										{messages.map((msg) => (
											<div
												key={msg.id}
												className="pb-4"
												style={{ borderBottom: "1px solid var(--border)" }}
											>
												<div className="flex items-center gap-2 mb-2 flex-wrap">
													<Badge variant={msg.peer_id ? "blue" : "default"}>
														{msg.peer_id ? mask(msg.peer_id) : "system"}
													</Badge>
													{msg.token_count != null && <Caption>{msg.token_count} tokens</Caption>}
													{msg.created_at && (
														<Caption>{new Date(msg.created_at).toLocaleString()}</Caption>
													)}
												</div>
												<Body className="whitespace-pre-wrap">{mask(msg.content)}</Body>
											</div>
										))}
									</div>
								)}
								<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
							</div>
						))}

					{tab === "summaries" &&
						(summariesLoading ? <PageLoader /> : <SummariesDisplay summaries={summaries} />)}

					{tab === "context" &&
						(contextLoading ? (
							<PageLoader />
						) : (
							<>
								<SectionHeading>Session Context</SectionHeading>
								{typeof context === "string" ? (
									<Body className="whitespace-pre-wrap">{context}</Body>
								) : (
									<JsonViewer data={context} maxHeight="500px" />
								)}
							</>
						))}

					{tab === "peers" &&
						(peersLoading ? (
							<PageLoader />
						) : (
							<SessionPeersTab
								members={sessionPeerItems}
								available={availablePeers}
								onRemove={(id) => removePeers.mutate([id])}
								onAdd={(id) => addPeers.mutate({ [id]: {} })}
								removing={removePeers.isPending}
								adding={addPeers.isPending}
							/>
						))}
				</motion.div>
			</div>

			<ConfirmDialog
				open={confirmDelete}
				title="Delete session"
				description={`Permanently delete session "${mask(sessionId)}"? This cannot be undone.`}
				confirmLabel="Delete session"
				onConfirm={handleDelete}
				onCancel={() => setConfirmDelete(false)}
				loading={deleteSession.isPending}
			/>
		</div>
	);
}

function SessionPeersTab({
	members,
	available,
	onRemove,
	onAdd,
	removing,
	adding,
}: {
	members: Array<{ id?: string; peer_id?: string }> | undefined;
	available: Array<{ id: string }>;
	onRemove: (id: string) => void;
	onAdd: (id: string) => void;
	removing: boolean;
	adding: boolean;
}) {
	const list = members ?? [];

	return (
		<div className="space-y-4">
			<div>
				<SectionHeading className="mb-2">
					<Users className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={2} />
					Session members ({list.length})
				</SectionHeading>
				{list.length === 0 ? (
					<Muted>No peers in this session.</Muted>
				) : (
					<div className="space-y-1">
						{list.map((p) => {
							const id = p.id ?? p.peer_id ?? "";
							return (
								<div
									key={id}
									className="flex items-center justify-between py-1.5 px-3 rounded-lg"
									style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
								>
									<span className="text-xs font-mono" style={{ color: "var(--accent-text)" }}>
										{id}
									</span>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => onRemove(id)}
										disabled={removing}
										aria-label={`Remove ${id}`}
									>
										<X className="w-3 h-3" strokeWidth={2} />
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{available.length > 0 && (
				<div>
					<SectionHeading className="mb-2">Add peer</SectionHeading>
					<div className="space-y-1 max-h-48 overflow-auto">
						{available.map((p) => (
							<button
								key={p.id}
								type="button"
								onClick={() => onAdd(p.id)}
								disabled={adding}
								className="w-full text-left py-1.5 px-3 rounded-lg text-xs font-mono transition-all disabled:opacity-40"
								style={{
									background: "var(--surface)",
									border: "1px solid var(--border)",
									color: "var(--text-3)",
								}}
							>
								+ {p.id}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function SummaryCard({ label, summary }: { label: string; summary: Summary }) {
	const { mask } = useDemo();
	return (
		<div
			className="rounded-xl p-4"
			style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
		>
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-1.5">
					<AlignLeft className="w-3.5 h-3.5" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
					<span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
						{label}
					</span>
				</div>
				<div className="flex items-center gap-3">
					{summary.token_count != null && <MonoCaption>{summary.token_count} tok</MonoCaption>}
					{summary.created_at && (
						<div className="flex items-center gap-1">
							<Clock className="w-3 h-3" style={{ color: "var(--text-4)" }} strokeWidth={1.5} />
							<MonoCaption>{new Date(summary.created_at).toLocaleString()}</MonoCaption>
						</div>
					)}
				</div>
			</div>
			<Body className="whitespace-pre-wrap">{mask(summary.content)}</Body>
		</div>
	);
}

function SummariesDisplay({ summaries }: { summaries: unknown }) {
	const data = summaries as SessionSummaries | null | undefined;

	if (!data || (!data.short_summary && !data.long_summary)) {
		return (
			<>
				<SectionHeading>Session Summaries</SectionHeading>
				<Caption as="p">No summaries available yet.</Caption>
			</>
		);
	}

	return (
		<>
			<SectionHeading>Session Summaries</SectionHeading>
			<div className="space-y-3">
				{data.short_summary && <SummaryCard label="Short summary" summary={data.short_summary} />}
				{data.long_summary && <SummaryCard label="Long summary" summary={data.long_summary} />}
			</div>
		</>
	);
}
