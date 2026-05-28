import { useEffect, useState } from "react";
import type { components } from "@/api/schema.d.ts";

type QueueStatus = components["schemas"]["QueueStatus"];

export const STALE_QUEUE_THRESHOLD_MS = 30 * 60 * 1000;

export interface StaleQueueState {
	stalledSince: number | null;
	elapsedMs: number;
	isStale: boolean;
}

/**
 * Detects stalled queue work without per-work-unit timestamps from the API.
 *
 * Anchors when in_progress + pending first goes non-zero and resets the anchor
 * whenever completed_work_units advances (forward progress). If the anchor
 * lives longer than the threshold, the queue is considered stale.
 *
 * Note: completed_work_units resets on Honcho's periodic queue cleanup; a drop
 * is treated as "no forward progress" rather than regression, so the stall
 * clock keeps running until either work finishes or completed advances.
 */
export function useStaleQueueDetection(
	data: QueueStatus | undefined,
	staleThresholdMs: number = STALE_QUEUE_THRESHOLD_MS,
): StaleQueueState {
	const [stalledSince, setStalledSince] = useState<number | null>(null);
	const [lastCompleted, setLastCompleted] = useState(0);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 10_000);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		if (!data) return;
		const active = (data.in_progress_work_units ?? 0) + (data.pending_work_units ?? 0);
		const completed = data.completed_work_units ?? 0;
		if (active === 0) {
			setStalledSince(null);
			setLastCompleted(completed);
			return;
		}
		if (completed > lastCompleted) {
			setStalledSince(Date.now());
			setLastCompleted(completed);
			return;
		}
		if (stalledSince === null) {
			setStalledSince(Date.now());
			setLastCompleted(completed);
		}
	}, [data, lastCompleted, stalledSince]);

	const elapsedMs = stalledSince !== null ? Math.max(0, now - stalledSince) : 0;
	const isStale = stalledSince !== null && elapsedMs > staleThresholdMs;
	return { stalledSince, elapsedMs, isStale };
}
