import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	addInstance,
	deleteInstance,
	getActiveInstance,
	loadConfig,
	loadStore,
	setActiveInstance,
	updateInstance,
} from "@/lib/config";

const STORE_KEY = "openconcho:instances";
const LEGACY_KEY = "openconcho:config";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("instance store — add + active selection", () => {
	it("makes the first added instance active", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		expect(loadStore().activeId).toBe(a.id);
	});

	it("does not steal active focus when adding more instances", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		addInstance({ name: "B", baseUrl: "https://b.example.net", token: "" });
		expect(loadStore().activeId).toBe(a.id);
	});

	it("appends instances in insertion order", () => {
		addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		addInstance({ name: "B", baseUrl: "https://b.example.net", token: "" });
		expect(loadStore().instances.map((i) => i.name)).toEqual(["A", "B"]);
	});
});

describe("instance store — switching active", () => {
	it("switches the active instance", () => {
		addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		const b = addInstance({ name: "B", baseUrl: "https://b.example.net", token: "" });
		setActiveInstance(b.id);
		expect(getActiveInstance()?.id).toBe(b.id);
	});

	it("ignores an unknown id", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		setActiveInstance("does-not-exist");
		expect(getActiveInstance()?.id).toBe(a.id);
	});
});

describe("instance store — deletion", () => {
	it("falls back to the first remaining when the active instance is deleted", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		const b = addInstance({ name: "B", baseUrl: "https://b.example.net", token: "" });
		setActiveInstance(b.id);
		deleteInstance(b.id);
		expect(loadStore().activeId).toBe(a.id);
	});

	it("leaves the active id unchanged when a non-active instance is deleted", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		const b = addInstance({ name: "B", baseUrl: "https://b.example.net", token: "" });
		deleteInstance(b.id);
		expect(getActiveInstance()?.id).toBe(a.id);
	});

	it("clears the active id when the last instance is removed", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		deleteInstance(a.id);
		expect(loadStore().activeId).toBeNull();
	});

	it("returns null config once every instance is gone", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		deleteInstance(a.id);
		expect(loadConfig()).toBeNull();
	});
});

describe("instance store — update", () => {
	it("patches the named fields", () => {
		const a = addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		updateInstance(a.id, { name: "Renamed", token: "sk-1" });
		expect(loadStore().instances[0]).toMatchObject({ name: "Renamed", token: "sk-1" });
	});

	it("no-ops on an unknown id", () => {
		addInstance({ name: "A", baseUrl: "https://a.example.net", token: "" });
		updateInstance("nope", { name: "X" });
		expect(loadStore().instances[0].name).toBe("A");
	});
});

describe("instance store — active config", () => {
	it("reflects the active instance's url and token", () => {
		addInstance({ name: "A", baseUrl: "https://a.example.net", token: "sk-a" });
		expect(loadConfig()).toEqual({ baseUrl: "https://a.example.net", token: "sk-a" });
	});
});

describe("instance store — legacy migration", () => {
	it("migrates the legacy single-config key into the instances store", () => {
		localStorage.setItem(
			LEGACY_KEY,
			JSON.stringify({ baseUrl: "https://legacy.example.net", token: "sk-legacy" }),
		);
		const store = loadStore();
		expect(store.instances[0]).toMatchObject({
			name: "Default",
			baseUrl: "https://legacy.example.net",
			token: "sk-legacy",
		});
	});

	it("removes the legacy key after migrating", () => {
		localStorage.setItem(
			LEGACY_KEY,
			JSON.stringify({ baseUrl: "https://legacy.example.net", token: "" }),
		);
		loadStore();
		expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
		expect(localStorage.getItem(STORE_KEY)).toBeTruthy();
	});
});
