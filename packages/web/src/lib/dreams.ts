import type { components } from "@/api/schema.d.ts";

type ApiConclusion = components["schemas"]["Conclusion"];

export type ConclusionType = "explicit" | "deductive" | "inductive" | "contradiction";

export const CONCLUSION_TYPES: readonly ConclusionType[] = [
	"explicit",
	"deductive",
	"inductive",
	"contradiction",
] as const;

// Honcho < 3.2.0 sent conclusion fields the generated schema lacked, so
// ExtendedConclusion widened the type manually. The schema now targets
// Honcho 3.2.0 where `level`, `source_ids`, and `times_derived` are
// first-class. `Omit` + re-declaration keeps `level` widened to `string`:
// Honcho may add levels this client doesn't know yet, and the UI must
// classify unknown levels as explicit rather than dropping them.
// `premises`/`reasoning_tree` were never served by upstream Honcho; they
// stay as optional legacy-fallback inputs so older deployments degrade
// the same way they always did.
export type ExtendedConclusion = Omit<ApiConclusion, "level"> & {
	level?: string | null;
	premises?: string[] | null;
	reasoning_tree?: ReasoningTreeNode | null;
};

export interface ReasoningTreeNode {
	conclusion_id: string;
	premises?: ReasoningTreeNode[];
}

/** Native premises: `source_ids` (Honcho >= 3.2.0), falling back to the legacy alias. */
export function conclusionSourceIds(c: ExtendedConclusion): string[] {
	if (c.source_ids?.length) return c.source_ids;
	return c.premises ?? [];
}

/**
 * Cheap pre-check for whether the premise tree could be non-empty, so the UI
 * only offers expansion when there is something to show.
 */
export function hasPremiseTree(c: ExtendedConclusion): boolean {
	return conclusionSourceIds(c).length > 0 || Boolean(c.reasoning_tree?.premises?.length);
}

export interface Dream {
	id: string;
	observer_id: string;
	observed_id: string | null;
	session_id: string | null;
	earliestMs: number;
	latestMs: number;
	earliestIso: string;
	latestIso: string;
	conclusions: ExtendedConclusion[];
}

export interface DreamCounts {
	explicit: number;
	deductive: number;
	inductive: number;
	contradiction: number;
	total: number;
}

export interface ClusterOptions {
	/** Max gap (ms) between adjacent conclusions in the same dream. Defaults to 60s. */
	gapMs?: number;
}

const DEFAULT_GAP_MS = 60_000;

export function inferConclusionType(c: ExtendedConclusion): ConclusionType {
	return CONCLUSION_TYPES.find((t) => t === c.level) ?? "explicit";
}

export function dreamCounts(dream: Pick<Dream, "conclusions">): DreamCounts {
	const counts: DreamCounts = {
		explicit: 0,
		deductive: 0,
		inductive: 0,
		contradiction: 0,
		total: 0,
	};
	for (const c of dream.conclusions) {
		counts[inferConclusionType(c)]++;
		counts.total++;
	}
	return counts;
}

function parseMs(iso: string): number {
	const t = Date.parse(iso);
	return Number.isFinite(t) ? t : 0;
}

function dreamIdFor(observer: string, observed: string | null, earliestIso: string): string {
	return `${observer}|${observed ?? ""}|${earliestIso}`;
}

/**
 * Group conclusions into "dreams" — bursts of conclusions for the same
 * (observer, observed) pair within a short time window.
 *
 * Algorithm: walk conclusions newest-first; for each peer pair, keep an "open"
 * dream open as long as the next conclusion is within `gapMs` of the oldest
 * timestamp in the dream. When the gap exceeds `gapMs`, close the dream and
 * start a new one for that pair.
 */
export function clusterConclusionsIntoDreams(
	conclusions: ExtendedConclusion[],
	options: ClusterOptions = {},
): Dream[] {
	const gapMs = options.gapMs ?? DEFAULT_GAP_MS;
	if (conclusions.length === 0) return [];

	const sorted = [...conclusions].sort((a, b) => parseMs(b.created_at) - parseMs(a.created_at));
	const openByPair = new Map<string, Dream>();
	const result: Dream[] = [];

	for (const c of sorted) {
		const observed = c.observed_id ?? null;
		const pairKey = `${c.observer_id}::${observed ?? ""}`;
		const t = parseMs(c.created_at);
		const open = openByPair.get(pairKey);

		if (open && open.earliestMs - t <= gapMs) {
			open.conclusions.push(c);
			if (t < open.earliestMs) {
				open.earliestMs = t;
				open.earliestIso = c.created_at;
				open.id = dreamIdFor(c.observer_id, observed, c.created_at);
			}
			if (t > open.latestMs) {
				open.latestMs = t;
				open.latestIso = c.created_at;
			}
			continue;
		}

		const dream: Dream = {
			id: dreamIdFor(c.observer_id, observed, c.created_at),
			observer_id: c.observer_id,
			observed_id: observed,
			session_id: c.session_id ?? null,
			earliestMs: t,
			latestMs: t,
			earliestIso: c.created_at,
			latestIso: c.created_at,
			conclusions: [c],
		};
		openByPair.set(pairKey, dream);
		result.push(dream);
	}

	return result.sort((a, b) => b.latestMs - a.latestMs);
}

export function buildPremiseIndex(
	conclusions: ExtendedConclusion[],
): Map<string, ExtendedConclusion> {
	const index = new Map<string, ExtendedConclusion>();
	for (const c of conclusions) index.set(c.id, c);
	return index;
}

export interface PremiseNode {
	conclusion: ExtendedConclusion | null;
	conclusionId: string;
	depth: number;
	children: PremiseNode[];
	cycle: boolean;
}

/**
 * Expand the premise tree for a conclusion. Walks `reasoning_tree` if present,
 * otherwise falls back to the flat `premises` ID list. Cycle-safe via a visited
 * set; `maxDepth` defaults to 8.
 */
export function expandPremiseTree(
	conclusionId: string,
	index: Map<string, ExtendedConclusion>,
	maxDepth = 8,
): PremiseNode {
	return walk(conclusionId, index, new Set<string>(), 0, maxDepth);
}

function walk(
	conclusionId: string,
	index: Map<string, ExtendedConclusion>,
	visited: Set<string>,
	depth: number,
	maxDepth: number,
): PremiseNode {
	if (visited.has(conclusionId)) {
		return {
			conclusion: index.get(conclusionId) ?? null,
			conclusionId,
			depth,
			children: [],
			cycle: true,
		};
	}
	const conclusion = index.get(conclusionId) ?? null;
	if (!conclusion || depth >= maxDepth) {
		return { conclusion, conclusionId, depth, children: [], cycle: false };
	}

	const nextVisited = new Set(visited);
	nextVisited.add(conclusionId);

	let children: PremiseNode[] = [];
	if (conclusion.reasoning_tree?.premises?.length) {
		children = conclusion.reasoning_tree.premises.map((node) =>
			walk(node.conclusion_id, index, nextVisited, depth + 1, maxDepth),
		);
	} else {
		const sources = conclusionSourceIds(conclusion);
		children = sources.map((id) => walk(id, index, nextVisited, depth + 1, maxDepth));
	}
	return { conclusion, conclusionId, depth, children, cycle: false };
}
