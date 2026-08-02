import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(
	fileURLToPath(
		new URL(
			"../src/features/calculation/production-run-calculator.ts",
			import.meta.url,
		),
	),
	"utf8",
);

describe("production payroll snapshot ordering contract", () => {
	it("canonicalizes every database-fed collection before snapshot assembly", () => {
		expect(source).toContain("const selectedAssignments = assignments.data");
		expect(
			source.match(/sort\(compareCanonicalRecords\)/g)?.length,
		).toBeGreaterThanOrEqual(6);
		expect(source).toContain("recurringAllowances:");
		expect(source).toContain("recurringDeductions:");
	});
});
