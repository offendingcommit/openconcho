import { describe, expect, it } from "vitest";
import {
	buildPremiseIndex,
	clusterConclusionsIntoDreams,
	conclusionSourceIds,
	dreamCounts,
	type ExtendedConclusion,
	expandPremiseTree,
	hasPremiseTree,
} from "@/lib/dreams";

// Helpers ─────────────────────────────────────────────────────────────────────

function mkConclusion(
	id: string,
	createdAt: string,
	overrides: Partial<ExtendedConclusion> = {},
): ExtendedConclusion {
	return {
		id,
		content: `conclusion ${id}`,
		observer_id: "observer-a",
		observed_id: "observed-b",
		session_id: null,
		created_at: createdAt,
		times_derived: 1,
		...overrides,
	};
}

function iso(secondsFromZero: number): string {
	const base = Date.UTC(2026, 0, 1, 0, 0, 0); // 2026-01-01T00:00:00Z
	return new Date(base + secondsFromZero * 1000).toISOString();
}

// Clustering ──────────────────────────────────────────────────────────────────

describe("clusterConclusionsIntoDreams", () => {
	it("returns no dreams for empty input", () => {
		expect(clusterConclusionsIntoDreams([])).toEqual([]);
	});

	it("groups conclusions within the default 60s window into a single dream", () => {
		const burst = [
			mkConclusion("c1", iso(0)),
			mkConclusion("c2", iso(5)),
			mkConclusion("c3", iso(15)),
			mkConclusion("c4", iso(55)),
		];

		const dreams = clusterConclusionsIntoDreams(burst);

		expect(dreams).toHaveLength(1);
		expect(dreams[0].conclusions).toHaveLength(4);
		expect(dreams[0].observer_id).toBe("observer-a");
		expect(dreams[0].observed_id).toBe("observed-b");
		expect(dreams[0].earliestIso).toBe(iso(0));
		expect(dreams[0].latestIso).toBe(iso(55));
	});

	it("starts a new dream when the gap exceeds the threshold", () => {
		const conclusions = [
			mkConclusion("a", iso(0)),
			mkConclusion("b", iso(20)),
			// 5 minutes later → new dream
			mkConclusion("c", iso(20 + 5 * 60)),
			mkConclusion("d", iso(20 + 5 * 60 + 10)),
		];

		const dreams = clusterConclusionsIntoDreams(conclusions);

		expect(dreams).toHaveLength(2);
		// Sorted by latest descending — the newer dream comes first.
		expect(dreams[0].conclusions.map((c) => c.id).sort()).toEqual(["c", "d"]);
		expect(dreams[1].conclusions.map((c) => c.id).sort()).toEqual(["a", "b"]);
	});

	it("separates dreams by (observer, observed) pair even when timestamps overlap", () => {
		const conclusions = [
			mkConclusion("a1", iso(0), { observer_id: "alice", observed_id: "bob" }),
			mkConclusion("a2", iso(5), { observer_id: "alice", observed_id: "bob" }),
			mkConclusion("c1", iso(2), { observer_id: "carol", observed_id: "dan" }),
			mkConclusion("c2", iso(7), { observer_id: "carol", observed_id: "dan" }),
		];

		const dreams = clusterConclusionsIntoDreams(conclusions);

		expect(dreams).toHaveLength(2);
		const aliceDream = dreams.find((d) => d.observer_id === "alice");
		const carolDream = dreams.find((d) => d.observer_id === "carol");
		expect(aliceDream?.conclusions).toHaveLength(2);
		expect(carolDream?.conclusions).toHaveLength(2);
	});

	it("respects a custom gap window", () => {
		const conclusions = [
			mkConclusion("a", iso(0)),
			mkConclusion("b", iso(120)), // 2 minutes apart
		];

		const tight = clusterConclusionsIntoDreams(conclusions, { gapMs: 60_000 });
		expect(tight).toHaveLength(2);

		const loose = clusterConclusionsIntoDreams(conclusions, { gapMs: 5 * 60_000 });
		expect(loose).toHaveLength(1);
	});

	it("sorts dreams newest-first by latest timestamp", () => {
		const olderTs = iso(0);
		const newerTs = iso(10 * 60); // 10 minutes later
		const dreams = clusterConclusionsIntoDreams([
			mkConclusion("old", olderTs),
			mkConclusion("new", newerTs),
		]);
		expect(dreams).toHaveLength(2);
		expect(dreams[0].latestIso).toBe(newerTs);
		expect(dreams[1].latestIso).toBe(olderTs);
		expect(dreams[0].latestMs).toBeGreaterThan(dreams[1].latestMs);
	});

	it("computes counts by inferred level, defaulting unknown to explicit", () => {
		const conclusions = [
			mkConclusion("c1", iso(0)),
			mkConclusion("c2", iso(2), { level: "deductive" }),
			mkConclusion("c3", iso(4), { level: "deductive" }),
			mkConclusion("c4", iso(6), { level: "inductive" }),
		];
		const [dream] = clusterConclusionsIntoDreams(conclusions);
		expect(dreamCounts(dream)).toEqual({
			explicit: 1, // c1 has no level → defaults to explicit
			deductive: 2,
			inductive: 1,
			contradiction: 0,
			total: 4,
		});
	});

	it("counts a level this client does not know as explicit rather than dropping it", () => {
		const conclusions = [mkConclusion("c1", iso(0), { level: "abductive" })];
		const [dream] = clusterConclusionsIntoDreams(conclusions);
		expect(dreamCounts(dream).explicit).toBe(1);
	});
});

// Premise tree ────────────────────────────────────────────────────────────────

describe("expandPremiseTree", () => {
	it("returns an empty tree when the conclusion has no premises", () => {
		const c = mkConclusion("solo", iso(0));
		const index = buildPremiseIndex([c]);
		const tree = expandPremiseTree("solo", index);
		expect(tree.children).toEqual([]);
		expect(tree.conclusion?.id).toBe("solo");
	});

	it("expands a flat premises list to direct children", () => {
		const p1 = mkConclusion("p1", iso(0), { level: "explicit" });
		const p2 = mkConclusion("p2", iso(1), { level: "explicit" });
		const top = mkConclusion("top", iso(5), {
			level: "inductive",
			premises: ["p1", "p2"],
		});
		const index = buildPremiseIndex([p1, p2, top]);

		const tree = expandPremiseTree("top", index);
		expect(tree.children.map((n) => n.conclusionId)).toEqual(["p1", "p2"]);
		expect(tree.children.every((n) => n.conclusion !== null)).toBe(true);
	});

	it("walks a multi-level reasoning_tree recursively", () => {
		const e1 = mkConclusion("e1", iso(0), { level: "explicit" });
		const e2 = mkConclusion("e2", iso(1), { level: "explicit" });
		const d1 = mkConclusion("d1", iso(2), {
			level: "deductive",
			reasoning_tree: {
				conclusion_id: "d1",
				premises: [{ conclusion_id: "e1" }, { conclusion_id: "e2" }],
			},
		});
		const ind = mkConclusion("ind", iso(3), {
			level: "inductive",
			reasoning_tree: {
				conclusion_id: "ind",
				premises: [{ conclusion_id: "d1" }],
			},
		});
		const index = buildPremiseIndex([e1, e2, d1, ind]);

		const tree = expandPremiseTree("ind", index);
		expect(tree.children).toHaveLength(1);
		const deductive = tree.children[0];
		expect(deductive.conclusionId).toBe("d1");
		expect(deductive.children.map((n) => n.conclusionId).sort()).toEqual(["e1", "e2"]);
	});

	it("flags missing premises (e.g., outside the loaded page) without throwing", () => {
		const top = mkConclusion("top", iso(5), { premises: ["missing"] });
		const index = buildPremiseIndex([top]);
		const tree = expandPremiseTree("top", index);
		expect(tree.children).toHaveLength(1);
		expect(tree.children[0].conclusion).toBeNull();
		expect(tree.children[0].conclusionId).toBe("missing");
	});

	it("detects cycles and stops recursion", () => {
		const a = mkConclusion("a", iso(0), { premises: ["b"] });
		const b = mkConclusion("b", iso(1), { premises: ["a"] });
		const index = buildPremiseIndex([a, b]);
		const tree = expandPremiseTree("a", index);

		// a → b → a(cycle)
		expect(tree.children).toHaveLength(1);
		const bNode = tree.children[0];
		expect(bNode.conclusionId).toBe("b");
		expect(bNode.children).toHaveLength(1);
		const cycleNode = bNode.children[0];
		expect(cycleNode.conclusionId).toBe("a");
		expect(cycleNode.cycle).toBe(true);
		expect(cycleNode.children).toEqual([]);
	});

	it("stops recursion at maxDepth", () => {
		// a → b → c → d, expand with maxDepth=2: tree depth should not exceed 2
		const d = mkConclusion("d", iso(0));
		const c = mkConclusion("c", iso(1), { premises: ["d"] });
		const b = mkConclusion("b", iso(2), { premises: ["c"] });
		const a = mkConclusion("a", iso(3), { premises: ["b"] });
		const index = buildPremiseIndex([a, b, c, d]);

		const tree = expandPremiseTree("a", index, 2);
		// depth 0: a, depth 1: b, depth 2: c (no further children)
		expect(tree.conclusionId).toBe("a");
		expect(tree.children[0].conclusionId).toBe("b");
		expect(tree.children[0].children[0].conclusionId).toBe("c");
		expect(tree.children[0].children[0].children).toEqual([]);
	});

	it("prefers reasoning_tree over flat premises when both are present", () => {
		const e1 = mkConclusion("e1", iso(0));
		const e2 = mkConclusion("e2", iso(0));
		const top = mkConclusion("top", iso(5), {
			premises: ["e1"], // flat says one
			reasoning_tree: { conclusion_id: "top", premises: [{ conclusion_id: "e2" }] }, // tree says another
		});
		const index = buildPremiseIndex([e1, e2, top]);

		const tree = expandPremiseTree("top", index);
		expect(tree.children.map((n) => n.conclusionId)).toEqual(["e2"]);
	});

	// Honcho >= 3.2.0 serves attribution natively ────────────────────────────

	it("walks native source_ids into direct children", () => {
		const e1 = mkConclusion("e1", iso(0), { level: "explicit" });
		const e2 = mkConclusion("e2", iso(1), { level: "explicit" });
		const top = mkConclusion("top", iso(5), {
			level: "deductive",
			source_ids: ["e1", "e2"],
			times_derived: 1,
		});
		const index = buildPremiseIndex([e1, e2, top]);

		const tree = expandPremiseTree("top", index);
		expect(tree.children.map((n) => n.conclusionId)).toEqual(["e1", "e2"]);
		expect(tree.children.every((n) => n.conclusion !== null)).toBe(true);
	});

	it("prefers source_ids over the legacy premises alias", () => {
		const native = mkConclusion("native", iso(0));
		const legacy = mkConclusion("legacy", iso(0));
		const top = mkConclusion("top", iso(5), {
			source_ids: ["native"],
			premises: ["legacy"],
		});
		const index = buildPremiseIndex([native, legacy, top]);

		const tree = expandPremiseTree("top", index);
		expect(tree.children.map((n) => n.conclusionId)).toEqual(["native"]);
	});

	it("still falls back to legacy premises when source_ids is absent", () => {
		const e1 = mkConclusion("e1", iso(0));
		const top = mkConclusion("top", iso(5), { premises: ["e1"] });
		const index = buildPremiseIndex([e1, top]);

		const tree = expandPremiseTree("top", index);
		expect(tree.children.map((n) => n.conclusionId)).toEqual(["e1"]);
	});

	describe("hasPremiseTree", () => {
		it("is true for native source_ids", () => {
			expect(hasPremiseTree(mkConclusion("c", iso(0), { source_ids: ["x"] }))).toBe(true);
		});

		it("is true for the legacy premises alias", () => {
			expect(hasPremiseTree(mkConclusion("c", iso(0), { premises: ["x"] }))).toBe(true);
		});

		it("is false when neither is present", () => {
			expect(hasPremiseTree(mkConclusion("c", iso(0)))).toBe(false);
		});
	});

	describe("conclusionSourceIds", () => {
		it("returns an empty array when neither source is present", () => {
			expect(conclusionSourceIds(mkConclusion("c", iso(0)))).toEqual([]);
		});
	});
});
