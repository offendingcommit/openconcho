import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { usePeers } from "@/api/queries";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Caption } from "@/components/ui/typography";
import { COLOR } from "@/lib/constants";
import { toast } from "@/lib/toast";

const PEER_PAGE_SIZE = 100;

const schema = z.object({
	observer: z.string().min(1, { message: "Observer peer ID is required" }),
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

export function ScheduleDreamModal({ open, workspaceId, onClose, mutation }: Props) {
	const { data: peerPage } = usePeers(workspaceId, 1, PEER_PAGE_SIZE);
	const peers = (peerPage as { items?: Array<{ id: string }> } | undefined)?.items ?? [];

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
		const result = schema.safeParse({
			observer,
			observed: observed || undefined,
			session_id: sessionId || undefined,
		});
		if (!result.success) {
			setValidationError(result.error.issues[0].message);
			return;
		}
		// Default observed → observer for self-representation dreams.
		const observedId = result.data.observed ?? result.data.observer;
		await mutation.mutateAsync({
			observer: result.data.observer,
			observed: observedId,
			dream_type: "omni",
			session_id: result.data.session_id ?? null,
		});
		toast(`Dream queued for ${result.data.observer}`, { kind: "success" });
		reset();
		onClose();
	};

	return (
		<FormModal
			open={open}
			title="Dream now"
			onClose={() => {
				reset();
				onClose();
			}}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<Label className="mb-1.5">
						Observer peer <span style={{ color: COLOR.destructive }}>*</span>
					</Label>
					<PeerPicker
						value={observer}
						onChange={(v) => {
							setObserver(v);
							setValidationError("");
						}}
						peers={peers}
						placeholder="peer_id"
					/>
				</div>
				<div>
					<Label className="mb-1.5">
						Observed peer <Caption as="span"> (optional, defaults to observer)</Caption>
					</Label>
					<PeerPicker
						value={observed}
						onChange={setObserved}
						peers={peers}
						placeholder={observer ? observer : "peer_id"}
					/>
				</div>
				<div>
					<Label className="mb-1.5">
						Session ID <Caption as="span"> (optional)</Caption>
					</Label>
					<Input
						value={sessionId}
						onChange={(e) => setSessionId(e.target.value)}
						placeholder="session_id"
					/>
				</div>
				{validationError && (
					<Caption as="p" style={{ color: COLOR.destructive }}>
						{validationError}
					</Caption>
				)}
				{mutation.error && (
					<Caption as="p" style={{ color: COLOR.destructive }}>
						{mutation.error.message}
					</Caption>
				)}
				<div className="flex justify-end gap-2 pt-2">
					<Button
						type="button"
						variant="surface"
						size="sm"
						onClick={() => {
							reset();
							onClose();
						}}
					>
						Cancel
					</Button>
					<Button type="submit" variant="accent" size="sm" disabled={mutation.isPending}>
						{mutation.isPending ? "Scheduling..." : "Dream now"}
					</Button>
				</div>
			</form>
		</FormModal>
	);
}

interface PeerPickerProps {
	value: string;
	onChange: (value: string) => void;
	peers: Array<{ id: string }>;
	placeholder?: string;
}

function PeerPicker({ value, onChange, peers, placeholder }: PeerPickerProps) {
	const hasPeers = peers.length > 0;
	const listId = useRandomId("peer-list");
	return (
		<>
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				list={hasPeers ? listId : undefined}
				className="font-mono"
				autoComplete="off"
			/>
			{hasPeers && (
				<datalist id={listId}>
					{peers.map((p) => (
						<option key={p.id} value={p.id} />
					))}
				</datalist>
			)}
		</>
	);
}

function useRandomId(prefix: string): string {
	const [id] = useState(() => `${prefix}-${Math.random().toString(36).slice(2, 10)}`);
	return id;
}
