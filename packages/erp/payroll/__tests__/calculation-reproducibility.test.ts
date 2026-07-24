import { describe, expect, it } from "vitest";

import {
	calculateEmployeePayroll,
	hashSnapshot,
	normalizeCalcOutput,
} from "../src/runs/calculation";
import { buildSyntheticCalcSnapshot } from "./helpers/calc-snapshot";

describe("payroll calculation reproducibility", () => {
	it("produces byte-equivalent normalized output for the same snapshot", () => {
		const snapshot = buildSyntheticCalcSnapshot();
		const first = JSON.stringify(
			normalizeCalcOutput(calculateEmployeePayroll(snapshot)),
		);
		const second = JSON.stringify(
			normalizeCalcOutput(calculateEmployeePayroll(snapshot)),
		);
		expect(second).toBe(first);
	});

	it("hashes snapshots deterministically", () => {
		const snapshot = buildSyntheticCalcSnapshot();
		expect(hashSnapshot(snapshot)).toBe(hashSnapshot(snapshot));
	});
});
