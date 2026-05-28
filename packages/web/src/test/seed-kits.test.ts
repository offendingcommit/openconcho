import { describe, expect, it } from "vitest";
import {
	BUILTIN_KITS,
	createKit,
	deleteKit,
	isBuiltinKit,
	linePrefix,
	loadUserKits,
	mergeCardLines,
	type SeedKit,
	saveUserKits,
	updateKit,
} from "@/lib/seedKits";

describe("seedKits — storage round-trip", () => {
	it("returns [] when nothing is stored", () => {
		expect(loadUserKits()).toEqual([]);
	});

	it("round-trips a kit through localStorage", () => {
		const kits: SeedKit[] = [
			{ id: "k1", name: "First", description: "desc", lines: ["a", "b", "c"] },
			{ id: "k2", name: "Second", description: "", lines: [] },
		];
		saveUserKits(kits);
		expect(loadUserKits()).toEqual(kits);
	});

	it("recovers from corrupt storage by returning []", () => {
		localStorage.setItem("openconcho:seed-kits", "{not json");
		expect(loadUserKits()).toEqual([]);
	});

	it("ignores entries that fail schema validation", () => {
		localStorage.setItem(
			"openconcho:seed-kits",
			JSON.stringify([{ id: "", name: "", lines: "not-an-array" }]),
		);
		expect(loadUserKits()).toEqual([]);
	});
});

describe("seedKits — CRUD", () => {
	it("createKit assigns an id and persists", () => {
		const kit = createKit({ name: "Test", description: "", lines: ["x"] });
		expect(kit.id).toBeTruthy();
		expect(loadUserKits()).toHaveLength(1);
		expect(loadUserKits()[0].name).toBe("Test");
	});

	it("updateKit patches a stored kit by id", () => {
		const kit = createKit({ name: "Original", description: "", lines: [] });
		updateKit(kit.id, { name: "Renamed", lines: ["new line"] });
		const reloaded = loadUserKits()[0];
		expect(reloaded.name).toBe("Renamed");
		expect(reloaded.lines).toEqual(["new line"]);
	});

	it("deleteKit removes by id", () => {
		const a = createKit({ name: "A", description: "", lines: [] });
		createKit({ name: "B", description: "", lines: [] });
		deleteKit(a.id);
		const remaining = loadUserKits();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].name).toBe("B");
	});

	it("refuses to mutate built-in kits", () => {
		const builtin = BUILTIN_KITS[0];
		updateKit(builtin.id, { name: "Hacked" });
		deleteKit(builtin.id);
		expect(loadUserKits()).toEqual([]);
		expect(BUILTIN_KITS[0].name).not.toBe("Hacked");
	});
});

describe("seedKits — isBuiltinKit", () => {
	it("flags ids starting with 'builtin:'", () => {
		expect(isBuiltinKit({ id: "builtin:foo" })).toBe(true);
		expect(isBuiltinKit({ id: "kit_abc" })).toBe(false);
	});
});

describe("seedKits — linePrefix", () => {
	it("returns the lowercased text before the first colon", () => {
		expect(linePrefix("Name: Ben")).toBe("name");
		expect(linePrefix("EMAIL: foo@bar.com")).toBe("email");
		expect(linePrefix("Preferred address: Chief")).toBe("preferred address");
	});

	it("returns null for lines without a colon or with empty prefix", () => {
		expect(linePrefix("loves coffee")).toBeNull();
		expect(linePrefix(": no key")).toBeNull();
		expect(linePrefix("")).toBeNull();
	});
});

describe("seedKits — mergeCardLines", () => {
	it("replaces existing lines with matching prefix instead of duplicating", () => {
		const existing = ["Name: Ben", "Email: ben@old.com"];
		const incoming = ["Name: Ben Sheridan-Edwards"];
		const merged = mergeCardLines(existing, incoming);
		// Matching-prefix wins → "Name: Ben" replaced; no duplicate Name line.
		expect(merged).toEqual(["Name: Ben Sheridan-Edwards", "Email: ben@old.com"]);
	});

	it("appends incoming lines whose prefix is not in existing", () => {
		const existing = ["Name: Ben"];
		const incoming = ["Email: ben@codewalnut.com", "Role: Founder"];
		expect(mergeCardLines(existing, incoming)).toEqual([
			"Name: Ben",
			"Email: ben@codewalnut.com",
			"Role: Founder",
		]);
	});

	it("treats prefix comparison case-insensitively", () => {
		const existing = ["NAME: Ben"];
		const incoming = ["Name: Ben Sheridan-Edwards"];
		expect(mergeCardLines(existing, incoming)).toEqual(["Name: Ben Sheridan-Edwards"]);
	});

	it("preserves order of existing lines when replacing", () => {
		const existing = ["A: 1", "B: 2", "C: 3"];
		const incoming = ["B: 22"];
		expect(mergeCardLines(existing, incoming)).toEqual(["A: 1", "B: 22", "C: 3"]);
	});

	it("dedupes no-prefix lines by exact match", () => {
		const existing = ["loves coffee", "Name: Ben"];
		const incoming = ["loves coffee", "loves tea"];
		// "loves coffee" already present → kept once; "loves tea" appended.
		expect(mergeCardLines(existing, incoming)).toEqual(["loves coffee", "Name: Ben", "loves tea"]);
	});

	it("never drops existing lines that have no incoming match", () => {
		const existing = ["Name: Ben", "Quirk: drinks tea, not coffee"];
		const incoming = ["Email: ben@x.com"];
		expect(mergeCardLines(existing, incoming)).toEqual([
			"Name: Ben",
			"Quirk: drinks tea, not coffee",
			"Email: ben@x.com",
		]);
	});

	it("handles empty existing and empty incoming", () => {
		expect(mergeCardLines([], [])).toEqual([]);
		expect(mergeCardLines([], ["A: 1"])).toEqual(["A: 1"]);
		expect(mergeCardLines(["A: 1"], [])).toEqual(["A: 1"]);
	});

	it("dedupes within incoming when an existing prefix is matched", () => {
		// Two incoming lines share a prefix → the LAST one wins (Map semantics) and
		// the earlier duplicate is collapsed.
		const existing = ["Name: Ben"];
		const incoming = ["Name: First", "Name: Second"];
		expect(mergeCardLines(existing, incoming)).toEqual(["Name: Second"]);
	});
});
