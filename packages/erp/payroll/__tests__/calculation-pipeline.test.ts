import { describe, expect, it } from "vitest";

import {
	calculateEmployeePayroll,
	normalizeCalcOutput,
	verifyAccountingIdentities,
} from "../src/runs/calculation";
import { buildSyntheticCalcSnapshot } from "./helpers/calc-snapshot";

describe("payroll calculation pipeline", () => {
	it("runs stages in order and keeps employer cost out of net", () => {
		const snapshot = buildSyntheticCalcSnapshot();
		const output = normalizeCalcOutput(calculateEmployeePayroll(snapshot));

		const stages = output.trace.map((step) => step.stage);
		expect(stages.indexOf("eligibility")).toBeLessThan(
			stages.indexOf("earnings"),
		);
		expect(stages.indexOf("earnings")).toBeLessThan(
			stages.indexOf("pre_tax_deductions"),
		);
		expect(stages.indexOf("pre_tax_deductions")).toBeLessThan(
			stages.indexOf("statutory"),
		);
		expect(stages.indexOf("statutory")).toBeLessThan(
			stages.indexOf("post_tax_deductions"),
		);
		expect(stages.indexOf("post_tax_deductions")).toBeLessThan(
			stages.indexOf("totals"),
		);

		const identity = verifyAccountingIdentities(output);
		expect(identity.valid).toBe(true);
		expect(output.totals.employerCost).toBe("235");
		expect(output.totals.net).toBe("4130");
	});

	it("splits pre_tax and post_tax deductions into separate line kinds", () => {
		const output = normalizeCalcOutput(
			calculateEmployeePayroll(buildSyntheticCalcSnapshot()),
		);

		expect(
			output.lines.some((line) => line.lineKind === "pre_tax_deduction"),
		).toBe(true);
		expect(
			output.lines.some((line) => line.lineKind === "post_tax_deduction"),
		).toBe(true);
		expect(
			output.lines.some((line) => line.lineKind === "employer_contribution"),
		).toBe(true);
		expect(
			output.lines.some((line) => line.lineKind === "employee_statutory"),
		).toBe(true);
	});
});
