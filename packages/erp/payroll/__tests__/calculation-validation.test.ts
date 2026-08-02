import { describe, expect, it } from "vitest";

import {
	calculateEmployeePayroll,
	normalizeCalcOutput,
} from "../src/features/calculation/calculation";
import {
	buildSyntheticCalcSnapshot,
	CALC_TEST_IDS,
} from "./helpers/calc-snapshot";

describe("payroll calculation validation", () => {
	it("allows zero amounts where business-legal", () => {
		const output = normalizeCalcOutput(
			calculateEmployeePayroll(
				buildSyntheticCalcSnapshot({
					recurringEarnings: [
						{
							id: CALC_TEST_IDS.recurringEarningId,
							earningRuleId: CALC_TEST_IDS.bonusEarningRuleId,
							earningRuleCode: "BONUS",
							earningRuleVersion: "1",
							amount: "0",
							currencyCode: "USD",
						},
					],
				}),
			),
		);

		expect(output.exceptions).toHaveLength(0);
		expect(output.totals.gross).toBe("5200");
	});

	it("blocks terminated employees", () => {
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				eligibility: { eligible: false, reason: "terminated" },
				employee: { employmentStatus: "terminated" },
			}),
		);

		expect(
			output.exceptions.some((e) => e.exceptionCode === "INELIGIBLE_EMPLOYEE"),
		).toBe(true);
		expect(output.totals.net).toBe("0");
	});

	it("blocks negative input amounts", () => {
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				employee: { baseCompensation: "-100" },
			}),
		);

		expect(
			output.exceptions.some((e) => e.exceptionCode === "NEGATIVE_AMOUNT"),
		).toBe(true);
	});

	it("blocks currency mismatch on recurring lines", () => {
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				recurringDeductions: [
					{
						id: CALC_TEST_IDS.recurringPreTaxId,
						deductionRuleId: CALC_TEST_IDS.preTaxRuleId,
						deductionRuleCode: "PRE401",
						deductionRuleVersion: "1",
						amount: "100",
						currencyCode: "EUR",
					},
				],
			}),
		);

		expect(
			output.exceptions.some((e) => e.exceptionCode === "CURRENCY_MISMATCH"),
		).toBe(true);
	});

	it("blocks unknown statutory calculators", () => {
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				statutoryRules: [
					{
						id: CALC_TEST_IDS.statutoryRuleId,
						code: "BAD",
						name: "Bad calculator",
						jurisdictionCode: "SYNTH",
						ruleVersion: "1",
						configJson: { calculatorId: "unknown.calculator" },
					},
				],
			}),
		);

		expect(
			output.exceptions.some((e) => e.exceptionCode === "UNKNOWN_CALCULATOR"),
		).toBe(true);
		expect(output.exceptions[0]?.message).toBe(
			"Unknown statutory calculator: unknown.calculator",
		);
	});

	it("blocks stale pinned earning rule versions", () => {
		const baseline = buildSyntheticCalcSnapshot();
		const [recurring] = baseline.recurringEarnings;
		expect(recurring).toBeDefined();
		if (recurring === undefined) {
			return;
		}
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				recurringEarnings: [
					{ ...recurring, earningRuleVersion: "stale-version" },
				],
			}),
		);
		expect(output.exceptions).toContainEqual(
			expect.objectContaining({ exceptionCode: "RULE_VERSION_MISMATCH" }),
		);
	});

	it("blocks rule currency mismatches", () => {
		const baseline = buildSyntheticCalcSnapshot();
		const [rule] = baseline.earningRules;
		expect(rule).toBeDefined();
		if (rule === undefined) {
			return;
		}
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				earningRules: [{ ...rule, currencyCode: "EUR" }],
			}),
		);
		expect(output.exceptions).toContainEqual(
			expect.objectContaining({ exceptionCode: "CURRENCY_MISMATCH" }),
		);
	});
});
