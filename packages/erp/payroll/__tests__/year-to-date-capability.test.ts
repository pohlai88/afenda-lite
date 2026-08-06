import { errorResult } from "@afenda/errors";
import type { HandoffPriorEmployerYtd } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import {
	createPayrollHistoryYearToDateCapability,
	resolveYearToDate,
} from "../src/features/statutory-rules/year-to-date-capability";
import type {
	PayrollPeriod,
	PayrollResultLine,
	PayrollRun,
	PayrollStatutoryResult,
} from "../src/kernel/contracts/projected-types";
import type { PayrollYearToDateTotals } from "../src/kernel/execution/capability-ports";
import {
	addScaled,
	formatScaledToDecimal,
	parseDecimalToScaled,
	subScaled,
} from "../src/kernel/money/money";

const ORGANIZATION_ID = "org-ytd";
const EMPLOYEE_ID = "emp-ytd";
const JANUARY_PERIOD_ID = "11111111-1111-4111-8111-111111111111";
const FEBRUARY_PERIOD_ID = "22222222-2222-4222-8222-222222222222";
const PRIOR_YEAR_PERIOD_ID = "33333333-3333-4333-8333-333333333333";
const JANUARY_RUN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FEBRUARY_RUN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRIOR_YEAR_RUN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MARCH_PERIOD_ID = "55555555-5555-4555-8555-555555555555";
const MARCH_RUN_ID = "66666666-6666-4666-8666-666666666666";

/**
 * The retired per-run fan-out, reproduced in the test as the reference the
 * batched capability must still agree with: one summation per finalized run,
 * merged field by field, then the hire-year prior-employer merge.
 */
function perRunFanOutTotals(input: {
	currencyCode: string;
	employeeId: string;
	linesByRun: ReadonlyMap<string, readonly PayrollResultLine[]>;
	priorEmployerYtd: readonly HandoffPriorEmployerYtd[];
	runIds: readonly string[];
	statutoryByRun: ReadonlyMap<string, readonly PayrollStatutoryResult[]>;
	taxYear: number;
}): PayrollYearToDateTotals {
	let gross = 0n;
	let taxableBase = 0n;
	let employeeStatutory = 0n;
	let employerStatutory = 0n;
	let taxWithheld = 0n;

	for (const runId of input.runIds) {
		let runGross = 0n;
		let runPreTax = 0n;
		for (const line of input.linesByRun.get(runId) ?? []) {
			if (line.employeeId !== input.employeeId) {
				continue;
			}
			const amount = parseDecimalToScaled(line.amount);
			if (line.lineKind === "earning") {
				runGross = addScaled(runGross, amount);
			}
			if (line.lineKind === "pre_tax_deduction") {
				runPreTax = addScaled(runPreTax, amount);
			}
		}
		for (const result of input.statutoryByRun.get(runId) ?? []) {
			if (result.employeeId !== input.employeeId) {
				continue;
			}
			// This fixture's statutory history is all `synth.v1`, a contribution
			// pack, so none of it reaches the tax channel.
			employeeStatutory = addScaled(
				employeeStatutory,
				parseDecimalToScaled(result.employeeAmount),
			);
			employerStatutory = addScaled(
				employerStatutory,
				parseDecimalToScaled(result.employerAmount),
			);
		}
		gross = addScaled(gross, runGross);
		taxableBase = addScaled(taxableBase, subScaled(runGross, runPreTax));
	}

	for (const record of input.priorEmployerYtd) {
		if (record.taxYear !== input.taxYear) {
			continue;
		}
		const priorGross = parseDecimalToScaled(record.grossAmount);
		gross = addScaled(gross, priorGross);
		taxableBase = addScaled(taxableBase, priorGross);
		employeeStatutory = addScaled(
			employeeStatutory,
			parseDecimalToScaled(record.statutoryContributionAmount),
		);
		taxWithheld = addScaled(
			taxWithheld,
			parseDecimalToScaled(record.taxWithheldAmount),
		);
	}

	return {
		currencyCode: input.currencyCode,
		employeeStatutory: formatScaledToDecimal(employeeStatutory),
		employerStatutory: formatScaledToDecimal(employerStatutory),
		gross: formatScaledToDecimal(gross),
		taxWithheld: formatScaledToDecimal(taxWithheld),
		taxYear: input.taxYear,
		taxableBase: formatScaledToDecimal(taxableBase),
	};
}

function period(input: {
	id: string;
	periodEnd: string;
	periodStart: string;
}): PayrollPeriod {
	return {
		createdAt: new Date("2025-01-01T00:00:00.000Z"),
		createdBy: "actor-ytd",
		cutoffDate: input.periodEnd,
		id: input.id as PayrollPeriod["id"],
		organizationId: ORGANIZATION_ID,
		payGroupId:
			"44444444-4444-4444-8444-444444444444" as PayrollPeriod["payGroupId"],
		periodEnd: input.periodEnd,
		periodStart: input.periodStart,
		status: "closed",
		updatedAt: new Date("2025-01-01T00:00:00.000Z"),
		updatedBy: "actor-ytd",
		version: 1,
	};
}

function run(input: {
	id: string;
	periodId: string;
	status: PayrollRun["status"];
}): PayrollRun {
	return {
		calculationSnapshotHash: "hash",
		calculationVersion: "1",
		createdAt: new Date("2025-01-01T00:00:00.000Z"),
		createdBy: "actor-ytd",
		finalizedAt:
			input.status === "finalized"
				? new Date("2025-01-31T00:00:00.000Z")
				: null,
		finalizedBy: input.status === "finalized" ? "actor-ytd" : null,
		id: input.id as PayrollRun["id"],
		organizationId: ORGANIZATION_ID,
		payGroupId:
			"44444444-4444-4444-8444-444444444444" as PayrollRun["payGroupId"],
		periodId: input.periodId as PayrollRun["periodId"],
		reversalIdempotencyKey: null,
		reversalReasonCode: null,
		reversalRequestFingerprint: null,
		roundingPolicyJson: null,
		runType: "regular",
		sequence: 1,
		status: input.status,
		updatedAt: new Date("2025-01-01T00:00:00.000Z"),
		updatedBy: "actor-ytd",
		version: 1,
	};
}

function earning(input: {
	amount: string;
	currencyCode?: string;
	employeeId?: string;
	lineKind?: PayrollResultLine["lineKind"];
	runId: string;
}): PayrollResultLine {
	return {
		amount: input.amount,
		code: "BASE",
		createdAt: new Date("2025-01-01T00:00:00.000Z"),
		currencyCode: input.currencyCode ?? "USD",
		employeeId: input.employeeId ?? EMPLOYEE_ID,
		id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" as PayrollResultLine["id"],
		lineKind: input.lineKind ?? "earning",
		organizationId: ORGANIZATION_ID,
		ruleCode: "BASE",
		ruleKind: "earning",
		ruleVersion: "1",
		runEmployeeId:
			"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" as PayrollResultLine["runEmployeeId"],
		runId: input.runId as PayrollResultLine["runId"],
		sequence: 1,
		sourceId: null,
		sourceType: null,
		traceRef: "trace-ytd",
		updatedAt: new Date("2025-01-01T00:00:00.000Z"),
	};
}

function priorEmployer(input: {
	currencyCode?: string;
	grossAmount: string;
	statutoryContributionAmount?: string;
	taxWithheldAmount?: string;
	taxYear?: number;
}): HandoffPriorEmployerYtd {
	return {
		currencyCode: input.currencyCode ?? "USD",
		grossAmount: input.grossAmount,
		jurisdictionCode: "US",
		priorEmployerName: "Prior Co",
		recordedOn: "2025-01-02",
		statutoryContributionAmount: input.statutoryContributionAmount ?? "0",
		taxWithheldAmount: input.taxWithheldAmount ?? "0",
		taxYear: input.taxYear ?? 2025,
	};
}

function statutory(input: {
	employeeAmount: string;
	employerAmount: string;
	runId: string;
}): PayrollStatutoryResult {
	return {
		baseAmount: "3100",
		calculatorId: "synth.v1",
		configSnapshotJson: {},
		createdAt: new Date("2025-01-01T00:00:00.000Z"),
		currencyCode: "USD",
		employeeAmount: input.employeeAmount,
		employeeId: EMPLOYEE_ID,
		employerAmount: input.employerAmount,
		id: "ffffffff-ffff-4fff-8fff-ffffffffffff" as PayrollStatutoryResult["id"],
		jurisdictionCode: "SYNTH",
		organizationId: ORGANIZATION_ID,
		ruleCode: "SYNTH_TAX",
		ruleVersion: "1",
		runEmployeeId:
			"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" as PayrollStatutoryResult["runEmployeeId"],
		runId: input.runId as PayrollStatutoryResult["runId"],
		updatedAt: new Date("2025-01-01T00:00:00.000Z"),
	};
}

describe("createPayrollHistoryYearToDateCapability", () => {
	it("sums finalized same-year history strictly before throughDate", async () => {
		const capability = createPayrollHistoryYearToDateCapability({
			listPeriodsForOrganization: () =>
				errorResult.ok([
					period({
						id: JANUARY_PERIOD_ID,
						periodEnd: "2025-01-31",
						periodStart: "2025-01-01",
					}),
					period({
						id: FEBRUARY_PERIOD_ID,
						periodEnd: "2025-02-28",
						periodStart: "2025-02-01",
					}),
					period({
						id: PRIOR_YEAR_PERIOD_ID,
						periodEnd: "2024-12-31",
						periodStart: "2024-12-01",
					}),
				]),
			listRunsForPeriod: ({ periodId }) => {
				if (periodId === JANUARY_PERIOD_ID) {
					return errorResult.ok([
						run({
							id: JANUARY_RUN_ID,
							periodId,
							status: "finalized",
						}),
					]);
				}
				if (periodId === FEBRUARY_PERIOD_ID) {
					return errorResult.ok([
						run({
							id: FEBRUARY_RUN_ID,
							periodId,
							status: "finalized",
						}),
					]);
				}
				return errorResult.ok([
					run({
						id: PRIOR_YEAR_RUN_ID,
						periodId,
						status: "finalized",
					}),
				]);
			},
			listResultLinesForEmployeeRuns: ({ employeeId, runIds }) => {
				const lines: PayrollResultLine[] = [];
				for (const runId of runIds) {
					if (runId === JANUARY_RUN_ID) {
						lines.push(
							earning({ amount: "3100", runId }),
							earning({
								amount: "100",
								lineKind: "pre_tax_deduction",
								runId,
							}),
							earning({
								amount: "500",
								employeeId: "emp-other",
								runId,
							}),
						);
						continue;
					}
					lines.push(earning({ amount: "4000", runId }));
				}
				return errorResult.ok(
					lines.filter((line) => line.employeeId === employeeId),
				);
			},
			listStatutoryResultsForEmployeeRuns: ({ employeeId, runIds }) => {
				const results: PayrollStatutoryResult[] = [];
				for (const runId of runIds) {
					if (runId === JANUARY_RUN_ID) {
						results.push(
							statutory({
								employeeAmount: "80",
								employerAmount: "40",
								runId,
							}),
						);
						continue;
					}
					results.push(
						statutory({
							employeeAmount: "90",
							employerAmount: "45",
							runId,
						}),
					);
				}
				return errorResult.ok(
					results.filter((result) => result.employeeId === employeeId),
				);
			},
		});

		const totals = await capability.employeeTotals({
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
			priorEmployerYtd: [],
			taxYear: 2025,
			throughDate: "2025-02-15",
		});

		expect(totals.ok).toBe(true);
		if (!totals.ok) {
			return;
		}
		expect(totals.data).toEqual({
			currencyCode: "USD",
			employeeStatutory: "80",
			employerStatutory: "40",
			gross: "3100",
			taxWithheld: "0",
			taxYear: 2025,
			taxableBase: "3000",
		});
	});

	it("ignores draft runs even when the period is eligible", async () => {
		const capability = createPayrollHistoryYearToDateCapability({
			listPeriodsForOrganization: () =>
				errorResult.ok([
					period({
						id: JANUARY_PERIOD_ID,
						periodEnd: "2025-01-31",
						periodStart: "2025-01-01",
					}),
				]),
			listRunsForPeriod: () =>
				errorResult.ok([
					run({
						id: JANUARY_RUN_ID,
						periodId: JANUARY_PERIOD_ID,
						status: "calculated",
					}),
				]),
			listResultLinesForEmployeeRuns: () =>
				errorResult.ok([earning({ amount: "3100", runId: JANUARY_RUN_ID })]),
			listStatutoryResultsForEmployeeRuns: () => errorResult.ok([]),
		});

		const totals = await capability.employeeTotals({
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
			priorEmployerYtd: [],
			taxYear: 2025,
			throughDate: "2025-02-01",
		});

		expect(totals.ok).toBe(true);
		if (!totals.ok) {
			return;
		}
		expect(totals.data).toEqual({
			currencyCode: "USD",
			employeeStatutory: "0",
			employerStatutory: "0",
			gross: "0",
			taxWithheld: "0",
			taxYear: 2025,
			taxableBase: "0",
		});
	});

	it("refuses a cross-currency finalized result line", async () => {
		const capability = createPayrollHistoryYearToDateCapability({
			listPeriodsForOrganization: () =>
				errorResult.ok([
					period({
						id: JANUARY_PERIOD_ID,
						periodEnd: "2025-01-31",
						periodStart: "2025-01-01",
					}),
				]),
			listRunsForPeriod: () =>
				errorResult.ok([
					run({
						id: JANUARY_RUN_ID,
						periodId: JANUARY_PERIOD_ID,
						status: "finalized",
					}),
				]),
			listResultLinesForEmployeeRuns: () =>
				errorResult.ok([
					earning({ amount: "3100", runId: JANUARY_RUN_ID }),
					earning({
						amount: "9999",
						currencyCode: "MYR",
						runId: JANUARY_RUN_ID,
					}),
				]),
			listStatutoryResultsForEmployeeRuns: () => errorResult.ok([]),
		});

		const totals = await capability.employeeTotals({
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
			priorEmployerYtd: [],
			taxYear: 2025,
			throughDate: "2025-02-01",
		});

		expect(totals.ok).toBe(false);
		if (!totals.ok) {
			expect(totals.code).toBe("CONFLICT");
		}
	});

	it("merges same-year prior-employer figures into one hire-year total", async () => {
		const capability = createPayrollHistoryYearToDateCapability({
			listPeriodsForOrganization: () =>
				errorResult.ok([
					period({
						id: JANUARY_PERIOD_ID,
						periodEnd: "2025-01-31",
						periodStart: "2025-01-01",
					}),
				]),
			listRunsForPeriod: () =>
				errorResult.ok([
					run({
						id: JANUARY_RUN_ID,
						periodId: JANUARY_PERIOD_ID,
						status: "finalized",
					}),
				]),
			listResultLinesForEmployeeRuns: () =>
				errorResult.ok([
					earning({ amount: "3100", runId: JANUARY_RUN_ID }),
					earning({
						amount: "100",
						lineKind: "pre_tax_deduction",
						runId: JANUARY_RUN_ID,
					}),
				]),
			listStatutoryResultsForEmployeeRuns: () =>
				errorResult.ok([
					statutory({
						employeeAmount: "80",
						employerAmount: "40",
						runId: JANUARY_RUN_ID,
					}),
				]),
		});

		const totals = await capability.employeeTotals({
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
			priorEmployerYtd: [
				priorEmployer({
					grossAmount: "1000",
					statutoryContributionAmount: "50",
					taxWithheldAmount: "30",
				}),
				priorEmployer({
					grossAmount: "5000",
					statutoryContributionAmount: "200",
					taxWithheldAmount: "100",
					taxYear: 2024,
				}),
			],
			taxYear: 2025,
			throughDate: "2025-02-01",
		});

		expect(totals.ok).toBe(true);
		if (!totals.ok) {
			return;
		}
		expect(totals.data).toEqual({
			currencyCode: "USD",
			employeeStatutory: "130",
			employerStatutory: "40",
			gross: "4100",
			taxWithheld: "30",
			taxYear: 2025,
			taxableBase: "4000",
		});
	});

	it("returns the per-run fan-out totals from two batched reads", async () => {
		// The retired shape summed each finalized run separately (N x 2 store
		// reads). The batched shape must agree with it exactly, and must issue one
		// result-line read plus one statutory read no matter how many runs qualify.
		const periods = [
			{
				id: JANUARY_PERIOD_ID,
				periodEnd: "2025-01-31",
				periodStart: "2025-01-01",
				runId: JANUARY_RUN_ID,
			},
			{
				id: FEBRUARY_PERIOD_ID,
				periodEnd: "2025-02-28",
				periodStart: "2025-02-01",
				runId: FEBRUARY_RUN_ID,
			},
			{
				id: MARCH_PERIOD_ID,
				periodEnd: "2025-03-31",
				periodStart: "2025-03-01",
				runId: MARCH_RUN_ID,
			},
		] as const;
		const linesByRun = new Map<string, PayrollResultLine[]>([
			[
				JANUARY_RUN_ID,
				[
					earning({ amount: "3100.55", runId: JANUARY_RUN_ID }),
					earning({
						amount: "100.05",
						lineKind: "pre_tax_deduction",
						runId: JANUARY_RUN_ID,
					}),
					earning({
						amount: "777",
						employeeId: "emp-other",
						runId: JANUARY_RUN_ID,
					}),
				],
			],
			[
				FEBRUARY_RUN_ID,
				[
					earning({ amount: "4000.45", runId: FEBRUARY_RUN_ID }),
					earning({
						amount: "250.95",
						lineKind: "pre_tax_deduction",
						runId: FEBRUARY_RUN_ID,
					}),
				],
			],
			[MARCH_RUN_ID, [earning({ amount: "1234.56", runId: MARCH_RUN_ID })]],
		]);
		const statutoryByRun = new Map<string, PayrollStatutoryResult[]>([
			[
				JANUARY_RUN_ID,
				[
					statutory({
						employeeAmount: "80.10",
						employerAmount: "40.05",
						runId: JANUARY_RUN_ID,
					}),
				],
			],
			[
				FEBRUARY_RUN_ID,
				[
					statutory({
						employeeAmount: "90.90",
						employerAmount: "45.95",
						runId: FEBRUARY_RUN_ID,
					}),
				],
			],
			[
				MARCH_RUN_ID,
				[
					statutory({
						employeeAmount: "12.34",
						employerAmount: "5.66",
						runId: MARCH_RUN_ID,
					}),
				],
			],
		]);

		const listPeriodsForOrganization = () =>
			errorResult.ok(
				periods.map((entry) =>
					period({
						id: entry.id,
						periodEnd: entry.periodEnd,
						periodStart: entry.periodStart,
					}),
				),
			);
		const listRunsForPeriod = ({ periodId }: { periodId: string }) => {
			const entry = periods.find((candidate) => candidate.id === periodId);
			if (entry === undefined) {
				return errorResult.ok([]);
			}
			return errorResult.ok([
				run({ id: entry.runId, periodId, status: "finalized" }),
			]);
		};

		let resultLineReads = 0;
		let statutoryReads = 0;
		const batched = createPayrollHistoryYearToDateCapability({
			listPeriodsForOrganization,
			listRunsForPeriod,
			listResultLinesForEmployeeRuns: ({ employeeId, runIds }) => {
				resultLineReads += 1;
				return errorResult.ok(
					runIds
						.flatMap((runId) => linesByRun.get(runId) ?? [])
						.filter((line) => line.employeeId === employeeId),
				);
			},
			listStatutoryResultsForEmployeeRuns: ({ employeeId, runIds }) => {
				statutoryReads += 1;
				return errorResult.ok(
					runIds
						.flatMap((runId) => statutoryByRun.get(runId) ?? [])
						.filter((result) => result.employeeId === employeeId),
				);
			},
		});

		const request = {
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
			priorEmployerYtd: [
				priorEmployer({
					grossAmount: "1000",
					statutoryContributionAmount: "50",
					taxWithheldAmount: "30",
				}),
			],
			taxYear: 2025,
			throughDate: "2025-04-01",
		};

		const totals = await batched.employeeTotals(request);
		expect(totals.ok).toBe(true);
		if (!totals.ok) {
			return;
		}

		// One read per store method for three finalized runs — the fan-out is gone.
		expect(resultLineReads).toBe(1);
		expect(statutoryReads).toBe(1);

		expect(totals.data).toEqual(
			perRunFanOutTotals({
				currencyCode: request.currencyCode,
				employeeId: request.employeeId,
				linesByRun,
				priorEmployerYtd: request.priorEmployerYtd,
				runIds: periods.map((entry) => entry.runId),
				statutoryByRun,
				taxYear: request.taxYear,
			}),
		);
	});

	it("refuses a cross-currency prior-employer record", async () => {
		const capability = createPayrollHistoryYearToDateCapability({
			listPeriodsForOrganization: () => errorResult.ok([]),
			listRunsForPeriod: () => errorResult.ok([]),
			listResultLinesForEmployeeRuns: () => errorResult.ok([]),
			listStatutoryResultsForEmployeeRuns: () => errorResult.ok([]),
		});

		const totals = await capability.employeeTotals({
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
			priorEmployerYtd: [
				priorEmployer({
					currencyCode: "MYR",
					grossAmount: "1000",
				}),
			],
			taxYear: 2025,
			throughDate: "2025-02-01",
		});

		expect(totals.ok).toBe(false);
		if (!totals.ok) {
			expect(totals.code).toBe("CONFLICT");
		}
	});
});

describe("resolveYearToDate", () => {
	it("refuses when the year-to-date capability is not composed", async () => {
		const totals = await resolveYearToDate({
			capability: undefined,
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
			priorEmployerYtd: [],
			taxYear: 2025,
			throughDate: "2025-02-01",
		});

		expect(totals.ok).toBe(false);
		if (!totals.ok) {
			expect(totals.code).toBe("CONFLICT");
			expect(totals.message).toContain("not composed");
		}
	});
});
