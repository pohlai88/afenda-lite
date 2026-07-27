import { corporateAdministrationErrorDetails } from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

import { normalizeSafeFieldPath } from "../src/internal/safe-field-path";

describe("normalizeSafeFieldPath", () => {
	it.each([
		{
			path: ["company", "registrationNumber"],
			expected: "company.registrationNumber",
		},
		{
			path: ["officers", 0, "partyId"],
			expected: "officers[0].partyId",
		},
		{
			path: ["items", 12, "code"],
			expected: "items[12].code",
		},
	])("normalizes $expected", ({ path, expected }) => {
		expect(normalizeSafeFieldPath(path)).toBe(expected);
	});

	it.each([
		{ path: [] },
		{ path: [0, "name"] },
		{ path: ["company-name"] },
		{ path: ["company name"] },
		{ path: ["company", -1] },
		{ path: ["company", 1.5] },
		{ path: ["company", Symbol("unsafe")] },
	])("rejects unsafe path %#", ({ path }) => {
		expect(normalizeSafeFieldPath(path)).toBeUndefined();
	});

	it("rejects output longer than 128 characters", () => {
		expect(
			normalizeSafeFieldPath(["a".repeat(64), "b".repeat(64)]),
		).toBeUndefined();
	});

	it("accepts output exactly 128 characters long", () => {
		const result = normalizeSafeFieldPath(["a".repeat(63), "b".repeat(64)]);
		expect(result).toHaveLength(128);
	});

	it("is accepted by failure field metadata including brackets", () => {
		expect(() =>
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				{ field: "officers[0].partyId" },
			),
		).not.toThrow();
	});
});
