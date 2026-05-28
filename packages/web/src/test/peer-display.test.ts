import { describe, expect, it } from "vitest";
import { hasDisplayName, peerDisplayName } from "@/lib/peerDisplay";

const PEER_ID = "22335577991-lid";

describe("peerDisplayName", () => {
	it("returns the display_name when set", () => {
		expect(peerDisplayName({ display_name: "Alice" }, PEER_ID)).toBe("Alice");
	});

	it("trims surrounding whitespace", () => {
		expect(peerDisplayName({ display_name: "  Bob  " }, PEER_ID)).toBe("Bob");
	});

	it("falls back to the peer id when display_name is absent", () => {
		expect(peerDisplayName({}, PEER_ID)).toBe(PEER_ID);
	});

	it("falls back to the peer id when display_name is blank", () => {
		expect(peerDisplayName({ display_name: "   " }, PEER_ID)).toBe(PEER_ID);
	});

	it("falls back to the peer id when display_name is not a string", () => {
		expect(peerDisplayName({ display_name: 42 }, PEER_ID)).toBe(PEER_ID);
	});

	it("falls back to the peer id when metadata is null", () => {
		expect(peerDisplayName(null, PEER_ID)).toBe(PEER_ID);
	});
});

describe("hasDisplayName", () => {
	it("is true when a distinct display name is set", () => {
		expect(hasDisplayName({ display_name: "Alice" }, PEER_ID)).toBe(true);
	});

	it("is false when no display name is set", () => {
		expect(hasDisplayName({}, PEER_ID)).toBe(false);
	});
});
