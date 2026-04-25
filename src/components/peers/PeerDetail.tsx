import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { User, MessageCircle } from "lucide-react";
import { usePeer, usePeerCard, usePeerContext, usePeerRepresentation } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { JsonViewer } from "@/components/shared/JsonViewer";

type Tab = "context" | "card" | "representation" | "metadata";

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
	const { data: representation, isLoading: repLoading } = usePeerRepresentation(workspaceId, peerId);

	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: "context", label: "Context" },
		{ id: "card", label: "Card" },
		{ id: "representation", label: "Representation" },
		{ id: "metadata", label: "Metadata" },
	];

	return (
		<div className="page-container">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--text-3)" }}>
					<Link to="/workspaces" className="hover:underline">Workspaces</Link>
					<span>/</span>
					<Link to="/workspaces/$workspaceId" params={{ workspaceId } as never} className="hover:underline font-mono">
						{workspaceId}
					</Link>
					<span>/</span>
					<Link to="/workspaces/$workspaceId/peers" params={{ workspaceId } as never} className="hover:underline">
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
						<p className="text-sm" style={{ color: "var(--text-2)" }}>Peer identity &amp; memory</p>
					</div>
					<button
						onClick={() =>
							navigate({
								to: "/workspaces/$workspaceId/peers/$peerId/chat",
								params: { workspaceId, peerId } as never,
							})
						}
						className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
						style={{
							background: "var(--accent)",
							color: "#fff",
						}}
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

						{/* Tab content */}
						<motion.div
							key={tab}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2 }}
							className="rounded-xl p-5 theme-card"
						>
							{tab === "context" && (
								contextLoading ? <PageLoader /> : (
									<>
										<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>Peer Context</h2>
										{typeof context === "string" ? (
											<p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-2)" }}>{context}</p>
										) : (
											<JsonViewer data={context} />
										)}
									</>
								)
							)}
							{tab === "card" && (
								cardLoading ? <PageLoader /> : (
									<>
										<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>Peer Card</h2>
										{typeof card === "string" ? (
											<p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>{card}</p>
										) : (
											<JsonViewer data={card} maxHeight="400px" />
										)}
									</>
								)
							)}
							{tab === "representation" && (
								repLoading ? <PageLoader /> : (
									<>
										<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>Memory Representation</h2>
										{representation && typeof (representation as { representation?: unknown }).representation === "string" ? (
											<p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-2)" }}>
												{(representation as { representation: string }).representation}
											</p>
										) : (
											<JsonViewer data={representation} maxHeight="400px" />
										)}
									</>
								)
							)}
							{tab === "metadata" && (
								<>
									<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>Peer Metadata</h2>
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
