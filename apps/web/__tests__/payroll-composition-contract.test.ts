import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function readCompositionFile(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(`../lib/erp/${relativePath}`, import.meta.url)),
		"utf8",
	);
}

describe("Payroll application composition", () => {
	it("constructs only the opaque Payroll capability context", () => {
		const source = readCompositionFile("payroll-command-options.ts");

		expect(source).toContain("createPayrollCapabilityOptions");
		expect(source).toContain("workforce: createPayrollEmployeeQueryPort()");
		expect(source).not.toContain("import type { PayrollCommandOptions");
	});

	it("projects the sealed HR payroll handoff without a null stub", () => {
		const source = readCompositionFile("payroll-employee-query-port.ts");

		expect(source).toContain("assembleApprovedPayrollHandoff");
		expect(source).toContain('from "@afenda/human-resources"');
		expect(source).not.toContain("return await null");
		expect(source).not.toContain("benefit_employer_contribution");
	});
});
