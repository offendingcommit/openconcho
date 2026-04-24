import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Webhook, Trash2, Plus, ArrowLeft, Zap, ExternalLink } from "lucide-react";
import { useWebhooks, useCreateWebhook, useDeleteWebhook, useTestWebhook } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

const urlSchema = z.string().url("Must be a valid URL");

interface Props {
	workspaceId: string;
}

export function WebhookManager({ workspaceId }: Props) {
	const { data: webhooks, isLoading, error } = useWebhooks(workspaceId);
	const createWebhook = useCreateWebhook(workspaceId);
	const deleteWebhook = useDeleteWebhook(workspaceId);
	const testWebhook = useTestWebhook(workspaceId);

	const [url, setUrl] = useState("");
	const [urlError, setUrlError] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
	const [testResult, setTestResult] = useState<string | null>(null);

	const handleCreate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const result = urlSchema.safeParse(url);
		if (!result.success) {
			setUrlError(result.error.errors[0].message);
			return;
		}
		await createWebhook.mutateAsync(url);
		setUrl("");
		setUrlError("");
	};

	const handleTest = async () => {
		const data = await testWebhook.mutateAsync();
		setTestResult(JSON.stringify(data, null, 2));
		setTimeout(() => setTestResult(null), 5000);
	};

	const list = Array.isArray(webhooks) ? webhooks : [];

	return (
		<div className="page-container">
			<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
				<Link
					to="/workspaces/$workspaceId"
					params={{ workspaceId } as never}
					className="inline-flex items-center gap-1.5 text-xs mb-4 transition-colors"
					style={{ color: "var(--text-3)" }}
				>
					<ArrowLeft className="w-3 h-3" strokeWidth={1.5} />
					{workspaceId}
				</Link>
				<div className="flex items-center justify-between mb-1">
					<div className="flex items-center gap-2">
						<Webhook className="w-5 h-5" style={{ color: "var(--accent)" }} strokeWidth={1.5} />
						<h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-1)" }}>
							Webhooks
						</h1>
					</div>
					<button
						onClick={handleTest}
						disabled={testWebhook.isPending}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
						style={{
							background: "var(--accent-dim)",
							border: "1px solid var(--accent-border)",
							color: "var(--accent-text)",
						}}
					>
						<Zap className="w-3.5 h-3.5" strokeWidth={2} />
						{testWebhook.isPending ? "Firing..." : "Test emit"}
					</button>
				</div>
				<p className="text-sm" style={{ color: "var(--text-2)" }}>
					Event webhook endpoints for this workspace
				</p>
			</motion.div>

			<div className="mt-8 space-y-4">
				<ErrorAlert error={error instanceof Error ? error : null} />
				{isLoading && <PageLoader />}

				{/* Add webhook form */}
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					className="rounded-xl p-5 theme-card"
				>
					<h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-1)" }}>
						<Plus className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={2} />
						Add endpoint
					</h2>
					<form onSubmit={handleCreate} className="flex gap-2">
						<div className="flex-1">
							<input
								value={url}
								onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
								placeholder="https://your-server.com/webhook"
								className="theme-input w-full text-sm px-3 py-2 rounded-lg"
							/>
							{urlError && (
								<p className="text-xs mt-1" style={{ color: "#f87171" }}>{urlError}</p>
							)}
						</div>
						<button
							type="submit"
							disabled={createWebhook.isPending}
							className="px-3 py-2 text-sm rounded-lg font-medium disabled:opacity-50"
							style={{
								background: "var(--accent-dim)",
								border: "1px solid var(--accent-border)",
								color: "var(--accent-text)",
							}}
						>
							{createWebhook.isPending ? "Adding..." : "Add"}
						</button>
					</form>
				</motion.div>

				{/* Test result */}
				<AnimatePresence>
					{testResult && (
						<motion.div
							initial={{ opacity: 0, y: -4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							className="rounded-xl p-4 text-xs font-mono overflow-auto"
							style={{
								background: "rgba(52,211,153,0.06)",
								border: "1px solid rgba(52,211,153,0.2)",
								color: "#34d399",
							}}
						>
							{testResult}
						</motion.div>
					)}
				</AnimatePresence>

				{/* Webhook list */}
				{!isLoading && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="rounded-xl theme-card overflow-hidden"
					>
						{list.length === 0 ? (
							<div className="p-8 text-center">
								<Webhook
									className="w-8 h-8 mx-auto mb-2 opacity-20"
									style={{ color: "var(--text-3)" }}
									strokeWidth={1.5}
								/>
								<p className="text-sm" style={{ color: "var(--text-3)" }}>
									No webhook endpoints yet.
								</p>
							</div>
						) : (
							<div className="divide-y" style={{ borderColor: "var(--border)" }}>
								{list.map((wh, i) => (
									<motion.div
										key={(wh as { id: string }).id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: i * 0.04 }}
										className="flex items-center justify-between px-5 py-3 gap-4"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5">
												<span
													className="text-xs font-mono truncate"
													style={{ color: "var(--accent-text)" }}
												>
													{(wh as { url: string }).url}
												</span>
												<a
													href={(wh as { url: string }).url}
													target="_blank"
													rel="noreferrer"
													className="flex-shrink-0"
													style={{ color: "var(--text-4)" }}
												>
													<ExternalLink className="w-3 h-3" strokeWidth={1.5} />
												</a>
											</div>
											<span
												className="text-xs font-mono"
												style={{ color: "var(--text-4)" }}
											>
												{(wh as { id: string }).id}
											</span>
										</div>
										<button
											onClick={() => setDeleteTarget((wh as { id: string }).id)}
											className="p-1.5 rounded-lg transition-colors flex-shrink-0"
											style={{ color: "var(--text-4)" }}
										>
											<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
										</button>
									</motion.div>
								))}
							</div>
						)}
					</motion.div>
				)}
			</div>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title="Delete webhook"
				description="This endpoint will stop receiving events immediately."
				confirmLabel="Delete"
				onConfirm={async () => {
					if (deleteTarget) await deleteWebhook.mutateAsync(deleteTarget);
					setDeleteTarget(null);
				}}
				onCancel={() => setDeleteTarget(null)}
				loading={deleteWebhook.isPending}
			/>
		</div>
	);
}
