import { describe, expect, it, vi } from "vitest";
import { REASONING_LEVELS, type ReasoningLevel } from "@/api/queries";
import {
	buildInitialColumns,
	fanoutQuery,
	latencyMs,
} from "@/components/playground/DialecticPlayground";

describe("fanoutQuery", () => {
	it("fires every selected level concurrently rather than sequentially", async () => {
		const inFlight = new Set<ReasoningLevel>();
		let peakConcurrency = 0;
		const released: Array<() => void> = [];

		const runOne = vi.fn(async (level: ReasoningLevel) => {
			inFlight.add(level);
			peakConcurrency = Math.max(peakConcurrency, inFlight.size);
			await new Promise<void>((resolve) => released.push(resolve));
			inFlight.delete(level);
			return { ok: true as const, content: `answer-${level}` };
		});

		let nowVal = 0;
		const fanout = fanoutQuery(REASONING_LEVELS, "ping", {
			now: () => nowVal++,
			runOne,
			onStart: () => {},
			onEnd: () => {},
		});

		await Promise.resolve();
		await Promise.resolve();

		expect(peakConcurrency).toBe(REASONING_LEVELS.length);

		for (const release of released) release();
		await fanout;

		expect(runOne).toHaveBeenCalledTimes(REASONING_LEVELS.length);
	});
});

describe("latencyMs", () => {
	it("measures the gap between request start and response end per column", () => {
		const columns = buildInitialColumns();
		columns.medium.status = "success";
		columns.medium.startedAt = 1000;
		columns.medium.endedAt = 1842;

		expect(latencyMs(columns.medium)).toBe(842);
	});
});
