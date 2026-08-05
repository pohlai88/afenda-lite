import { describe, expect, it } from "vitest";

import {
	DEFAULT_PAYROLL_ROUNDING_POLICY,
	formatScaledToDecimal,
	getStatutoryCalculator,
	getStatutoryCalculatorReadiness,
	isStatutoryProductionReady,
	listRegisteredStatutoryCalculators,
	parseDecimalToScaled,
} from "../src/features/calculation/calculation";
import type { StatutoryCalculatorInput } from "../src/features/statutory-rules/calculator.types";
import { listStatutorySourceLedger } from "../src/features/statutory-rules/statutory-source-ledger";

function baseInput(
	overrides: Partial<StatutoryCalculatorInput> & {
		configJson: Record<string, unknown>;
	},
): StatutoryCalculatorInput {
	return {
		currencyCode: "MYR",
		gross: parseDecimalToScaled("5000"),
		jurisdictionCode: "MY",
		roundingPolicy: DEFAULT_PAYROLL_ROUNDING_POLICY,
		ruleCode: "TEST",
		ruleVersion: "fixture.v1",
		statutoryProfile: null,
		taxableBase: parseDecimalToScaled("5000"),
		yearToDate: {
			currencyCode: "MYR",
			employeeStatutory: "0",
			employerStatutory: "0",
			gross: "0",
			taxableBase: "0",
			taxYear: 2026,
		},
		...overrides,
	};
}

describe("jurisdiction statutory calculators (A2 in-house, synthetic fixtures)", () => {
	it("registers MY/VN packs as awaiting_review and keeps production readiness false", () => {
		expect(listRegisteredStatutoryCalculators()).toEqual([
			"my.eis.v1",
			"my.epf.v1",
			"my.pcb.v1",
			"my.socso.v1",
			"synth.v1",
			"vn.hi.v1",
			"vn.pit.v1",
			"vn.si.v1",
			"vn.ui.v1",
		]);
		expect(getStatutoryCalculatorReadiness()).toEqual([
			{ calculatorId: "my.eis.v1", status: "awaiting_review" },
			{ calculatorId: "my.epf.v1", status: "awaiting_review" },
			{ calculatorId: "my.pcb.v1", status: "awaiting_review" },
			{ calculatorId: "my.socso.v1", status: "awaiting_review" },
			{ calculatorId: "synth.v1", status: "synthetic_only" },
			{ calculatorId: "vn.hi.v1", status: "awaiting_review" },
			{ calculatorId: "vn.pit.v1", status: "awaiting_review" },
			{ calculatorId: "vn.si.v1", status: "awaiting_review" },
			{ calculatorId: "vn.ui.v1", status: "awaiting_review" },
		]);
		expect(isStatutoryProductionReady()).toBe(false);
		expect(listStatutorySourceLedger()).toHaveLength(8);
	});

	it("my.epf.v1 applies a labeled synthetic wage-band schedule from configJson", () => {
		const output = getStatutoryCalculator("my.epf.v1").calculate(
			baseInput({
				configJson: {
					baseKind: "gross",
					bands: [
						{
							wageFromInclusive: "0",
							wageToExclusive: "5000",
							employeeAmount: "100",
							employerAmount: "200",
						},
						{
							wageFromInclusive: "5000",
							wageToExclusive: null,
							employeeAmount: "550",
							employerAmount: "650",
						},
					],
				},
				ruleCode: "EPF",
			}),
		);
		expect(formatScaledToDecimal(output.employeeAmount)).toBe("550");
		expect(formatScaledToDecimal(output.employerAmount)).toBe("650");
		expect(output.calculatorId).toBe("my.epf.v1");
	});

	it("my.socso.v1 / my.eis.v1 apply ceiling-rate synthetic schedules", () => {
		const socso = getStatutoryCalculator("my.socso.v1").calculate(
			baseInput({
				configJson: {
					baseKind: "gross",
					employeeRate: "0.005",
					employerRate: "0.0175",
					wageCeiling: "4000",
				},
				gross: parseDecimalToScaled("5000"),
				ruleCode: "SOCSO",
			}),
		);
		expect(formatScaledToDecimal(socso.baseAmount)).toBe("4000");
		expect(formatScaledToDecimal(socso.employeeAmount)).toBe("20");
		expect(formatScaledToDecimal(socso.employerAmount)).toBe("70");

		const eis = getStatutoryCalculator("my.eis.v1").calculate(
			baseInput({
				configJson: {
					baseKind: "gross",
					employeeRate: "0.002",
					employerRate: "0.002",
					wageCeiling: "4000",
				},
				gross: parseDecimalToScaled("5000"),
				ruleCode: "EIS",
			}),
		);
		expect(formatScaledToDecimal(eis.employeeAmount)).toBe("8");
		expect(formatScaledToDecimal(eis.employerAmount)).toBe("8");
	});

	it("my.pcb.v1 computes progressive withholding from merged YTD using synthetic brackets", () => {
		const output = getStatutoryCalculator("my.pcb.v1").calculate(
			baseInput({
				configJson: {
					baseKind: "taxable",
					brackets: [
						{
							fromInclusive: "0",
							toExclusive: "5000",
							rate: "0",
						},
						{
							fromInclusive: "5000",
							toExclusive: null,
							rate: "0.1",
						},
					],
					personalRelief: "0",
				},
				taxableBase: parseDecimalToScaled("2000"),
				yearToDate: {
					currencyCode: "MYR",
					employeeStatutory: "0",
					employerStatutory: "0",
					gross: "4000",
					taxableBase: "4000",
					taxYear: 2026,
				},
				ruleCode: "PCB",
			}),
		);
		// Cumulative taxable 6000 → tax 100; prior YTD taxable 4000 → tax 0; period = 100
		expect(formatScaledToDecimal(output.employeeAmount)).toBe("100");
		expect(output.employerAmount).toBe(0n);
	});

	it("vn.si.v1 applies zone minimum + maximum base from synthetic config", () => {
		const output = getStatutoryCalculator("vn.si.v1").calculate(
			baseInput({
				currencyCode: "VND",
				jurisdictionCode: "VN",
				gross: parseDecimalToScaled("1000"),
				taxableBase: parseDecimalToScaled("1000"),
				configJson: {
					baseKind: "gross",
					employeeRate: "0.08",
					employerRate: "0.175",
					maximumBase: "5000",
					zoneMinimumBase: {
						I: "3000",
						II: "2500",
						III: "2000",
						IV: "1800",
					},
				},
				statutoryProfile: {
					profileId: "profile-vn-si-fixture",
					sourceVersion: 1,
					jurisdictionCode: "VN",
					taxResidencyStatus: "resident",
					nationalityCountryCode: "VN",
					expatriate: false,
					dependantCount: 0,
					reliefDeclarationVersion: "hr.statutory-relief.v1",
					reliefDeclarations: [],
					minimumWageZone: "I",
					taxFileNumber: null,
					socialSecurityNumber: null,
					employeeProvidentFundNumber: null,
					socialInsuranceBookNumber: null,
				},
				yearToDate: {
					currencyCode: "VND",
					employeeStatutory: "0",
					employerStatutory: "0",
					gross: "0",
					taxableBase: "0",
					taxYear: 2026,
				},
				ruleCode: "SI",
			}),
		);
		expect(formatScaledToDecimal(output.baseAmount)).toBe("3000");
		expect(formatScaledToDecimal(output.employeeAmount)).toBe("240");
		expect(formatScaledToDecimal(output.employerAmount)).toBe("525");
	});

	it("vn.pit.v1 uses non-resident flat rate when profile says non_resident", () => {
		const output = getStatutoryCalculator("vn.pit.v1").calculate(
			baseInput({
				currencyCode: "VND",
				jurisdictionCode: "VN",
				configJson: {
					baseKind: "taxable",
					brackets: [
						{
							fromInclusive: "0",
							toExclusive: null,
							rate: "0.05",
						},
					],
					nonResidentRate: "0.2",
				},
				statutoryProfile: {
					profileId: "profile-vn-pit-fixture",
					sourceVersion: 1,
					jurisdictionCode: "VN",
					taxResidencyStatus: "non_resident",
					nationalityCountryCode: "US",
					expatriate: true,
					dependantCount: 0,
					reliefDeclarationVersion: "hr.statutory-relief.v1",
					reliefDeclarations: [],
					minimumWageZone: null,
					taxFileNumber: null,
					socialSecurityNumber: null,
					employeeProvidentFundNumber: null,
					socialInsuranceBookNumber: null,
				},
				taxableBase: parseDecimalToScaled("1000"),
				yearToDate: {
					currencyCode: "VND",
					employeeStatutory: "0",
					employerStatutory: "0",
					gross: "0",
					taxableBase: "0",
					taxYear: 2026,
				},
				ruleCode: "PIT",
			}),
		);
		expect(formatScaledToDecimal(output.employeeAmount)).toBe("200");
	});
});
