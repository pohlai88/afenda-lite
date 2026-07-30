import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { approvedPayrollHandoffSchema } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import {
	parseApprovedPayrollHandoff,
	parseApprovedPayrollHandoffInput,
	toPayrollRoundingPolicy,
} from "../src/inputs/parse-approved-payroll-handoff";
import {
	formatScaledToDecimal,
	formatScaledToHandoffAmount,
} from "../src/shared/money";
import {
	HANDOFF_FIXTURE_P1,
	HANDOFF_FIXTURE_P2,
	HANDOFF_FIXTURE_P3,
	HANDOFF_FIXTURE_P4,
	HANDOFF_FIXTURE_P5,
	HANDOFF_FIXTURE_P6,
	HANDOFF_FIXTURE_P7,
	HANDOFF_FIXTURE_P8,
	HANDOFF_FIXTURE_P9,
	HANDOFF_FIXTURE_P10,
	HANDOFF_FIXTURE_P11,
	HANDOFF_FIXTURE_SLICE_87,
} from "./fixtures/approved-payroll-handoff-fixtures";

describe("approved payroll handoff parser (Slice 8.8)", () => {
	it("P1: integer base preserves scale 0 and round-trips scaled amount", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P1);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.baseAmount).toBe("85000");
		expect(result.data.decimalScale).toBe(0);
		expect(result.data.effectiveDate).toBe("2025-01-01");
		expect(formatScaledToDecimal(result.data.baseAmountScaled)).toBe("85000");
	});

	it("P2: max HR precision (4 dp) preserved through scale-12 conversion", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P2);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.baseAmount).toBe("1234.5678");
		expect(result.data.decimalScale).toBe(4);
		expect(result.data.effectiveDate).toBe("2025-06-15");
		expect(formatScaledToDecimal(result.data.baseAmountScaled)).toBe(
			"1234.5678",
		);
	});

	it("P3: typical 2 dp amount preserved exactly", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P3);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.baseAmount).toBe("470.12");
		expect(formatScaledToDecimal(result.data.baseAmountScaled)).toBe("470.12");
	});

	it("P4: trailing-zero fractional digits keep decimalScale 2", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P4);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.baseAmount).toBe("100.10");
		expect(result.data.decimalScale).toBe(2);
		expect(
			formatScaledToHandoffAmount(
				result.data.baseAmountScaled,
				result.data.decimalScale,
			),
		).toBe("100.10");
	});

	it("P5: benefit employee and employer contribution components preserve amounts", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P5);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.components).toHaveLength(3);
		const employee = result.data.components.find(
			(c) => c.kind === "benefit_employee_contribution",
		);
		const employer = result.data.components.find(
			(c) => c.kind === "benefit_employer_contribution",
		);
		expect(employee?.amount).toBe("125.50");
		expect(employer?.amount).toBe("300.00");
		if (!(employee && employer)) {
			return;
		}
		expect(
			formatScaledToHandoffAmount(employee.amountScaled, employee.decimalScale),
		).toBe("125.50");
		expect(
			formatScaledToHandoffAmount(employer.amountScaled, employer.decimalScale),
		).toBe("300.00");
	});

	it("P6: period boundary effective date unchanged", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P6);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.effectiveDate).toBe("2024-12-31");
		expect(result.data.baseAmount).toBe("5000");
	});

	it("P7: leave segment dates preserved verbatim across month end", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P7);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.leaveFacts).toHaveLength(1);
		const [leave] = result.data.leaveFacts;
		expect(leave?.startDate).toBe("2025-01-30");
		expect(leave?.endDate).toBe("2025-02-02");
		expect(leave?.segments.map((s) => s.date)).toEqual([
			"2025-01-30",
			"2025-01-31",
			"2025-02-01",
		]);
	});

	it("P8: time facts period dates preserved verbatim", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P8);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.timeFacts?.periodStart).toBe("2025-01-01");
		expect(result.data.timeFacts?.periodEnd).toBe("2025-01-31");
		expect(result.data.overtimeFacts).toHaveLength(1);
		expect(result.data.overtimeFacts[0]?.approvedMinutes).toBe(120);
	});

	it("P9: rejects scale mismatch between amount and decimalScale", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P9);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("BAD_REQUEST");
	});

	it("P10: rejects malformed decimal amount", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P10);
		expect(result.ok).toBe(false);
	});

	it("P11: accepts compensation-only handoff with null time facts", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P11);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.timeFacts).toBeNull();
		expect(result.data.overtimeFacts).toEqual([]);
	});

	it("maps rounding policy from handoff decimal scale and mode", () => {
		const result = parseApprovedPayrollHandoffInput(HANDOFF_FIXTURE_P2);
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.data.roundingPolicy).toEqual({
			scale: 4,
			mode: "half_even",
		});
	});
});

describe("parseApprovedPayrollHandoff contract boundaries", () => {
	it("parses Slice 8.7 golden handoff and bridges rounding policy", () => {
		const parsed = parseApprovedPayrollHandoff(HANDOFF_FIXTURE_SLICE_87);
		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}

		expect(parsed.data.baseAmount).toBe("85000.00");
		expect(parsed.data.effectiveDate).toBe("2025-01-01");
		expect(toPayrollRoundingPolicy(parsed.data)).toEqual({
			scale: 2,
			mode: "half_even",
		});
	});

	it("rejects decimal scale mismatch on components", () => {
		const invalid = {
			...HANDOFF_FIXTURE_SLICE_87,
			components: [
				{
					...HANDOFF_FIXTURE_SLICE_87.components[0],
					amount: "85000.00",
					decimalScale: 0,
				},
			],
		};
		const parsed = parseApprovedPayrollHandoff(invalid);
		expect(parsed.ok).toBe(false);
	});

	it("rejects payloads that fail zod contract validation", () => {
		const parsed = parseApprovedPayrollHandoff({
			...HANDOFF_FIXTURE_SLICE_87,
			contractVersion: "invalid",
		});
		expect(parsed.ok).toBe(false);
	});

	it("round-trips through the canonical schema", () => {
		const schemaParsed = approvedPayrollHandoffSchema.parse(
			HANDOFF_FIXTURE_SLICE_87,
		);
		const parsed = parseApprovedPayrollHandoff(schemaParsed);
		expect(parsed.ok).toBe(true);
	});

	it("does not import @afenda/human-resources", () => {
		const pkg = JSON.parse(
			readFileSync(
				join(fileURLToPath(new URL(".", import.meta.url)), "../package.json"),
				"utf8",
			),
		);
		expect(pkg.dependencies?.["@afenda/human-resources"]).toBeUndefined();

		const parserBody = readFileSync(
			join(
				fileURLToPath(new URL(".", import.meta.url)),
				"../src/inputs/parse-approved-payroll-handoff.ts",
			),
			"utf8",
		);
		expect(parserBody).not.toMatch(/@afenda\/human-resources/);
	});

	it("exposes parseApprovedPayrollHandoffInput as an alias", () => {
		expect(parseApprovedPayrollHandoffInput).toBe(parseApprovedPayrollHandoff);
	});
});
