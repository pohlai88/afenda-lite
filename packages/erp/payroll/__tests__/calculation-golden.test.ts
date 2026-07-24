import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	calculateEmployeePayroll,
	normalizeCalcOutput,
} from "../src/runs/calculation";
import { buildSyntheticCalcSnapshot } from "./helpers/calc-snapshot";

const fixturePath = fileURLToPath(
	new URL("./fixtures/calc/synth-standard.json", import.meta.url),
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
	description: string;
	expectedTotals: {
		gross: string;
		employeeDeductions: string;
		employeeStatutory: string;
		employerCost: string;
		net: string;
	};
};

describe("payroll golden calculation (synth.v1 synthetic only)", () => {
	it("matches fixture totals for the standard synthetic employee", () => {
		const output = normalizeCalcOutput(
			calculateEmployeePayroll(buildSyntheticCalcSnapshot()),
		);

		expect(fixture.description).toContain("not a real jurisdiction");
		expect(output.totals).toEqual(fixture.expectedTotals);
		expect(output.statutoryResults[0]?.calculatorId).toBe("synth.v1");
	});
});
