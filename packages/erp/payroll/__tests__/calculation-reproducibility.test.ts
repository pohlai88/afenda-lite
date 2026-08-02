import { describe, expect, it } from "vitest";

import {
	calculateEmployeePayroll,
	hashSnapshot,
	normalizeCalcOutput,
} from "../src/features/calculation/calculation";
import { payrollJsonObjectSchema } from "../src/kernel/validation/common.schema";
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

	it("validates the persisted snapshot as recursive JSON before hashing", () => {
		const snapshot = buildSyntheticCalcSnapshot();
		const parsed = payrollJsonObjectSchema.safeParse(snapshot);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			throw parsed.error;
		}
		expect(hashSnapshot(parsed.data)).toBe(hashSnapshot(snapshot));
	});

	it("rejects non-JSON values nested in snapshot configuration", () => {
		const baseline = buildSyntheticCalcSnapshot();
		const [statutoryRule] = baseline.statutoryRules;
		expect(statutoryRule).toBeDefined();
		if (statutoryRule === undefined) {
			return;
		}

		const snapshot = buildSyntheticCalcSnapshot({
			statutoryRules: [
				{
					...statutoryRule,
					configJson: { invalid: undefined },
				},
			],
		});

		expect(payrollJsonObjectSchema.safeParse(snapshot).success).toBe(false);
	});
});
