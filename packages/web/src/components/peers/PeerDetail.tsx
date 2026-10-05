import { useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
	Brain,
	Check,
	Eye,
	EyeOff,
	FlaskConical,
	MessageCircle,
	Pencil,
	Save,
	Search,
	User,
	Users,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	useConclusionTargetPeers,
	usePeer,
	usePeerCard,
	usePeerContext,
	usePeerRepresentation,
	useQueryPeerConclusions,
	useSearchPeer,
	useSetPeerCard,
	useUpdatePeer,
} from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Badge } from "@/components/shared/Badge";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { PeerCardViewer } from "@/components/shared/PeerCardViewer";
import { Skeleton } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
	Body,
	Caption,
	MonoCaption,
	Muted,
	PageTitle,
	SectionHeading,
} from "@/components/ui/typography";
import { useDemo } from "@/hooks/useDemo";
import { useMetadata } from "@/hooks/useMetadata";
import { COLOR } from "@/lib/constants";
import { DISPLAY_NAME_KEY, hasDisplayName, peerDisplayName } from "@/lib/peerDisplay";

export function PeerDetail() {
	const { mask } = useDemo();
	const { showMetadata } = useMetadata();
	const { workspaceId, peerId } = useParams({ strict: false }) as {
		workspaceId: string;
		peerId: string;
	};
	const navigate = useNavigate();

	const { data: peer, isLoading, error } = usePeer(workspaceId, peerId);
	const { data: card, isLoading: cardLoading } = usePeerCard(workspaceId, peerId);
	const { data: context, isLoading: contextLoading } = usePeerContext(workspaceId, peerId);

	const [repTarget, setRepTarget] = useState("");
	const [repTargetInput, setRepTargetInput] = useState("");
	const { data: representation, isLoading: repLoading } = usePeerRepresentation(
		workspaceId,
		peerId,
		repTarget || undefined,
	);

	const setPeerCard = useSetPeerCard(workspaceId, peerId);
	const searchPeer = useSearchPeer(workspaceId, peerId);

	const [cardDraft, setCardDraft] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	// Knowledge/conclusion search: scoped to this peer as observer. The observed
	// target is DISCOVERED from the conclusions this peer actually holds (no
	// hardcoded peer names, no unrestricted fallback): when exactly one target
	// exists it is auto-selected; otherwise the user picks it explicitly from
	// the picker. Typing a free-form name is no longer the only path.
	const [knowledgeQuery, setKnowledgeQuery] = useState("");
	const [activeKnowledgeQuery, setActiveKnowledgeQuery] = useState("");
	const [knowledgeTarget, setKnowledgeTarget] = useState<string | null>(null);
	const {
		data: discovery,
		isLoading: discoveryLoading,
		error: discoveryError,
	} = useConclusionTargetPeers(workspaceId, peerId);
	const targetPeers = discovery?.targets ?? [];
	const discoveryIncomplete = discovery !== undefined && !discovery.complete;

	// Reset per-peer target state when the viewed workspace or peer changes: a
	// stale target from the previous context would silently scope the knowledge
	// search wrong and a burnt auto-select flag would disable auto-picking for
	// the new context.
	const prevScopeRef = useRef(`${workspaceId}\u0000${peerId}`);
	useEffect(() => {
		const scope = `${workspaceId}\u0000${peerId}`;
		if (prevScopeRef.current !== scope) {
			prevScopeRef.current = scope;
			setKnowledgeTarget(null);
			setTargetAutoSelected(false);
		}
	}, [workspaceId, peerId]);

	// Auto-select when exactly one real target exists. Only when nothing is
	// picked yet, so an explicit user choice wins, and only when discovery is
	// COMPLETE — a single target found by a cap-truncated walk is not proven to
	// be the only one.
	const [targetAutoSelected, setTargetAutoSelected] = useState(false);
	useEffect(() => {
		if (targetAutoSelected || knowledgeTarget !== null || !discovery) return;
		if (discovery.complete && targetPeers.length === 1) {
			setKnowledgeTarget(targetPeers[0].id);
			setTargetAutoSelected(true);
		}
	}, [targetAutoSelected, knowledgeTarget, discovery, targetPeers]);

	const {
		data: knowledgeResults,
		isLoading: knowledgeLoading,
		error: knowledgeError,
	} = useQueryPeerConclusions(
		workspaceId,
		peerId,
		activeKnowledgeQuery,
		knowledgeTarget,
		Boolean(activeKnowledgeQuery),
	);

	const peerMeta = (peer as { metadata?: Record<string, unknown> } | undefined)?.metadata;
	const displayName = peerDisplayName(peerMeta, peerId);
	const showsDisplayName = hasDisplayName(peerMeta, peerId);
	const updatePeer = useUpdatePeer(workspaceId, peerId);
	const [nameDraft, setNameDraft] = useState<string | null>(null);

	function saveDisplayName() {
		const next = (nameDraft ?? "").trim();
		const merged: Record<string, unknown> = { ...(peerMeta ?? {}) };
		if (next) merged[DISPLAY_NAME_KEY] = next;
		else delete merged[DISPLAY_NAME_KEY];
		updatePeer.mutate({ metadata: merged }, { onSuccess: () => setNameDraft(null) });
	}

	const observeMe = (peer as { configuration?: { observe_me?: boolean } } | undefined)
		?.configuration?.observe_me;

	const cardLines: string[] = Array.isArray((card as { peer_card?: unknown })?.peer_card)
		? (card as { peer_card: string[] }).peer_card
		: typeof card === "string"
			? [card]
			: [];

	return (
		<div className="page-container page-container--xl">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<Breadcrumb labels={{ [peerId]: displayName }} />

				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<User className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
							{nameDraft === null ? (
								<>
									<PageTitle className={showsDisplayName ? "break-all" : "font-mono break-all"}>
										{mask(displayName)}
									</PageTitle>
									<button
										type="button"
										onClick={() => setNameDraft(showsDisplayName ? displayName : "")}
										className="shrink-0 p-1 rounded-md transition-colors hover:bg-[color:var(--surface)]"
										style={{ color: "var(--text-4)" }}
										title="Edit display name"
									>
										<Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
									</button>
								</>
							) : (
								<div className="flex items-center gap-1.5">
									<Input
										value={nameDraft}
										onChange={(e) => setNameDraft(e.currentTarget.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") saveDisplayName();
											if (e.key === "Escape") setNameDraft(null);
										}}
										placeholder="Display name"
										autoFocus
										className="w-56"
									/>
									<Button
										variant="surface"
										onClick={saveDisplayName}
										disabled={updatePeer.isPending}
										title="Save display name"
									>
										<Check className="w-3.5 h-3.5" strokeWidth={2} />
									</Button>
									<Button variant="surface" onClick={() => setNameDraft(null)} title="Cancel">
										<X className="w-3.5 h-3.5" strokeWidth={2} />
									</Button>
								</div>
							)}
							{nameDraft === null && observeMe !== undefined && (
								<span
									className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-mono"
									style={{
										background: observeMe ? COLOR.accentSubtle : COLOR.cardBaseBg,
										color: observeMe ? COLOR.accentText : COLOR.dimText,
										border: `1px solid ${observeMe ? COLOR.accentBorder : COLOR.cardBaseBorder}`,
									}}
								>
									{observeMe ? (
										<Eye className="w-3 h-3" strokeWidth={2} />
									) : (
										<EyeOff className="w-3 h-3" strokeWidth={2} />
									)}
									{observeMe ? "observed" : "not observed"}
								</span>
							)}
						</div>
						{showsDisplayName && nameDraft === null && (
							<MonoCaption className="break-all">{mask(peerId)}</MonoCaption>
						)}
						<Body className="leading-none">Peer identity &amp; memory</Body>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Button
							variant="surface"
							onClick={() =>
								navigate({
									to: "/workspaces/$workspaceId/peers/$peerId/playground",
									params: { workspaceId, peerId } as never,
								})
							}
							className="rounded-xl"
							title="Compare reasoning levels side-by-side"
						>
							<FlaskConical className="w-4 h-4" strokeWidth={1.5} />
							Playground
						</Button>
						<Button
							variant="primary"
							onClick={() =>
								navigate({
									to: "/workspaces/$workspaceId/peers/$peerId/chat",
									params: { workspaceId, peerId } as never,
								})
							}
							className="rounded-xl"
						>
							<MessageCircle className="w-4 h-4" strokeWidth={1.5} />
							Chat
						</Button>
					</div>
				</div>
			</motion.div>

			<div className="mt-6 space-y-4">
				<ErrorAlert error={error instanceof Error ? error : null} />
				{isLoading && <PeerDetailSkeleton />}

				{!isLoading && peer && (
					<>
						{/* Search — prominent, always visible */}
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.05 }}
							className="rounded-xl p-5 theme-card"
						>
							<SectionHeading className="flex items-center gap-1.5 mb-3">
								<Search className="w-3.5 h-3.5" strokeWidth={2} />
								Search peer messages
							</SectionHeading>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									if (searchQuery.trim()) searchPeer.mutate(searchQuery.trim());
								}}
								className="flex gap-2 mb-4"
							>
								<Input
									autoFocus
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Semantic search across this peer's messages…"
									className="flex-1 text-sm"
								/>
								<Button type="submit" variant="accent" disabled={searchPeer.isPending}>
									{searchPeer.isPending ? "…" : "Search"}
								</Button>
							</form>
							<AnimatePresence>
								{searchPeer.data && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="space-y-3 overflow-hidden"
									>
										{(
											searchPeer.data as Array<{
												id: string;
												content: string;
												peer_id?: string;
												created_at?: string;
											}>
										).length === 0 ? (
											<Muted>No results.</Muted>
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
														<Badge variant="blue">{mask(r.peer_id ?? peerId)}</Badge>
														{r.created_at && (
															<Caption>{new Date(r.created_at).toLocaleString()}</Caption>
														)}
													</div>
													<Body className="whitespace-pre-wrap">{mask(r.content)}</Body>
												</div>
											))
										)}
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>

						{/* Knowledge search — conclusions this peer holds, scoped observer → observed */}
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.07 }}
							className="rounded-xl p-5 theme-card"
						>
							<SectionHeading className="flex items-center gap-1.5 mb-1">
								<Brain className="w-3.5 h-3.5" strokeWidth={2} />
								Search peer knowledge (conclusions)
							</SectionHeading>
							<Muted className="mb-2 block text-xs">
								Semantic search over distilled conclusions this peer holds — not raw messages.
							</Muted>
							{/* Selected scope, shown up front: observer → discovered target. The
								target comes from a picker over REAL stored targets, never a guess. */}
							<div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
								<Badge variant="blue">
									scope: {mask(peerId)} → {mask(knowledgeTarget ?? "(select observed peer)")}
								</Badge>
								{discoveryIncomplete && (
									<Caption>
										Target list may be incomplete (store exceeds the discovery page cap).
									</Caption>
								)}
								{discoveryError && (
									<Caption>Target discovery failed — knowledge search unavailable.</Caption>
								)}
								{!discoveryLoading && !discoveryError && targetPeers.length === 0 && (
									<Caption>This peer holds no conclusions yet.</Caption>
								)}
							</div>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									setActiveKnowledgeQuery(knowledgeQuery.trim());
								}}
								className="flex gap-2 mb-4 flex-wrap"
							>
								<Input
									value={knowledgeQuery}
									onChange={(e) => setKnowledgeQuery(e.target.value)}
									placeholder="Search this peer's conclusions…"
									className="flex-1 text-sm min-w-48"
								/>
								<select
									aria-label="Observed peer (knowledge target)"
									value={knowledgeTarget ?? ""}
									onChange={(e) => setKnowledgeTarget(e.target.value || null)}
									className="w-56 rounded-md px-2 py-1 text-xs font-mono"
									style={{
										background: "var(--bg-3)",
										border: "1px solid var(--border)",
										color: "var(--text-2)",
									}}
								>
									<option value="">
										{discoveryLoading
											? "loading targets…"
											: discoveryError
												? "target discovery failed"
												: targetPeers.length === 0
													? "no targets available"
													: "observed peer — pick target"}
									</option>
									{targetPeers.map((t) => (
										<option key={t.id} value={t.id}>
											{mask(t.id)} ({t.count})
										</option>
									))}
								</select>
								<Button type="submit" variant="accent" disabled={knowledgeLoading}>
									{knowledgeLoading ? "…" : "Search"}
								</Button>
								{activeKnowledgeQuery && (
									<Button
										type="button"
										variant="surface"
										onClick={() => {
											setActiveKnowledgeQuery("");
											setKnowledgeQuery("");
										}}
									>
										<X className="w-3.5 h-3.5" strokeWidth={2} />
									</Button>
								)}
							</form>
							<ErrorAlert error={knowledgeError instanceof Error ? knowledgeError : null} />
							<AnimatePresence>
								{activeKnowledgeQuery && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: "auto" }}
										exit={{ opacity: 0, height: 0 }}
										className="space-y-3 overflow-hidden"
									>
										{knowledgeLoading ? (
											<PageLoader />
										) : !knowledgeTarget ? (
											<Muted>
												Pick an observed peer above — targets are listed from the conclusions this
												peer actually holds.
											</Muted>
										) : !Array.isArray(knowledgeResults) ||
											(knowledgeResults as components["schemas"]["Conclusion"][]).length === 0 ? (
											<Muted>No conclusions found for this scope.</Muted>
										) : (
											/* Display-only dedup: identical contents repeat heavily in the
											   store (bulk import). Collapse them here — the database is NOT
											   touched (no data lane in this repair). First occurrence wins;
											   provenance (observer→observed, session, timestamp) is kept
											   from that first row. */
											(() => {
												const all = knowledgeResults as components["schemas"]["Conclusion"][];
												const seenContent = new Set<string>();
												const deduped = all.filter((c) => {
													if (seenContent.has(c.content)) return false;
													seenContent.add(c.content);
													return true;
												});
												const hidden = all.length - deduped.length;
												return (
													<>
														{deduped.map((c) => (
															<div
																key={c.id}
																className="py-3 px-4 rounded-lg"
																style={{
																	background: "var(--surface)",
																	border: "1px solid var(--border)",
																}}
															>
																<div className="flex items-center gap-2 mb-1.5 flex-wrap">
																	<Badge variant="yellow">
																		{mask(c.observer_id)} → {mask(c.observed_id)}
																	</Badge>
																	{c.session_id && <Caption>session: {mask(c.session_id)}</Caption>}
																	{c.created_at && (
																		<Caption>{new Date(c.created_at).toLocaleString()}</Caption>
																	)}
																</div>
																<Body className="whitespace-pre-wrap">{mask(c.content)}</Body>
															</div>
														))}
														{hidden > 0 && (
															<Muted className="text-xs">
																{deduped.length} unique result{deduped.length === 1 ? "" : "s"} (
																{hidden} identical duplicate{hidden === 1 ? "" : "s"} hidden —
																display only, no data changed)
															</Muted>
														)}
													</>
												);
											})()
										)}
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>

						{/* Card + Representation — side by side */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							{/* Peer Card */}
							<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
								className="rounded-xl p-5 theme-card"
							>
								<div className="flex items-center justify-between mb-3">
									<SectionHeading className="mb-0">Peer Card</SectionHeading>
									{!cardLoading &&
										(cardDraft === null ? (
											<Button
												variant="accent"
												size="sm"
												onClick={() => setCardDraft(cardLines.join("\n"))}
											>
												Edit
											</Button>
										) : (
											<div className="flex gap-1.5">
												<Button
													variant="accent"
													size="sm"
													onClick={() => {
														setPeerCard.mutate(cardDraft.split("\n").filter(Boolean));
														setCardDraft(null);
													}}
													disabled={setPeerCard.isPending}
												>
													<Save className="w-3 h-3" strokeWidth={2} />
													Save
												</Button>
												<Button variant="surface" size="sm" onClick={() => setCardDraft(null)}>
													<X className="w-3 h-3" strokeWidth={2} />
												</Button>
											</div>
										))}
								</div>
								{cardLoading ? (
									<PageLoader />
								) : (
									<AnimatePresence mode="wait">
										{cardDraft !== null ? (
											<motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
												<Textarea
													value={cardDraft}
													onChange={(e) => setCardDraft(e.target.value)}
													rows={8}
													className="font-mono resize-y"
													style={{ minHeight: "8rem" }}
												/>
											</motion.div>
										) : (
											<motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
												{cardLines.length > 0 ? (
													<PeerCardViewer lines={cardLines} />
												) : (
													<Muted>No card data yet.</Muted>
												)}
											</motion.div>
										)}
									</AnimatePresence>
								)}
							</motion.div>

							{/* Representation */}
							<motion.div
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.15 }}
								className="rounded-xl p-5 theme-card"
							>
								<div className="flex items-center justify-between mb-3 gap-3">
									<SectionHeading className="mb-0 flex items-center gap-1.5">
										<Users className="w-3.5 h-3.5" strokeWidth={2} />
										{repTarget ? (
											<>
												<MonoCaption as="span">{mask(peerId)}</MonoCaption>
												<span className="opacity-50">→</span>
												<MonoCaption as="span">{mask(repTarget)}</MonoCaption>
											</>
										) : (
											"Memory Representation"
										)}
									</SectionHeading>
									<form
										onSubmit={(e) => {
											e.preventDefault();
											setRepTarget(repTargetInput.trim());
										}}
										className="flex items-center gap-1.5 shrink-0"
									>
										<Input
											value={repTargetInput}
											onChange={(e) => setRepTargetInput(e.target.value)}
											placeholder="view as peer…"
											className="text-xs font-mono h-7 w-36 rounded-lg"
										/>
										<Button type="submit" variant="surface" size="sm" className="h-7 px-2 text-xs">
											{repTarget ? "Update" : "Scope"}
										</Button>
										{repTarget && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												onClick={() => {
													setRepTarget("");
													setRepTargetInput("");
												}}
											>
												<X className="w-3 h-3" strokeWidth={2} />
											</Button>
										)}
									</form>
								</div>
								{repLoading ? (
									<PageLoader />
								) : representation &&
									typeof (representation as { representation?: unknown }).representation ===
										"string" ? (
									<MarkdownRenderer
										content={(representation as { representation: string }).representation}
										workspaceId={workspaceId}
									/>
								) : (
									<JsonViewer data={representation} maxHeight="320px" />
								)}
							</motion.div>
						</div>

						{/* Context — full width */}
						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="rounded-xl p-5 theme-card"
						>
							<SectionHeading>Peer Context</SectionHeading>
							{contextLoading ? (
								<PageLoader />
							) : typeof context === "string" ? (
								<Body className="whitespace-pre-wrap">{context}</Body>
							) : (
								<JsonViewer data={context} />
							)}
						</motion.div>

						{/* Metadata — global toggle */}
						<AnimatePresence>
							{showMetadata && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.2 }}
									className="overflow-hidden"
								>
									<div
										className="rounded-xl p-5"
										style={{
											background: "rgba(245,158,11,0.04)",
											border: "1px solid rgba(245,158,11,0.2)",
										}}
									>
										<SectionHeading style={{ color: COLOR.warning }}>Metadata</SectionHeading>
										<JsonViewer data={peer.metadata} maxHeight="300px" />
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</>
				)}
			</div>
		</div>
	);
}

function PeerDetailSkeleton() {
	return (
		<div className="space-y-4" aria-hidden="true">
			<div className="rounded-xl p-5 theme-card">
				<Skeleton className="h-4 w-36 rounded" />
				<div className="mt-4 flex gap-2">
					<Skeleton className="h-10 flex-1 rounded-lg" />
					<Skeleton accent className="h-10 w-24 rounded-lg" />
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{Array.from({ length: 2 }).map((_, index) => (
					<div key={index} className="rounded-xl p-5 theme-card">
						<div className="flex items-center justify-between mb-4">
							<Skeleton className="h-4 w-28 rounded" />
							<Skeleton className="h-8 w-16 rounded-lg" />
						</div>
						<Skeleton className="h-3 w-full rounded" />
						<Skeleton className="mt-2 h-3 w-[92%] rounded" />
						<Skeleton className="mt-2 h-3 w-[68%] rounded" />
						<Skeleton className="mt-4 h-24 w-full rounded-lg" />
					</div>
				))}
			</div>

			<div className="rounded-xl p-5 theme-card">
				<Skeleton className="h-4 w-24 rounded" />
				<Skeleton className="mt-4 h-3 w-full rounded" />
				<Skeleton className="mt-2 h-3 w-[95%] rounded" />
				<Skeleton className="mt-2 h-3 w-[76%] rounded" />
			</div>

			<div className="rounded-xl theme-card overflow-hidden">
				<div className="px-5 py-4">
					<Skeleton className="h-4 w-20 rounded" />
				</div>
			</div>
		</div>
	);
}
