import { z } from "zod";

const STORE_KEY = "openconcho:seed-kits";

export const seedKitSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, { message: "Name is required" }),
	description: z.string().default(""),
	lines: z.array(z.string()).default([]),
});

export type SeedKit = z.infer<typeof seedKitSchema>;

const storeSchema = z.array(seedKitSchema);

const BUILTIN_PREFIX = "builtin:";

export const BUILTIN_KITS: SeedKit[] = [
	{
		id: `${BUILTIN_PREFIX}personal-core`,
		name: "Personal core",
		description: "Name, email, preferred form of address, and role.",
		lines: ["Name: ", "Email: ", "Preferred address: ", "Role: "],
	},
	{
		id: `${BUILTIN_PREFIX}github-social`,
		name: "GitHub / social",
		description: "Common developer-identity handles.",
		lines: ["Github: ", "Linkedin: ", "X: ", "Twitter: "],
	},
	{
		id: `${BUILTIN_PREFIX}work-context`,
		name: "Work context",
		description: "Employer, role, and reporting line.",
		lines: ["Employer: ", "Role: ", "Reports to: "],
	},
];

export function isBuiltinKit(kit: Pick<SeedKit, "id">): boolean {
	return kit.id.startsWith(BUILTIN_PREFIX);
}

function newId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `kit_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function loadUserKits(): SeedKit[] {
	try {
		const raw = localStorage.getItem(STORE_KEY);
		if (!raw) return [];
		return storeSchema.parse(JSON.parse(raw));
	} catch {
		return [];
	}
}

export function saveUserKits(kits: SeedKit[]): void {
	localStorage.setItem(STORE_KEY, JSON.stringify(kits));
}

export function allKits(): SeedKit[] {
	return [...BUILTIN_KITS, ...loadUserKits()];
}

export function createKit(input: Omit<SeedKit, "id">): SeedKit {
	const kits = loadUserKits();
	const kit: SeedKit = { id: newId(), ...input };
	saveUserKits([...kits, kit]);
	return kit;
}

export function updateKit(id: string, patch: Partial<Omit<SeedKit, "id">>): void {
	if (id.startsWith(BUILTIN_PREFIX)) return;
	const kits = loadUserKits();
	const idx = kits.findIndex((k) => k.id === id);
	if (idx < 0) return;
	kits[idx] = { ...kits[idx], ...patch };
	saveUserKits(kits);
}

export function deleteKit(id: string): void {
	if (id.startsWith(BUILTIN_PREFIX)) return;
	saveUserKits(loadUserKits().filter((k) => k.id !== id));
}

// ─── Merge logic ──────────────────────────────────────────────────────────────

/**
 * Lines look like "Name: Ben" — the prefix is everything before the first `:`.
 * Used for additive-replace merge so an incoming line updates the matching
 * existing line instead of duplicating it.
 */
export function linePrefix(line: string): string | null {
	const i = line.indexOf(":");
	if (i <= 0) return null;
	const prefix = line.slice(0, i).trim();
	if (!prefix) return null;
	return prefix.toLowerCase();
}

/**
 * Merge `incoming` into `existing`. Lines with a prefix dedupe by prefix
 * (incoming wins, in-place). Lines without a prefix dedupe by exact match.
 * The merge is additive — nothing in `existing` is dropped unless replaced.
 */
export function mergeCardLines(existing: string[], incoming: string[]): string[] {
	const incomingByPrefix = new Map<string, string>();
	const incomingExact = new Set<string>();
	for (const line of incoming) {
		const p = linePrefix(line);
		if (p) incomingByPrefix.set(p, line);
		else incomingExact.add(line);
	}

	const out: string[] = [];
	const placedPrefixes = new Set<string>();
	const placedExact = new Set<string>();

	for (const line of existing) {
		const p = linePrefix(line);
		if (p && incomingByPrefix.has(p)) {
			out.push(incomingByPrefix.get(p) as string);
			placedPrefixes.add(p);
		} else {
			out.push(line);
			if (!p) placedExact.add(line);
		}
	}

	for (const line of incoming) {
		const p = linePrefix(line);
		if (p) {
			if (placedPrefixes.has(p)) continue;
			out.push(line);
			placedPrefixes.add(p);
		} else {
			if (placedExact.has(line)) continue;
			out.push(line);
			placedExact.add(line);
		}
	}

	return out;
}
