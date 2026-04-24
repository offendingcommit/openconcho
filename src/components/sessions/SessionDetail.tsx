import { useState } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Trash2, Copy, Search, Users, X } from "lucide-react";
import {
	useSessionMessages,
	useSessionSummaries,
	useSessionContext,
	useSessionPeers,
	useDeleteSession,
	useCloneSession,
	useSearchSession,
	useRemovePeersFromSession,
	usePeers,
	useAddPeersToSession,
} from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Pagination } from "@/components/shared/Pagination";
import { Badge } from "@/components/shared/Badge";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { components } from "@/api/schema.d.ts";

type Message = components["schemas"]["Message"];
type Tab = "messages" | "summaries" | "context" | "peers";

export function SessionDetail() {
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

	const { data: msgData, isLoading: msgsLoading } = useSessionMessages(workspaceId, sessionId, page);
	const { data: summaries, isLoading: summariesLoading } = useSessionSummaries(workspaceId, sessionId);
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

	const memberPeerIds = new Set(
		(sessionPeers as Array<{ id?: string; peer_id?: string }> | undefined)?.map(
			(p) => p.id ?? p.peer_id ?? "",
		) ?? [],
	);

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
		navigate({ to: "/workspaces/$workspaceId/sessions" as never, params: { workspaceId } as never });
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
		<div className="page-container">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-3)" }}>
					<Link to="/workspaces/$workspaceId" params={{ workspaceId } as never} className="hover:underline font-mono">
						{workspaceId}
					</Link>
					<span>/</span>
					<Link to="/workspaces/$workspaceId/sessions" params={{ workspaceId } as never} className="hover:underline">
						Sessions
					</Link>
				</div>

				<div className="flex items-start justify-between gap-4 mb-1">
					<div className="flex items-center gap-2 min-w-0">
						<MessageSquare className="w-5 h-5 flex-shrink-0" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
						<h1 className="text-xl font-semibold font-mono break-all tracking-tight" style={{ color: "var(--text-1)" }}>
							{sessionId}
						</h1>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						<button
							onClick={() => setSearchActive((v) => !v)}
							className="p-1.5 rounded-lg transition-colors"
							style={{
								background: searchActive ? "var(--accent-dim)" : "var(--surface)",
								border: `1px solid ${searchActive ? "var(--accent-border)" : "var(--border)"}`,
								color: searchActive ? "var(--accent-text)" : "var(--text-3)",
							}}
						>
							<Search className="w-3.5 h-3.5" strokeWidth={2} />
						</button>
						<button
							onClick={handleClone}
							disabled={cloneSession.isPending}
							className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
							style={{
								background: "var(--surface)",
								border: "1px solid var(--border)",
								color: "var(--text-3)",
							}}
						>
							<Copy className="w-3.5 h-3.5" strokeWidth={2} />
						</button>
						<button
							onClick={() => setConfirmDelete(true)}
							className="p-1.5 rounded-lg transition-colors"
							style={{
								background: "rgba(239,68,68,0.08)",
								border: "1px solid rgba(239,68,68,0.2)",
								color: "#f87171",
							}}
						>
							<Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
						</button>
					</div>
				</div>
				<p className="text-sm" style={{ color: "var(--text-2)" }}>Session detail</p>
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
							<input
								autoFocus
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search within this session…"
								className="theme-input flex-1 text-sm px-3 py-2 rounded-lg"
							/>
							<button
								type="submit"
								disabled={searchSession.isPending}
								className="px-3 py-2 text-sm rounded-lg font-medium"
								style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent-text)" }}
							>
								{searchSession.isPending ? "…" : "Search"}
							</button>
						</form>
						{searchSession.data && (
							<div className="mt-3 rounded-xl p-4 theme-card space-y-2">
								{(searchSession.data as Array<{ id: string; content: string; peer_id?: string }>).length === 0 ? (
									<p className="text-sm" style={{ color: "var(--text-3)" }}>No results.</p>
								) : (
									(searchSession.data as Array<{ id: string; content: string; peer_id?: string }>).map((r) => (
										<div key={r.id} className="text-sm py-2" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-2)" }}>
											{r.peer_id && <Badge variant="blue" >{r.peer_id}</Badge>}
											<p className="mt-1 whitespace-pre-wrap">{r.content}</p>
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
					{tab === "messages" && (
						msgsLoading ? <PageLoader /> : (
							<div>
								{messages.length === 0 ? (
									<p className="text-sm" style={{ color: "var(--text-3)" }}>No messages.</p>
								) : (
									<div className="space-y-4">
										{messages.map((msg) => (
											<div key={msg.id} className="pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
												<div className="flex items-center gap-2 mb-2 flex-wrap">
													<Badge variant={msg.peer_id ? "blue" : "default"}>
														{msg.peer_id ?? "system"}
													</Badge>
													{msg.token_count != null && (
														<span className="text-xs" style={{ color: "var(--text-4)" }}>
															{msg.token_count} tokens
														</span>
													)}
													{msg.created_at && (
														<span className="text-xs" style={{ color: "var(--text-4)" }}>
															{new Date(msg.created_at).toLocaleString()}
														</span>
													)}
												</div>
												<p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-2)" }}>
													{msg.content}
												</p>
											</div>
										))}
									</div>
								)}
								<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
							</div>
						)
					)}

					{tab === "summaries" && (
						summariesLoading ? <PageLoader /> : (
							<>
								<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>Session Summaries</h2>
								<JsonViewer data={summaries} maxHeight="500px" />
							</>
						)
					)}

					{tab === "context" && (
						contextLoading ? <PageLoader /> : (
							<>
								<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>Session Context</h2>
								{typeof context === "string" ? (
									<p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-2)" }}>
										{context}
									</p>
								) : (
									<JsonViewer data={context} maxHeight="500px" />
								)}
							</>
						)
					)}

					{tab === "peers" && (
						peersLoading ? <PageLoader /> : (
							<SessionPeersTab
								members={sessionPeers as Array<{ id?: string; peer_id?: string }> | undefined}
								available={availablePeers}
								onRemove={(id) => removePeers.mutate([id])}
								onAdd={(id) => addPeers.mutate({ [id]: {} })}
								removing={removePeers.isPending}
								adding={addPeers.isPending}
							/>
						)
					)}
				</motion.div>
			</div>

			<ConfirmDialog
				open={confirmDelete}
				title="Delete session"
				description={`Permanently delete session "${sessionId}"? This cannot be undone.`}
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
				<h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-1)" }}>
					<Users className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={2} />
					Session members ({list.length})
				</h2>
				{list.length === 0 ? (
					<p className="text-sm" style={{ color: "var(--text-3)" }}>No peers in this session.</p>
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
									<span className="text-xs font-mono" style={{ color: "var(--accent-text)" }}>{id}</span>
									<button
										onClick={() => onRemove(id)}
										disabled={removing}
										className="p-1 rounded transition-colors disabled:opacity-40"
										style={{ color: "var(--text-4)" }}
									>
										<X className="w-3 h-3" strokeWidth={2} />
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{available.length > 0 && (
				<div>
					<h2 className="text-sm font-medium mb-2" style={{ color: "var(--text-2)" }}>
						Add peer
					</h2>
					<div className="space-y-1 max-h-48 overflow-auto">
						{available.map((p) => (
							<button
								key={p.id}
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
