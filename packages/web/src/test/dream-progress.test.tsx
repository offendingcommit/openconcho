import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	pickQueueRefetchInterval,
	QUEUE_REFETCH_ACTIVE_MS,
	QUEUE_REFETCH_IDLE_MS,
} from "@/api/queries";
import type { components } from "@/api/schema.d.ts";
import { STALE_QUEUE_THRESHOLD_MS, useStaleQueueDetection } from "@/hooks/useStaleQueueDetection";

type QueueStatus = components["schemas"]["QueueStatus"];

function buildStatus(partial: Partial<QueueStatus>): QueueStatus {
	return {
		total_work_units: 0,
		completed_work_units: 0,
		in_progress_work_units: 0,
		pending_work_units: 0,
		sessions: null,
		...partial,
	};
}

describe("pickQueueRefetchInterval", () => {
	it("backs off to idle interval when no data has loaded yet", () => {
		expect(pickQueueRefetchInterval(undefined)).toBe(QUEUE_REFETCH_IDLE_MS);
	});

	it("uses idle interval when no work is queued or in-flight", () => {
		const data = buildStatus({
			total_work_units: 5,
			completed_work_units: 5,
		});
		expect(pickQueueRefetchInterval(data)).toBe(QUEUE_REFETCH_IDLE_MS);
	});

	it("uses active interval when work is in progress", () => {
		const data = buildStatus({
			total_work_units: 5,
			completed_work_units: 2,
			in_progress_work_units: 1,
		});
		expect(pickQueueRefetchInterval(data)).toBe(QUEUE_REFETCH_ACTIVE_MS);
	});

	it("uses active interval when work is pending even without in-progress", () => {
		const data = buildStatus({
			total_work_units: 5,
			completed_work_units: 0,
			pending_work_units: 3,
		});
		expect(pickQueueRefetchInterval(data)).toBe(QUEUE_REFETCH_ACTIVE_MS);
	});

	it("active interval is faster than idle interval", () => {
		// Sanity check on the constants so a future tweak doesn't invert them.
		expect(QUEUE_REFETCH_ACTIVE_MS).toBeLessThan(QUEUE_REFETCH_IDLE_MS);
	});
});

describe("useStaleQueueDetection", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-05-24T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns no stall when there's no active work", () => {
		const { result } = renderHook(() =>
			useStaleQueueDetection(buildStatus({ total_work_units: 3, completed_work_units: 3 })),
		);
		expect(result.current.stalledSince).toBeNull();
		expect(result.current.isStale).toBe(false);
	});

	it("does not flag a freshly-started run as stale", () => {
		const { result } = renderHook(() =>
			useStaleQueueDetection(
				buildStatus({
					total_work_units: 5,
					completed_work_units: 0,
					in_progress_work_units: 2,
					pending_work_units: 3,
				}),
			),
		);
		expect(result.current.stalledSince).not.toBeNull();
		expect(result.current.isStale).toBe(false);
	});

	it("surfaces a warning after 30 minutes of in-progress work without forward progress", () => {
		const stuck = buildStatus({
			total_work_units: 5,
			completed_work_units: 0,
			in_progress_work_units: 2,
			pending_work_units: 3,
		});
		const { result } = renderHook(({ data }) => useStaleQueueDetection(data), {
			initialProps: { data: stuck },
		});

		expect(result.current.isStale).toBe(false);

		// Advance past the threshold; the hook's internal tick interval triggers
		// a re-render so the new elapsed time is reflected.
		act(() => {
			vi.advanceTimersByTime(STALE_QUEUE_THRESHOLD_MS + 30_000);
		});

		expect(result.current.isStale).toBe(true);
		expect(result.current.elapsedMs).toBeGreaterThan(STALE_QUEUE_THRESHOLD_MS);
	});

	it("clears the stall anchor when completed_work_units advances", () => {
		const stuck = buildStatus({
			total_work_units: 5,
			completed_work_units: 0,
			in_progress_work_units: 2,
			pending_work_units: 3,
		});
		const progressed = buildStatus({
			total_work_units: 5,
			completed_work_units: 2,
			in_progress_work_units: 1,
			pending_work_units: 2,
		});

		const { result, rerender } = renderHook(({ data }) => useStaleQueueDetection(data), {
			initialProps: { data: stuck },
		});

		act(() => {
			vi.advanceTimersByTime(STALE_QUEUE_THRESHOLD_MS + 60_000);
		});
		expect(result.current.isStale).toBe(true);

		// Forward progress arrives — the stall clock should reset.
		rerender({ data: progressed });
		act(() => {
			vi.advanceTimersByTime(0);
		});
		expect(result.current.isStale).toBe(false);
	});

	it("clears the stall anchor once all work finishes", () => {
		const stuck = buildStatus({
			total_work_units: 5,
			completed_work_units: 0,
			in_progress_work_units: 2,
			pending_work_units: 3,
		});
		const idle = buildStatus({
			total_work_units: 5,
			completed_work_units: 5,
		});

		const { result, rerender } = renderHook(({ data }) => useStaleQueueDetection(data), {
			initialProps: { data: stuck },
		});

		act(() => {
			vi.advanceTimersByTime(STALE_QUEUE_THRESHOLD_MS + 60_000);
		});
		expect(result.current.isStale).toBe(true);

		rerender({ data: idle });
		act(() => {
			vi.advanceTimersByTime(0);
		});
		expect(result.current.stalledSince).toBeNull();
		expect(result.current.isStale).toBe(false);
	});
});
