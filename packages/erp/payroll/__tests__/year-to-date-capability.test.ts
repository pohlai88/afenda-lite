import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";
import { createPayrollHistoryYearToDateCapability } from "../src/features/statutory-rules/year-to-date-capability";
import type {
	PayrollPeriod,
	PayrollResultLine,
	PayrollRun,
	PayrollStatutoryResult,
} from "../src/kernel/contracts/projected-types";

const ORGANIZATION_ID = "org-ytd";
const EMPLOYEE_ID = "emp-ytd";
const JANUARY_PERIOD_ID = "11111111-1111-4111-8111-111111111111";
const FEBRUARY_PERIOD_ID = "22222222-2222-4222-8222-222222222222";
const PRIOR_YEAR_PERIOD_ID = "33333333-3333-4333-8333-333333333333";
const JANUARY_RUN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FEBRUARY_RUN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRIOR_YEAR_RUN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

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
			listResultLinesForRun: ({ runId }) => {
				if (runId === JANUARY_RUN_ID) {
					return errorResult.ok([
						earning({ amount: "3100", runId }),
						earning({
							amount: "100",
							lineKind: "pre_tax_deduction",
							runId,
						}),
						earning({
							amount: "9999",
							currencyCode: "MYR",
							runId,
						}),
						earning({
							amount: "500",
							employeeId: "emp-other",
							runId,
						}),
					]);
				}
				return errorResult.ok([earning({ amount: "4000", runId })]);
			},
			listStatutoryResultsForRun: ({ runId }) => {
				if (runId === JANUARY_RUN_ID) {
					return errorResult.ok([
						statutory({
							employeeAmount: "80",
							employerAmount: "40",
							runId,
						}),
					]);
				}
				return errorResult.ok([
					statutory({
						employeeAmount: "90",
						employerAmount: "45",
						runId,
					}),
				]);
			},
		});

		const totals = await capability.employeeTotals({
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
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
			listResultLinesForRun: () =>
				errorResult.ok([earning({ amount: "3100", runId: JANUARY_RUN_ID })]),
			listStatutoryResultsForRun: () => errorResult.ok([]),
		});

		const totals = await capability.employeeTotals({
			currencyCode: "USD",
			employeeId: EMPLOYEE_ID,
			organizationId: ORGANIZATION_ID,
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
			taxYear: 2025,
			taxableBase: "0",
		});
	});
});
