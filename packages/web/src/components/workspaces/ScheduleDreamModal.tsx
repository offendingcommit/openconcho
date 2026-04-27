import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { FormModal } from "@/components/shared/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Caption } from "@/components/ui/typography";
import { COLOR } from "@/lib/constants";

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
		const result = schema.safeParse({
			observer,
			observed: observed || undefined,
			session_id: sessionId || undefined,
		});
		if (!result.success) {
			setValidationError(result.error.issues[0].message);
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
		<FormModal
			open={open}
			title="Schedule Dream"
			onClose={() => {
				reset();
				onClose();
			}}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<Label className="mb-1.5">
						Observer peer ID <span style={{ color: COLOR.destructive }}>*</span>
					</Label>
					<Input
						value={observer}
						onChange={(e) => {
							setObserver(e.target.value);
							setValidationError("");
						}}
						placeholder="peer_id"
					/>
				</div>
				<div>
					<Label className="mb-1.5">
						Observed peer ID <Caption as="span"> (optional, defaults to observer)</Caption>
					</Label>
					<Input
						value={observed}
						onChange={(e) => setObserved(e.target.value)}
						placeholder="peer_id"
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
						{mutation.isPending ? "Scheduling..." : "Schedule"}
					</Button>
				</div>
			</form>
		</FormModal>
	);
}
