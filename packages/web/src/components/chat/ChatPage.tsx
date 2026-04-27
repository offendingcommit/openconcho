import { Link, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@/api/queries";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/typography";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
}

export function ChatPage() {
	const { workspaceId, peerId } = useParams({ strict: false }) as {
		workspaceId: string;
		peerId: string;
	};
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const bottomRef = useRef<HTMLDivElement>(null);
	const chatMutation = useChat(workspaceId, peerId);

	useEffect(() => {
		if (messages.length > 0) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	async function handleSend() {
		const trimmed = input.trim();
		if (!trimmed || chatMutation.isPending) return;

		setInput("");
		setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);

		try {
			const result = await chatMutation.mutateAsync(trimmed);
			const responseText =
				(result as { content?: string | null }).content ??
				(typeof result === "string" ? result : JSON.stringify(result));
			setMessages((prev) => [
				...prev,
				{ id: crypto.randomUUID(), role: "assistant", content: responseText },
			]);
		} catch (err) {
			setMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: "assistant",
					content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
				},
			]);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	return (
		<div className="flex flex-col h-screen" style={{ background: "var(--bg)" }}>
			{/* Header */}
			<div
				className="shrink-0 px-6 py-4"
				style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}
			>
				<div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--text-3)" }}>
					<Link
						to="/workspaces/$workspaceId/peers/$peerId"
						params={{ workspaceId, peerId } as never}
						className="hover:underline font-mono"
					>
						{peerId}
					</Link>
					<span>/</span>
					<span>Chat</span>
				</div>
				<div className="flex items-center gap-2">
					<Brain className="w-4 h-4" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
					<SectionHeading as="h1" className="mb-0">
						Memory-augmented chat
					</SectionHeading>
				</div>
				<p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
					Honcho responds using accumulated context for <span className="font-mono">{peerId}</span>
				</p>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-auto px-4 sm:px-6 py-4 space-y-4">
				<AnimatePresence initial={false}>
					{messages.length === 0 && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="flex items-center justify-center h-full"
						>
							<div className="text-center">
								<div
									className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
									style={{
										background: "var(--accent-dim)",
										border: "1px solid var(--accent-border)",
									}}
								>
									<Brain className="w-6 h-6" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
								</div>
								<p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
									Start a conversation
								</p>
								<p className="text-xs mt-1 max-w-xs" style={{ color: "var(--text-3)" }}>
									Honcho will respond using accumulated memory context for this peer
								</p>
							</div>
						</motion.div>
					)}

					{messages.map((msg) => (
						<motion.div
							key={msg.id}
							initial={{ opacity: 0, y: 8, scale: 0.97 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							transition={{ type: "spring", stiffness: 300, damping: 25 }}
							className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
						>
							<div
								className="max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm"
								style={
									msg.role === "user"
										? { background: "var(--accent)", color: "#fff" }
										: {
												background: "var(--bg-2)",
												border: "1px solid var(--border)",
												color: "var(--text-2)",
											}
								}
							>
								<p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
							</div>
						</motion.div>
					))}
				</AnimatePresence>

				{chatMutation.isPending && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex justify-start"
					>
						<div
							className="rounded-2xl px-4 py-3 flex items-center gap-2"
							style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
						>
							<LoadingSpinner size="sm" />
							<span className="text-xs" style={{ color: "var(--text-3)" }}>
								Honcho is thinking...
							</span>
						</div>
					</motion.div>
				)}

				<div ref={bottomRef} />
			</div>

			{/* Input */}
			<div
				className="shrink-0 px-4 sm:px-6 py-4"
				style={{ borderTop: "1px solid var(--border)", background: "var(--bg-2)" }}
			>
				<div className="flex gap-3 max-w-3xl mx-auto">
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Message this peer... (Enter to send, Shift+Enter for newline)"
						rows={2}
						className="flex-1 resize-none"
					/>
					<Button
						variant="primary"
						onClick={handleSend}
						disabled={!input.trim() || chatMutation.isPending}
						className="self-end mb-0.5"
					>
						<Send className="w-4 h-4" strokeWidth={1.5} />
						<span className="hidden sm:block">Send</span>
					</Button>
				</div>
			</div>
		</div>
	);
}
