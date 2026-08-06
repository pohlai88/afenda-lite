import type { HandoffStatutoryProfile } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import {
	calculateEmployeePayroll,
	getStatutoryCalculatorReadiness,
	isStatutoryProductionReady,
	listRegisteredStatutoryCalculators,
} from "../src/features/calculation/calculation";
import type { PayrollEmployeeCalcOutput } from "../src/features/calculation/calculation.types";
import { getStatutoryCalculator } from "../src/features/statutory-rules/calculator-registry";
import {
	classifyPeriodsPerYear,
	resolveTaxYearCadence,
} from "../src/features/statutory-rules/period-cadence";
import {
	listStatutorySourceLedger,
	listUnattestedStatutorySources,
} from "../src/features/statutory-rules/statutory-source-ledger";
import type { PayrollJsonObject } from "../src/kernel/validation/common.schema";
import { buildSyntheticCalcSnapshot } from "./helpers/calc-snapshot";

const STATUTORY_RULE_ID = "a0000008-0008-4008-8008-000000000008";

function profile(
	overrides: Partial<HandoffStatutoryProfile> = {},
): HandoffStatutoryProfile {
	return {
		dependantCount: 0,
		employeeProvidentFundNumber: null,
		expatriate: false,
		jurisdictionCode: "MY",
		minimumWageZone: null,
		nationalityCountryCode: "MY",
		profileId: "profile-pack-fixture",
		reliefDeclarations: [],
		reliefDeclarationVersion: "hr.statutory-relief.v1",
		socialInsuranceBookNumber: null,
		socialSecurityNumber: null,
		sourceVersion: 1,
		taxFileNumber: null,
		taxResidencyStatus: "resident",
		...overrides,
	};
}

/**
 * Every pack assertion below runs the REAL dispatcher. `calculateEmployeePayroll`
 * reads `configJson.calculatorId`, resolves the pack, and hands it the whole
 * config object — which is exactly the path that made every strict pack schema
 * reject its own config as an unrecognized key. Calling `calculate()` directly
 * with a hand-trimmed config cannot see that class of defect.
 */
function runPack(input: {
	configJson: PayrollJsonObject;
	currencyCode?: string;
	gross?: string;
	jurisdictionCode?: string;
	periodCadence?: { periodOrdinal: number; periodsPerYear: number };
	statutoryProfile?: HandoffStatutoryProfile | null;
	yearToDate?: {
		employeeStatutory?: string;
		taxWithheld?: string;
		taxableBase?: string;
	};
}): PayrollEmployeeCalcOutput {
	const currencyCode = input.currencyCode ?? "MYR";
	const jurisdictionCode = input.jurisdictionCode ?? "MY";
	return calculateEmployeePayroll(
		buildSyntheticCalcSnapshot({
			currencyCode,
			deductionRules: [],
			earningRules: [],
			employee: {
				baseCompensation: input.gross ?? "5000",
				currencyCode,
				recurringAllowances: [],
				recurringDeductions: [],
			},
			...(input.periodCadence === undefined
				? {}
				: { periodCadence: input.periodCadence }),
			recurringDeductions: [],
			recurringEarnings: [],
			statutoryProfile:
				input.statutoryProfile === undefined
					? profile({ jurisdictionCode })
					: input.statutoryProfile,
			statutoryRules: [
				{
					id: STATUTORY_RULE_ID,
					code: "PACK",
					name: "Jurisdiction pack under test",
					jurisdictionCode,
					recordVersion: 1,
					ruleVersion: "1",
					configJson: input.configJson,
				},
			],
			variableInputs: [],
			yearToDate: {
				currencyCode,
				employeeStatutory: input.yearToDate?.employeeStatutory ?? "0",
				employerStatutory: "0",
				gross: input.yearToDate?.taxableBase ?? "0",
				taxWithheld: input.yearToDate?.taxWithheld ?? "0",
				taxYear: 2025,
				taxableBase: input.yearToDate?.taxableBase ?? "0",
			},
		}),
	);
}

function soleStatutoryResult(output: PayrollEmployeeCalcOutput): {
	baseAmount: string;
	employeeAmount: string;
	employerAmount: string;
} {
	if (output.exceptions.length > 0) {
		throw new Error(
			`expected a clean calculation, got ${JSON.stringify(output.exceptions)}`,
		);
	}
	const [result, ...rest] = output.statutoryResults;
	if (result === undefined || rest.length > 0) {
		throw new Error(
			`expected exactly one statutory result, got ${output.statutoryResults.length}`,
		);
	}
	return {
		baseAmount: result.baseAmount,
		employeeAmount: result.employeeAmount,
		employerAmount: result.employerAmount,
	};
}

function refusalMessage(output: PayrollEmployeeCalcOutput): string {
	if (output.statutoryResults.length > 0) {
		throw new Error(
			`expected no statutory result, got ${JSON.stringify(output.statutoryResults)}`,
		);
	}
	const [exception] = output.exceptions;
	if (exception === undefined || exception.severity !== "blocking") {
		throw new Error(
			`expected one blocking statutory exception, got ${JSON.stringify(output.exceptions)}`,
		);
	}
	return exception.message;
}

describe("statutory pack registry and source ledger", () => {
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
	});

	it("classifies exactly the two withholding packs as tax and the rest as contributions", () => {
		const taxPacks = listRegisteredStatutoryCalculators().filter(
			(calculatorId) =>
				getStatutoryCalculator(calculatorId).statutoryKind === "tax",
		);
		expect(taxPacks).toEqual(["my.pcb.v1", "vn.pit.v1"]);
	});

	it("holds one ledger row per registered jurisdiction pack, in both directions", () => {
		const packIds = listRegisteredStatutoryCalculators().filter(
			(calculatorId) =>
				getStatutoryCalculator(calculatorId).productionApproval.status !==
				"synthetic_only",
		);
		const ledgerIds = listStatutorySourceLedger()
			.map((row) => row.calculatorId)
			.sort();
		expect(ledgerIds).toEqual([...packIds].sort());
	});

	it("keeps every ledger row's provenance pending until a human reviewer attests it", () => {
		expect([...listUnattestedStatutorySources()].sort()).toEqual(
			listStatutorySourceLedger()
				.map((row) => row.calculatorId)
				.sort(),
		);
		for (const row of listStatutorySourceLedger()) {
			expect(row.effectiveFrom).toEqual({ state: "pending_review" });
			expect(row.effectiveTo).toEqual({ state: "pending_review" });
			expect(row.documentVersion).toEqual({ state: "pending_review" });
			expect(row.retrievedAt).toEqual({ state: "pending_review" });
		}
	});
});

describe("my.epf.v1 through the production dispatcher", () => {
	const bands = [
		{
			wageFromInclusive: "0",
			wageToExclusive: "5000",
			employeeAmount: "550",
			employerAmount: "650",
		},
		{
			wageFromInclusive: "5000",
			wageToExclusive: "20000",
			employeeAmount: "1100",
			employerAmount: "1300",
		},
	];

	it("prices a wage inside the schedule at the band's fixed amounts", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.epf.v1",
						baseKind: "gross",
						bands,
						aboveBands: { employeeRate: "0.11", employerRate: "0.13" },
					},
					gross: "4000",
				}),
			),
		).toEqual({
			baseAmount: "4000",
			employeeAmount: "550",
			employerAmount: "650",
		});
	});

	it("prices a wage above the schedule at the aboveBands rates: 25000 × 0.11 = 2750, × 0.13 = 3250", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.epf.v1",
						baseKind: "gross",
						bands,
						aboveBands: { employeeRate: "0.11", employerRate: "0.13" },
					},
					gross: "25000",
				}),
			),
		).toEqual({
			baseAmount: "25000",
			employeeAmount: "2750",
			employerAmount: "3250",
		});
	});

	it("rounds up to the whole ringgit when the pack pins ceil_to_unit: 25000 × 0.1101 = 2752.5 → 2753", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.epf.v1",
						baseKind: "gross",
						bands,
						aboveBands: { employeeRate: "0.1101", employerRate: "0.13" },
						roundingMode: "ceil_to_unit",
					},
					gross: "25000",
				}),
			).employeeAmount,
		).toBe("2753");
	});

	it("accepts a schedule far past the old 512-row cap", () => {
		const wideBands = Array.from({ length: 1000 }, (_, index) => ({
			wageFromInclusive: String(index * 10),
			wageToExclusive: index === 999 ? null : String((index + 1) * 10),
			employeeAmount: String(index),
			employerAmount: String(index * 2),
		}));
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.epf.v1",
						baseKind: "gross",
						bands: wideBands,
					},
					gross: "4000",
				}),
			).employeeAmount,
		).toBe("400");
	});
});

describe("PERKESO packs accept either published table shape", () => {
	it("my.socso.v1 reads a fixed-amount contribution table when the config carries bands", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.socso.v1",
						baseKind: "gross",
						bands: [
							{
								wageFromInclusive: "0",
								wageToExclusive: "3000",
								employeeAmount: "14.75",
								employerAmount: "51.65",
							},
							{
								wageFromInclusive: "3000",
								wageToExclusive: null,
								employeeAmount: "19.75",
								employerAmount: "69.05",
							},
						],
					},
					gross: "5000",
				}),
			),
		).toEqual({
			baseAmount: "5000",
			employeeAmount: "19.75",
			employerAmount: "69.05",
		});
	});

	it("my.eis.v1 still reads a capped-wage rate config: min(5000, 4000) × 0.002 = 8", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.eis.v1",
						baseKind: "gross",
						employeeRate: "0.002",
						employerRate: "0.002",
						wageCeiling: "4000",
					},
					gross: "5000",
				}),
			),
		).toEqual({
			baseAmount: "4000",
			employeeAmount: "8",
			employerAmount: "8",
		});
	});
});

describe("my.pcb.v1 annualized withholding", () => {
	const annualConfig: PayrollJsonObject = {
		calculatorId: "my.pcb.v1",
		baseKind: "taxable",
		basis: "cumulative_annualized",
		brackets: [
			{ fromInclusive: "0", toExclusive: "5000", rate: "0" },
			{ fromInclusive: "5000", toExclusive: "20000", rate: "0.1" },
			{ fromInclusive: "20000", toExclusive: null, rate: "0.2" },
		],
		personalRelief: "9000",
		dependantRelief: "2000",
	};

	/**
	 * Period 3 of 12, so 10 periods remain including this one.
	 *   projected annual = 10000 year to date + 10 × 5000 = 60000
	 *   annual reliefs   = 9000 personal + 1 × 2000 dependant = 11000
	 *   chargeable       = 49000
	 *   annual tax       = 0 + 0.1 × 15000 + 0.2 × 29000 = 1500 + 5800 = 7300
	 *   outstanding      = 7300 − 500 already withheld = 6800
	 *   this period      = 6800 ÷ 10 = 680
	 */
	it("projects the year, nets tax already withheld, and spreads the rest over the periods remaining → 680", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: annualConfig,
					gross: "5000",
					periodCadence: { periodOrdinal: 3, periodsPerYear: 12 },
					statutoryProfile: profile({ dependantCount: 1 }),
					yearToDate: { taxWithheld: "500", taxableBase: "10000" },
				}),
			).employeeAmount,
		).toBe("680");
	});

	it("nets only the tax channel: 4000 of year-to-date CONTRIBUTIONS leaves the same 680", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: annualConfig,
					gross: "5000",
					periodCadence: { periodOrdinal: 3, periodsPerYear: 12 },
					statutoryProfile: profile({ dependantCount: 1 }),
					yearToDate: {
						employeeStatutory: "4000",
						taxWithheld: "500",
						taxableBase: "10000",
					},
				}),
			).employeeAmount,
		).toBe("680");
	});

	/**
	 * Period 12 of 12, one period remaining.
	 *   projected annual = 50000 + 1 × 5000 = 55000
	 *   chargeable       = 55000 − 11000 = 44000
	 *   annual tax       = 0.1 × 15000 + 0.2 × 24000 = 1500 + 4800 = 6300
	 *   outstanding      = 6300 − 500 = 5800, collected whole
	 */
	it("collects the whole outstanding amount in the last period → 5800", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: annualConfig,
					gross: "5000",
					periodCadence: { periodOrdinal: 12, periodsPerYear: 12 },
					statutoryProfile: profile({ dependantCount: 1 }),
					yearToDate: { taxWithheld: "500", taxableBase: "50000" },
				}),
			).employeeAmount,
		).toBe("5800");
	});

	it("clamps to zero when more tax has already been withheld than the year owes", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: annualConfig,
					gross: "5000",
					periodCadence: { periodOrdinal: 3, periodsPerYear: 12 },
					statutoryProfile: profile({ dependantCount: 1 }),
					yearToDate: { taxWithheld: "99000", taxableBase: "10000" },
				}),
			).employeeAmount,
		).toBe("0");
	});

	it("refuses rather than assuming a position in the year when no cadence is supplied", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: annualConfig,
					gross: "5000",
					statutoryProfile: profile({ dependantCount: 1 }),
					yearToDate: { taxWithheld: "500", taxableBase: "10000" },
				}),
			),
		).toContain("no period cadence");
	});
});

describe("cumulative withholding subtracts two relief-adjusted bases", () => {
	/**
	 * Reliefs: 500 personal + 2 × 100 dependant = 700, applied to BOTH sides.
	 *   prior chargeable      = 2000 − 700 = 1300 → 0.1 × 300              =  30
	 *   cumulative chargeable = 3000 − 700 = 2300 → 0.1 × 1000 + 0.2 × 300 = 160
	 *   this period                                                        = 130
	 * Subtracting tax on an UNRELIEVED 2000 (= 100) instead yields 60.
	 */
	it("charges 130, not the 60 an unrelieved prior-side base produces", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.pcb.v1",
						baseKind: "taxable",
						basis: "cumulative",
						brackets: [
							{ fromInclusive: "0", toExclusive: "1000", rate: "0" },
							{ fromInclusive: "1000", toExclusive: "2000", rate: "0.1" },
							{ fromInclusive: "2000", toExclusive: null, rate: "0.2" },
						],
						personalRelief: "500",
						dependantRelief: "100",
					},
					gross: "1000",
					statutoryProfile: profile({ dependantCount: 2 }),
					yearToDate: { taxableBase: "2000" },
				}),
			).employeeAmount,
		).toBe("130");
	});

	it("withholds nothing while the relief-adjusted cumulative base stays inside the zero bracket", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "my.pcb.v1",
						baseKind: "taxable",
						basis: "cumulative",
						brackets: [
							{ fromInclusive: "0", toExclusive: "1000", rate: "0" },
							{ fromInclusive: "1000", toExclusive: null, rate: "0.1" },
						],
						personalRelief: "500",
					},
					gross: "400",
					yearToDate: { taxableBase: "1000" },
				}),
			).employeeAmount,
		).toBe("0");
	});
});

describe("vn.pit.v1 withholds on a period basis with period reliefs", () => {
	/**
	 *   chargeable = 20,000,000 − (5,000,000 + 1 × 2,000,000) = 13,000,000
	 *   tax        = 0.05 × 5,000,000 + 0.10 × 5,000,000 + 0.15 × 3,000,000
	 *              = 250,000 + 500,000 + 450,000 = 1,200,000
	 */
	it("taxes this period's relieved base alone → 1,200,000", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "vn.pit.v1",
						baseKind: "taxable",
						basis: "period",
						brackets: [
							{ fromInclusive: "0", toExclusive: "5000000", rate: "0.05" },
							{
								fromInclusive: "5000000",
								toExclusive: "10000000",
								rate: "0.1",
							},
							{ fromInclusive: "10000000", toExclusive: null, rate: "0.15" },
						],
						personalRelief: "5000000",
						dependantRelief: "2000000",
					},
					currencyCode: "VND",
					gross: "20000000",
					jurisdictionCode: "VN",
					statutoryProfile: profile({
						dependantCount: 1,
						jurisdictionCode: "VN",
						nationalityCountryCode: "VN",
					}),
					// A period basis ignores the year to date entirely.
					yearToDate: { taxableBase: "40000000" },
				}),
			).employeeAmount,
		).toBe("1200000");
	});

	it("applies the flat non-resident rate: 20,000,000 × 0.2 = 4,000,000", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: {
						calculatorId: "vn.pit.v1",
						baseKind: "taxable",
						basis: "period",
						brackets: [{ fromInclusive: "0", toExclusive: null, rate: "0.05" }],
						nonResidentRate: "0.2",
					},
					currencyCode: "VND",
					gross: "20000000",
					jurisdictionCode: "VN",
					statutoryProfile: profile({
						expatriate: true,
						jurisdictionCode: "VN",
						nationalityCountryCode: "US",
						taxResidencyStatus: "non_resident",
					}),
				}),
			).employeeAmount,
		).toBe("4000000");
	});

	it("refuses a non-resident subject when the pack declares no nonResidentRate", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: {
						calculatorId: "vn.pit.v1",
						baseKind: "taxable",
						basis: "period",
						brackets: [{ fromInclusive: "0", toExclusive: null, rate: "0.05" }],
					},
					currencyCode: "VND",
					gross: "20000000",
					jurisdictionCode: "VN",
					statutoryProfile: profile({
						jurisdictionCode: "VN",
						nationalityCountryCode: "US",
						taxResidencyStatus: "non_resident",
					}),
				}),
			),
		).toContain("declares no nonResidentRate");
	});
});

describe("Vietnam contribution packs bound the base by zone", () => {
	function vnConfig(overrides: PayrollJsonObject): PayrollJsonObject {
		return {
			calculatorId: "vn.ui.v1",
			baseKind: "gross",
			employeeRate: "0.08",
			employerRate: "0.175",
			...overrides,
		};
	}

	function vnProfile(
		zone: "I" | "II" | "III" | "IV" | null,
	): HandoffStatutoryProfile {
		return profile({
			jurisdictionCode: "VN",
			minimumWageZone: zone,
			nationalityCountryCode: "VN",
		});
	}

	it("raises a sub-floor wage to the subject's zone minimum: 1000 → 3000, × 0.08 = 240", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: vnConfig({
						zoneMinimumBase: { I: "3000", II: "2500", III: "2000", IV: "1800" },
					}),
					currencyCode: "VND",
					gross: "1000",
					jurisdictionCode: "VN",
					statutoryProfile: vnProfile("I"),
				}),
			),
		).toEqual({
			baseAmount: "3000",
			employeeAmount: "240",
			employerAmount: "525",
		});
	});

	it("caps at the zone ceiling in preference to the national scalar: min(10000, 4000) × 0.08 = 320", () => {
		expect(
			soleStatutoryResult(
				runPack({
					configJson: vnConfig({
						maximumBase: "9000",
						zoneMaximumBase: { I: "4000", II: "3500" },
					}),
					currencyCode: "VND",
					gross: "10000",
					jurisdictionCode: "VN",
					statutoryProfile: vnProfile("I"),
				}),
			),
		).toEqual({
			baseAmount: "4000",
			employeeAmount: "320",
			employerAmount: "700",
		});
	});

	it("refuses when the zone table prices no amount for the subject's own zone", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: vnConfig({ zoneMaximumBase: { II: "3500" } }),
					currencyCode: "VND",
					gross: "10000",
					jurisdictionCode: "VN",
					statutoryProfile: vnProfile("I"),
				}),
			),
		).toContain("no amount for zone I");
	});

	it("refuses when a zone table is configured and the subject carries no zone", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: vnConfig({ zoneMinimumBase: { I: "3000" } }),
					currencyCode: "VND",
					gross: "10000",
					jurisdictionCode: "VN",
					statutoryProfile: vnProfile(null),
				}),
			),
		).toContain("carries no minimum-wage zone");
	});
});

describe("pack config is rejected at parse with the offending issue named", () => {
	function epfConfig(bands: unknown): PayrollJsonObject {
		return {
			calculatorId: "my.epf.v1",
			baseKind: "gross",
			bands,
		} as PayrollJsonObject;
	}

	it("names the overlapping band rows", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: epfConfig([
						{
							wageFromInclusive: "0",
							wageToExclusive: "5000",
							employeeAmount: "1",
							employerAmount: "1",
						},
						{
							wageFromInclusive: "4000",
							wageToExclusive: null,
							employeeAmount: "2",
							employerAmount: "2",
						},
					]),
				}),
			),
		).toContain("overlap");
	});

	it("names the gap between band rows", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: epfConfig([
						{
							wageFromInclusive: "0",
							wageToExclusive: "5000",
							employeeAmount: "1",
							employerAmount: "1",
						},
						{
							wageFromInclusive: "6000",
							wageToExclusive: null,
							employeeAmount: "2",
							employerAmount: "2",
						},
					]),
				}),
			),
		).toContain("gap");
	});

	it("rejects a table that leaves the highest wages unpriced", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: epfConfig([
						{
							wageFromInclusive: "0",
							wageToExclusive: "5000",
							employeeAmount: "1",
							employerAmount: "1",
						},
					]),
				}),
			),
		).toContain("unpriced");
	});

	it("rejects a negative contribution amount", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: epfConfig([
						{
							wageFromInclusive: "0",
							wageToExclusive: null,
							employeeAmount: "-1",
							employerAmount: "1",
						},
					]),
				}),
			),
		).toContain("non-negative");
	});

	it("rejects a negative wage ceiling", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: {
						calculatorId: "my.eis.v1",
						baseKind: "gross",
						employeeRate: "0.002",
						employerRate: "0.002",
						wageCeiling: "-4000",
					},
				}),
			),
		).toContain("non-negative");
	});

	it("refuses a config whose calculatorId names a different pack", () => {
		// Only reachable by a direct call, because the dispatcher routes on the
		// same key. The literal is the pack's guarantee that its schema and the
		// routing key can never disagree.
		expect(() =>
			getStatutoryCalculator("my.epf.v1").calculate({
				configJson: {
					calculatorId: "my.socso.v1",
					baseKind: "gross",
					bands: [
						{
							wageFromInclusive: "0",
							wageToExclusive: null,
							employeeAmount: "1",
							employerAmount: "1",
						},
					],
				},
				currencyCode: "MYR",
				finalPeriod: false,
				gross: 0n,
				jurisdictionCode: "MY",
				periodOrdinal: null,
				periodsPerYear: null,
				roundingPolicy: { scale: 2, mode: "half_even" },
				ruleCode: "PACK",
				ruleVersion: "1",
				statutoryProfile: null,
				taxableBase: 0n,
				yearToDate: {
					currencyCode: "MYR",
					employeeStatutory: "0",
					employerStatutory: "0",
					gross: "0",
					taxWithheld: "0",
					taxYear: 2025,
					taxableBase: "0",
				},
			}),
		).toThrow(/calculatorId/);
	});

	it("refuses a pack asked to price a rule filed under another jurisdiction", () => {
		expect(
			refusalMessage(
				runPack({
					configJson: {
						calculatorId: "my.epf.v1",
						baseKind: "gross",
						bands: [
							{
								wageFromInclusive: "0",
								wageToExclusive: null,
								employeeAmount: "550",
								employerAmount: "650",
							},
						],
					},
					jurisdictionCode: "VN",
					statutoryProfile: profile({ jurisdictionCode: "VN" }),
				}),
			),
		).toContain("authored for MY");
	});
});

describe("a lapsed statutory configuration blocks the run", () => {
	it("refuses a subject whose declared jurisdiction resolved no active rule", () => {
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				statutoryProfile: profile({ jurisdictionCode: "MY" }),
				statutoryRules: [],
			}),
		);
		expect(output.statutoryResults).toEqual([]);
		expect(output.exceptions).toEqual([
			{
				exceptionCode: "MISSING_STATUTORY_RULES",
				message:
					"No active statutory rule resolved for jurisdiction MY in this period",
				severity: "blocking",
				sourceRef: "emp-synth-001",
			},
		]);
	});

	it("leaves a synthetic snapshot with no statutory profile alone", () => {
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({ statutoryRules: [] }),
		);
		expect(output.exceptions).toEqual([]);
	});
});

describe("period cadence is classified from the whole tax-year sequence", () => {
	const monthly2026 = [
		{ periodStart: "2026-01-01", periodEnd: "2026-01-31" },
		{ periodStart: "2026-02-01", periodEnd: "2026-02-28" },
		{ periodStart: "2026-03-01", periodEnd: "2026-03-31" },
	];

	function cadence(periodStart: string, taxYearPeriods: typeof monthly2026) {
		const resolved = resolveTaxYearCadence({ periodStart, taxYearPeriods });
		if (!resolved.ok) {
			throw new Error(`${resolved.code}: ${resolved.message}`);
		}
		return resolved.data;
	}

	function refusal(periodStart: string, taxYearPeriods: typeof monthly2026) {
		const resolved = resolveTaxYearCadence({ periodStart, taxYearPeriods });
		if (resolved.ok) {
			throw new Error(
				`expected a refusal, got ${JSON.stringify(resolved.data)}`,
			);
		}
		return resolved;
	}

	it("reads a 28-day February as the second of TWELVE monthly periods, never thirteen", () => {
		expect(cadence("2026-02-01", monthly2026)).toEqual({
			periodOrdinal: 2,
			periodsPerYear: 12,
		});
	});

	it("reads a 31-day January and a 30-day April as the same monthly twelve", () => {
		expect(cadence("2026-01-01", monthly2026).periodsPerYear).toBe(12);
		expect(
			cadence("2026-03-01", [
				...monthly2026,
				{ periodStart: "2026-04-01", periodEnd: "2026-04-30" },
			]).periodsPerYear,
		).toBe(12);
	});

	it("reads semimonthly halves of 13, 15, and 16 days as twenty-four", () => {
		const semimonthly = [
			{ periodStart: "2026-01-01", periodEnd: "2026-01-15" },
			{ periodStart: "2026-01-16", periodEnd: "2026-01-31" },
			{ periodStart: "2026-02-01", periodEnd: "2026-02-15" },
			{ periodStart: "2026-02-16", periodEnd: "2026-02-28" },
		];
		// First half of a 31-day month is 15 days, second half 16; February's
		// second half is 13. All three are one cadence.
		expect(cadence("2026-01-01", semimonthly)).toEqual({
			periodOrdinal: 1,
			periodsPerYear: 24,
		});
		expect(cadence("2026-01-16", semimonthly)).toEqual({
			periodOrdinal: 2,
			periodsPerYear: 24,
		});
		expect(cadence("2026-02-16", semimonthly)).toEqual({
			periodOrdinal: 4,
			periodsPerYear: 24,
		});
	});

	it("separates biweekly from semimonthly by every period being exactly fourteen days", () => {
		const biweekly = [
			{ periodStart: "2026-01-01", periodEnd: "2026-01-14" },
			{ periodStart: "2026-01-15", periodEnd: "2026-01-28" },
		];
		expect(cadence("2026-01-15", biweekly)).toEqual({
			periodOrdinal: 2,
			periodsPerYear: 26,
		});
	});

	it("reads seven-day periods as fifty-two", () => {
		const weekly = [
			{ periodStart: "2026-01-01", periodEnd: "2026-01-07" },
			{ periodStart: "2026-01-08", periodEnd: "2026-01-14" },
		];
		expect(cadence("2026-01-08", weekly)).toEqual({
			periodOrdinal: 2,
			periodsPerYear: 52,
		});
	});

	it("refuses a pay calendar whose periods match no cadence rather than picking a number", () => {
		expect(
			refusal("2026-02-01", [
				{ periodStart: "2026-01-01", periodEnd: "2026-01-31" },
				{ periodStart: "2026-02-01", periodEnd: "2026-02-10" },
			]).code,
		).toBe("CONFLICT");
	});

	it("refuses a sequence that runs past the cadence it claims", () => {
		const thirteenMonths = Array.from({ length: 13 }, (_, index) => {
			const month = String(index + 1).padStart(2, "0");
			return index < 12
				? { periodStart: `2026-${month}-01`, periodEnd: `2026-${month}-28` }
				: { periodStart: "2026-12-29", periodEnd: "2026-12-31" };
		});
		expect(refusal("2026-12-29", thirteenMonths).code).toBe("CONFLICT");
	});

	it("refuses when the period is absent from its own tax year's sequence", () => {
		expect(refusal("2026-06-01", monthly2026).code).toBe("CONFLICT");
	});

	it("refuses a tax year with no periods at all", () => {
		expect(classifyPeriodsPerYear([]).ok).toBe(false);
	});
});
