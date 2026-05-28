import { useNavigate, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
	Eye,
	EyeOff,
	FlaskConical,
	MessageCircle,
	Save,
	Search,
	User,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import {
	usePeer,
	usePeerCard,
	usePeerContext,
	usePeerRepresentation,
	useSearchPeer,
	useSetPeerCard,
} from "@/api/queries";
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
				<Breadcrumb />

				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<User className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
							<PageTitle className="font-mono break-all">{mask(peerId)}</PageTitle>
							{observeMe !== undefined && (
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
