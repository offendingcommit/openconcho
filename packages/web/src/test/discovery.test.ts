import { describe, expect, it } from "vitest";
import { deriveNameFromWorkspaceId } from "@/lib/discovery";

describe("deriveNameFromWorkspaceId", () => {
	it("capitalizes the prefix before the first hyphen", () => {
		expect(deriveNameFromWorkspaceId("neo-personal")).toBe("Neo");
	});

	it("handles a multi-segment workspace id by taking only the first segment", () => {
		expect(deriveNameFromWorkspaceId("jeeves-codewalnut-work")).toBe("Jeeves");
	});

	it("falls back to capitalizing the full id when there is no hyphen", () => {
		expect(deriveNameFromWorkspaceId("standalone")).toBe("Standalone");
	});
});
