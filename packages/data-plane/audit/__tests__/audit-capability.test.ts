import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { audit } from "../src";

describe("audit capability facade", () => {
	it("exposes one frozen runtime capability graph", () => {
		expect(Object.isFrozen(audit)).toBe(true);
		expect(Object.isFrozen(audit.transaction)).toBe(true);
		expect(Object.isFrozen(audit.read)).toBe(true);
		expect(Object.isFrozen(audit.schemas)).toBe(true);
		expect(Object.isFrozen(audit.vocabulary)).toBe(true);
	});

	it("derives vocabulary, validation, and limits from package owners", () => {
		expect(audit.vocabulary.actions).toContain("CREATE");
		expect(audit.vocabulary.eventOutcomes).toEqual([
			"SUCCEEDED",
			"FAILED",
			"DENIED",
		]);
		expect(audit.schemas.action.parse("UPDATE")).toBe("UPDATE");
		expect(audit.limits.pageSize).toBe(50);
		expect(audit.limits.exportRows).toBe(10_000);
	});

	it("does not retain parallel named runtime exports", async () => {
		const root = await import("../src");
		expect(Object.keys(root)).toEqual(["audit"]);
	});
});
