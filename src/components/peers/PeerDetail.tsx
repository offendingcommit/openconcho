import {
	usePeer,
	usePeerCard,
	usePeerContext,
	usePeerRepresentation,
	useSearchPeer,
	useSetPeerCard,
} from "@/api/queries";
import { Badge } from "@/components/shared/Badge";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { PeerCardViewer } from "@/components/shared/PeerCardViewer";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Save, Search, User, X } from "lucide-react";
import { useState } from "react";

type Tab = "context" | "card" | "representation" | "metadata" | "search";

export function PeerDetail() {
	const { workspaceId, peerId } = useParams({ strict: false }) as {
		workspaceId: string;
		peerId: string;
	};
	const navigate = useNavigate();
	const [tab, setTab] = useState<Tab>("context");

	const { data: peer, isLoading, error } = usePeer(workspaceId, peerId);
	const { data: card, isLoading: cardLoading } = usePeerCard(workspaceId, peerId);
	const { data: context, isLoading: contextLoading } = usePeerContext(workspaceId, peerId);
	const { data: representation, isLoading: repLoading } = usePeerRepresentation(
		workspaceId,
		peerId,
	);

	const setPeerCard = useSetPeerCard(workspaceId, peerId);
	const searchPeer = useSearchPeer(workspaceId, peerId);

	const [cardDraft, setCardDraft] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	const cardLines: string[] = Array.isArray((card as { peer_card?: unknown })?.peer_card)
		? (card as { peer_card: string[] }).peer_card
		: typeof card === "string"
			? [card]
			: [];

	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: "context", label: "Context" },
		{ id: "card", label: "Card" },
		{ id: "representation", label: "Representation" },
		{ id: "search", label: "Search" },
		{ id: "metadata", label: "Metadata" },
	];

	return (
		<div className="page-container">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-3)" }}>
					<Link to="/workspaces" className="hover:underline">
						Workspaces
					</Link>
					<span>/</span>
					<Link
						to="/workspaces/$workspaceId"
						params={{ workspaceId } as never}
						className="hover:underline font-mono"
					>
						{workspaceId}
					</Link>
					<span>/</span>
					<Link
						to="/workspaces/$workspaceId/peers"
						params={{ workspaceId } as never}
						className="hover:underline"
					>
						Peers
					</Link>
				</div>

				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<User className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
							<h1
								className="text-xl font-semibold font-mono break-all tracking-tight"
								style={{ color: "var(--text-1)" }}
							>
								{peerId}
							</h1>
						</div>
						<p className="text-sm" style={{ color: "var(--text-2)" }}>
							Peer identity &amp; memory
						</p>
					</div>
					<button
						onClick={() =>
							navigate({
								to: "/workspaces/$workspaceId/peers/$peerId/chat",
								params: { workspaceId, peerId } as never,
							})
						}
						className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
						style={{ background: "var(--accent)", color: "#fff" }}
					>
						<MessageCircle className="w-4 h-4" strokeWidth={1.5} />
						Chat
					</button>
				</div>
			</motion.div>

			<div className="mt-8">
				<ErrorAlert error={error instanceof Error ? error : null} />
				{isLoading && <PageLoader />}

				{!isLoading && peer && (
					<>
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
											layoutId="tab-active"
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
							{tab === "context" &&
								(contextLoading ? (
									<PageLoader />
								) : (
									<>
										<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>
											Peer Context
										</h2>
										{typeof context === "string" ? (
											<p
												className="text-sm whitespace-pre-wrap leading-relaxed"
												style={{ color: "var(--text-2)" }}
											>
												{context}
											</p>
										) : (
											<JsonViewer data={context} />
										)}
									</>
								))}

							{tab === "card" &&
								(cardLoading ? (
									<PageLoader />
								) : (
									<>
										<div className="flex items-center justify-between mb-3">
											<h2 className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
												Peer Card
											</h2>
											{cardDraft === null ? (
												<button
													onClick={() => setCardDraft(cardLines.join("\n"))}
													className="text-xs px-2 py-1 rounded-lg transition-colors"
													style={{
														background: "var(--accent-dim)",
														border: "1px solid var(--accent-border)",
														color: "var(--accent-text)",
													}}
												>
													Edit
												</button>
											) : (
												<div className="flex gap-1.5">
													<button
														onClick={() => {
															setPeerCard.mutate(cardDraft.split("\n").filter(Boolean));
															setCardDraft(null);
														}}
														disabled={setPeerCard.isPending}
														className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg disabled:opacity-50"
														style={{
															background: "var(--accent-dim)",
															border: "1px solid var(--accent-border)",
															color: "var(--accent-text)",
														}}
													>
														<Save className="w-3 h-3" strokeWidth={2} />
														Save
													</button>
													<button
														onClick={() => setCardDraft(null)}
														className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
														style={{
															background: "var(--surface)",
															border: "1px solid var(--border)",
															color: "var(--text-3)",
														}}
													>
														<X className="w-3 h-3" strokeWidth={2} />
													</button>
												</div>
											)}
										</div>
										<AnimatePresence mode="wait">
											{cardDraft !== null ? (
												<motion.textarea
													key="edit"
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													value={cardDraft}
													onChange={(e) => setCardDraft(e.target.value)}
													rows={8}
													className="theme-input w-full text-sm px-3 py-2 rounded-lg font-mono resize-y"
													style={{ minHeight: "8rem" }}
												/>
											) : (
												<motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
													<PeerCardViewer lines={cardLines} />
												</motion.div>
											)}
										</AnimatePresence>
									</>
								))}

							{tab === "representation" &&
								(repLoading ? (
									<PageLoader />
								) : (
									<>
										<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>
											Memory Representation
										</h2>
										{representation &&
										typeof (representation as { representation?: unknown }).representation ===
											"string" ? (
											<MarkdownRenderer
												content={(representation as { representation: string }).representation}
											/>
										) : (
											<JsonViewer data={representation} maxHeight="400px" />
										)}
									</>
								))}

							{tab === "search" && (
								<>
									<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>
										<Search className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={2} />
										Search peer messages
									</h2>
									<form
										onSubmit={(e) => {
											e.preventDefault();
											if (searchQuery.trim()) searchPeer.mutate(searchQuery.trim());
										}}
										className="flex gap-2 mb-4"
									>
										<input
											autoFocus
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											placeholder="Semantic search across this peer's messages…"
											className="theme-input flex-1 text-sm px-3 py-2 rounded-lg"
										/>
										<button
											type="submit"
											disabled={searchPeer.isPending}
											className="px-3 py-2 text-sm rounded-lg font-medium"
											style={{
												background: "var(--accent-dim)",
												border: "1px solid var(--accent-border)",
												color: "var(--accent-text)",
											}}
										>
											{searchPeer.isPending ? "…" : "Search"}
										</button>
									</form>
									{searchPeer.data && (
										<div className="space-y-3">
											{(
												searchPeer.data as Array<{
													id: string;
													content: string;
													peer_id?: string;
													created_at?: string;
												}>
											).length === 0 ? (
												<p className="text-sm" style={{ color: "var(--text-3)" }}>
													No results.
												</p>
											) : (
												(
													searchPeer.data as Array<{
														id: string;
														content: string;
														peer_id?: string;
														created_at?: string;
													}>
												).map((r) => (
													<div
														key={r.id}
														className="py-3 px-4 rounded-lg"
														style={{
															background: "var(--surface)",
															border: "1px solid var(--border)",
														}}
													>
														<div className="flex items-center gap-2 mb-1.5">
															<Badge variant="blue">{r.peer_id ?? peerId}</Badge>
															{r.created_at && (
																<span className="text-xs" style={{ color: "var(--text-4)" }}>
																	{new Date(r.created_at).toLocaleString()}
																</span>
															)}
														</div>
														<p
															className="text-sm whitespace-pre-wrap"
															style={{ color: "var(--text-2)" }}
														>
															{r.content}
														</p>
													</div>
												))
											)}
										</div>
									)}
								</>
							)}

							{tab === "metadata" && (
								<>
									<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>
										Peer Metadata
									</h2>
									<JsonViewer data={peer.metadata} maxHeight="400px" />
								</>
							)}
						</motion.div>
					</>
				)}
			</div>
		</div>
	);
}
