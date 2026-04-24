import { useState } from "react";
import { z } from "zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { FormModal } from "@/components/shared/FormModal";

const schema = z.object({
	observer: z.string().min(1, "Observer peer ID is required"),
	observed: z.string().optional(),
	session_id: z.string().optional(),
});

interface Props {
	open: boolean;
	workspaceId: string;
	onClose: () => void;
	mutation: UseMutationResult<
		void,
		Error,
		{ observer: string; observed?: string | null; dream_type: "omni"; session_id?: string | null }
	>;
}

export function ScheduleDreamModal({ open, onClose, mutation }: Props) {
	const [observer, setObserver] = useState("");
	const [observed, setObserved] = useState("");
	const [sessionId, setSessionId] = useState("");
	const [validationError, setValidationError] = useState("");

	const reset = () => {
		setObserver("");
		setObserved("");
		setSessionId("");
		setValidationError("");
	};

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		const result = schema.safeParse({ observer, observed: observed || undefined, session_id: sessionId || undefined });
		if (!result.success) {
			setValidationError(result.error.errors[0].message);
			return;
		}
		await mutation.mutateAsync({
			observer: result.data.observer,
			observed: result.data.observed ?? null,
			dream_type: "omni",
			session_id: result.data.session_id ?? null,
		});
		reset();
		onClose();
	};

	return (
		<FormModal open={open} title="Schedule Dream" onClose={() => { reset(); onClose(); }}>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
						Observer peer ID <span style={{ color: "#f87171" }}>*</span>
					</label>
					<input
						value={observer}
						onChange={(e) => { setObserver(e.target.value); setValidationError(""); }}
						placeholder="peer_id"
						className="theme-input w-full text-sm px-3 py-2 rounded-lg"
					/>
				</div>
				<div>
					<label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
						Observed peer ID <span style={{ color: "var(--text-4)" }}>(optional, defaults to observer)</span>
					</label>
					<input
						value={observed}
						onChange={(e) => setObserved(e.target.value)}
						placeholder="peer_id"
						className="theme-input w-full text-sm px-3 py-2 rounded-lg"
					/>
				</div>
				<div>
					<label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
						Session ID <span style={{ color: "var(--text-4)" }}>(optional)</span>
					</label>
					<input
						value={sessionId}
						onChange={(e) => setSessionId(e.target.value)}
						placeholder="session_id"
						className="theme-input w-full text-sm px-3 py-2 rounded-lg"
					/>
				</div>
				{validationError && (
					<p className="text-xs" style={{ color: "#f87171" }}>{validationError}</p>
				)}
				{mutation.error && (
					<p className="text-xs" style={{ color: "#f87171" }}>{mutation.error.message}</p>
				)}
				<div className="flex justify-end gap-2 pt-2">
					<button
						type="button"
						onClick={() => { reset(); onClose(); }}
						className="px-3 py-1.5 text-sm rounded-lg"
						style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={mutation.isPending}
						className="px-3 py-1.5 text-sm rounded-lg font-medium disabled:opacity-50"
						style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-border)", color: "var(--accent-text)" }}
					>
						{mutation.isPending ? "Scheduling..." : "Schedule"}
					</button>
				</div>
			</form>
		</FormModal>
	);
}
