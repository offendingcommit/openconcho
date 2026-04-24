import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Webhook, Trash2, Plus, ArrowLeft, Zap, ExternalLink } from "lucide-react";
import { useWebhooks, useCreateWebhook, useDeleteWebhook, useTestWebhook } from "@/api/queries";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle, SectionHeading, Body, Muted } from "@/components/ui/typography";
import { COLOR } from "@/lib/constants";

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
						<PageTitle>Webhooks</PageTitle>
					</div>
					<Button
						variant="accent"
						size="sm"
						onClick={handleTest}
						disabled={testWebhook.isPending}
					>
						<Zap className="w-3.5 h-3.5" strokeWidth={2} />
						{testWebhook.isPending ? "Firing..." : "Test emit"}
					</Button>
				</div>
				<Body className="leading-none">Event webhook endpoints for this workspace</Body>
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
					<SectionHeading>
						<Plus className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={2} />
						Add endpoint
					</SectionHeading>
					<form onSubmit={handleCreate} className="flex gap-2">
						<div className="flex-1">
							<Input
								value={url}
								onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
								placeholder="https://your-server.com/webhook"
							/>
							{urlError && (
								<p className="text-xs mt-1" style={{ color: COLOR.destructive }}>{urlError}</p>
							)}
						</div>
						<Button
							type="submit"
							variant="accent"
							disabled={createWebhook.isPending}
						>
							{createWebhook.isPending ? "Adding..." : "Add"}
						</Button>
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
								background: COLOR.successDim,
								border: `1px solid ${COLOR.successBorder}`,
								color: COLOR.success,
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
								<Muted>No webhook endpoints yet.</Muted>
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
										<Button
											variant="ghost"
											size="icon"
											onClick={() => setDeleteTarget((wh as { id: string }).id)}
											aria-label="Delete webhook"
										>
											<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
										</Button>
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
