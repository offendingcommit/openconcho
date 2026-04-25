import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useSessionMessages, useSessionSummaries, useSessionContext } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Pagination } from "@/components/shared/Pagination";
import { Badge } from "@/components/shared/Badge";
import { JsonViewer } from "@/components/shared/JsonViewer";
import type { components } from "@/api/schema.d.ts";

type Message = components["schemas"]["Message"];
type Tab = "messages" | "summaries" | "context";

export function SessionDetail() {
	const { workspaceId, sessionId } = useParams({ strict: false }) as {
		workspaceId: string;
		sessionId: string;
	};
	const [tab, setTab] = useState<Tab>("messages");
	const [page, setPage] = useState(1);

	const { data: msgData, isLoading: msgsLoading } = useSessionMessages(workspaceId, sessionId, page);
	const { data: summaries, isLoading: summariesLoading } = useSessionSummaries(workspaceId, sessionId);
	const { data: context, isLoading: contextLoading } = useSessionContext(workspaceId, sessionId);

	const messages: Message[] = (msgData as { items?: Message[] } | undefined)?.items ?? [];
	const totalPages = (msgData as { pages?: number } | undefined)?.pages ?? 1;

	const tabs: Array<{ id: Tab; label: string }> = [
		{ id: "messages", label: "Messages" },
		{ id: "summaries", label: "Summaries" },
		{ id: "context", label: "Context" },
	];

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

				<div className="flex items-center gap-2 mb-1">
					<MessageSquare className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<h1
						className="text-xl font-semibold font-mono break-all tracking-tight"
						style={{ color: "var(--text-1)" }}
					>
						{sessionId}
					</h1>
				</div>
				<p className="text-sm" style={{ color: "var(--text-2)" }}>Session detail</p>
			</motion.div>

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
											<div
												key={msg.id}
												className="pb-4"
												style={{ borderBottom: "1px solid var(--border)" }}
											>
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
												<p
													className="text-sm whitespace-pre-wrap leading-relaxed"
													style={{ color: "var(--text-2)" }}
												>
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
				</motion.div>
			</div>
		</div>
	);
}
