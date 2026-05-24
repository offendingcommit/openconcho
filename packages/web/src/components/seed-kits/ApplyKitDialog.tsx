import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useScopedPeerCard, useScopedPeers } from "@/api/compareQueries";
import { createScopedClient } from "@/api/scopedClient";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Body, Caption, Muted } from "@/components/ui/typography";
import { useInstances } from "@/hooks/useInstances";
import type { Instance } from "@/lib/config";
import { mergeCardLines, type SeedKit } from "@/lib/seedKits";

interface ApplyKitDialogProps {
	kit: SeedKit | null;
	open: boolean;
	onClose: () => void;
}

function err(e: unknown): never {
	throw new Error(typeof e === "object" ? JSON.stringify(e) : String(e));
}

function useScopedWorkspacesAll(instance: Instance | null) {
	return useQuery({
		queryKey: ["seed-kits-workspaces", instance?.id ?? "none"],
		queryFn: async () => {
			if (!instance) return [] as Array<{ id: string }>;
			const client = createScopedClient(instance);
			const { data, error } = await client.POST("/v3/workspaces/list", {
				params: { query: { page: 1, page_size: 100 } },
				body: {},
			});
			const payload = data ?? err(error);
			return ((payload as { items?: Array<{ id: string }> }).items ?? []) as Array<{ id: string }>;
		},
		enabled: Boolean(instance),
	});
}

export function ApplyKitDialog({ kit, open, onClose }: ApplyKitDialogProps) {
	const { instances, activeId } = useInstances();
	const [instanceId, setInstanceId] = useState<string | null>(activeId);
	const [workspaceId, setWorkspaceId] = useState<string | null>(null);
	const [peerId, setPeerId] = useState<string | null>(null);
	const [submitState, setSubmitState] = useState<
		{ kind: "idle" } | { kind: "pending" } | { kind: "ok" } | { kind: "error"; message: string }
	>({ kind: "idle" });

	useEffect(() => {
		if (open) {
			setInstanceId(activeId);
			setWorkspaceId(null);
			setPeerId(null);
			setSubmitState({ kind: "idle" });
		}
	}, [open, activeId]);

	const instance = instances.find((i) => i.id === instanceId) ?? null;

	const workspaces = useScopedWorkspacesAll(instance);
	const peers = useScopedPeers(instance as Instance, workspaceId ?? "", 1, 100);
	const existingCard = useScopedPeerCard(instance as Instance, workspaceId ?? "", peerId ?? "");

	const peerItems = (peers.data as { items?: Array<{ id: string }> } | undefined)?.items ?? [];

	const existingLines = useMemo(() => {
		const card = existingCard.data as { peer_card?: unknown } | undefined;
		if (Array.isArray(card?.peer_card)) return card.peer_card as string[];
		if (typeof card === "string") return [card];
		return [] as string[];
	}, [existingCard.data]);

	const mergedLines = useMemo(
		() => (kit ? mergeCardLines(existingLines, kit.lines) : existingLines),
		[kit, existingLines],
	);

	const canApply =
		kit !== null &&
		instance !== null &&
		Boolean(workspaceId) &&
		Boolean(peerId) &&
		submitState.kind !== "pending";

	async function handleApply() {
		if (!kit || !instance || !workspaceId || !peerId) return;
		setSubmitState({ kind: "pending" });
		try {
			const client = createScopedClient(instance);
			const { error } = await client.PUT("/v3/workspaces/{workspace_id}/peers/{peer_id}/card", {
				params: { path: { workspace_id: workspaceId, peer_id: peerId } },
				body: { peer_card: mergedLines },
			});
			if (error) {
				setSubmitState({
					kind: "error",
					message: typeof error === "object" ? JSON.stringify(error) : String(error),
				});
				return;
			}
			setSubmitState({ kind: "ok" });
			await existingCard.refetch();
			setTimeout(onClose, 700);
		} catch (e) {
			setSubmitState({
				kind: "error",
				message: e instanceof Error ? e.message : String(e),
			});
		}
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles
							className="w-4 h-4"
							style={{ color: "var(--accent-text)" }}
							strokeWidth={1.8}
						/>
						Apply seed kit
					</DialogTitle>
					<DialogDescription>
						{kit ? (
							<>
								Apply <span className="font-medium">{kit.name}</span> to a peer's card. Existing
								lines with a matching prefix are replaced; everything else is appended.
							</>
						) : (
							"Pick a kit to apply."
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<PickerRow label="Instance">
						<select
							value={instanceId ?? ""}
							onChange={(e) => {
								setInstanceId(e.target.value || null);
								setWorkspaceId(null);
								setPeerId(null);
							}}
							className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
							style={{
								background: "var(--surface)",
								color: "var(--text-1)",
								border: "1px solid var(--border-2)",
							}}
						>
							<option value="">— pick an instance —</option>
							{instances.map((i) => (
								<option key={i.id} value={i.id}>
									{i.name}
								</option>
							))}
						</select>
					</PickerRow>

					<PickerRow label="Workspace">
						<select
							value={workspaceId ?? ""}
							onChange={(e) => {
								setWorkspaceId(e.target.value || null);
								setPeerId(null);
							}}
							disabled={!instance || workspaces.isLoading}
							className="flex-1 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
							style={{
								background: "var(--surface)",
								color: "var(--text-1)",
								border: "1px solid var(--border-2)",
							}}
						>
							<option value="">{workspaces.isLoading ? "loading…" : "— pick a workspace —"}</option>
							{(workspaces.data ?? []).map((w) => (
								<option key={w.id} value={w.id}>
									{w.id}
								</option>
							))}
						</select>
					</PickerRow>

					<PickerRow label="Peer">
						<select
							value={peerId ?? ""}
							onChange={(e) => setPeerId(e.target.value || null)}
							disabled={!workspaceId || peers.isLoading}
							className="flex-1 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
							style={{
								background: "var(--surface)",
								color: "var(--text-1)",
								border: "1px solid var(--border-2)",
							}}
						>
							<option value="">{peers.isLoading ? "loading…" : "— pick a peer —"}</option>
							{peerItems.map((p) => (
								<option key={p.id} value={p.id}>
									{p.id}
								</option>
							))}
						</select>
					</PickerRow>
				</div>

				{kit && peerId && (
					<div className="mt-4 space-y-3">
						<MergePreview
							existing={existingLines}
							merged={mergedLines}
							loading={existingCard.isLoading}
						/>
					</div>
				)}

				{submitState.kind === "error" && (
					<p className="text-xs mt-3" style={{ color: "#f87171" }}>
						{submitState.message}
					</p>
				)}

				<div className="flex justify-end gap-2 pt-4 mt-4">
					<Button type="button" variant="surface" onClick={onClose}>
						<X className="w-3.5 h-3.5" strokeWidth={2} />
						Cancel
					</Button>
					<Button type="button" variant="accent" onClick={handleApply} disabled={!canApply}>
						{submitState.kind === "pending" ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
						) : submitState.kind === "ok" ? (
							<Check className="w-3.5 h-3.5" strokeWidth={2} />
						) : (
							<Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
						)}
						{submitState.kind === "ok" ? "Applied" : "Apply kit"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function PickerRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: select element is provided via `children`
		<label className="flex items-center gap-3">
			<span className="text-xs font-medium w-20 shrink-0" style={{ color: "var(--text-3)" }}>
				{label}
			</span>
			{children}
		</label>
	);
}

interface MergePreviewProps {
	existing: string[];
	merged: string[];
	loading: boolean;
}

function MergePreview({ existing, merged, loading }: MergePreviewProps) {
	const existingSet = useMemo(() => new Set(existing), [existing]);

	if (loading) {
		return <Muted className="text-xs">Loading existing card…</Muted>;
	}

	if (merged.length === 0) {
		return <Muted className="text-xs">Nothing to apply.</Muted>;
	}

	return (
		<div>
			<Caption className="block mb-1.5">Preview after apply</Caption>
			<div
				className="rounded-lg p-3 font-mono text-xs space-y-0.5 max-h-64 overflow-y-auto"
				style={{
					background: "var(--surface)",
					border: "1px solid var(--border-2)",
				}}
			>
				{merged.map((line, i) => {
					const isNew = !existingSet.has(line);
					return (
						<div
							key={`${i}-${line}`}
							style={{
								color: isNew ? "var(--accent-text)" : "var(--text-2)",
								fontWeight: isNew ? 500 : 400,
							}}
						>
							{isNew ? "+ " : "  "}
							{line || <span style={{ color: "var(--text-4)" }}>(empty)</span>}
						</div>
					);
				})}
			</div>
			<Body className="text-xs mt-1.5" style={{ color: "var(--text-3)" }}>
				<span style={{ color: "var(--accent-text)" }}>+ </span>
				new or replaced • {merged.length} total line{merged.length === 1 ? "" : "s"}
			</Body>
		</div>
	);
}
