import { describe, expect, it } from "vitest";
import { calculateEmployeePayroll } from "../src/features/calculation/calculation";
import { normalizePayrollWorkforceHandoff } from "../src/features/workforce-ingress/normalize-workforce-handoff";
import { HANDOFF_FIXTURE_P8 } from "./fixtures/approved-payroll-handoff-fixtures";
import { buildSyntheticCalcSnapshot } from "./helpers/calc-snapshot";

const EXPECTED_HANDOFF = {
	organizationId: "org-synth-handoff",
	employeeId: "emp-synth-handoff",
	effectiveDate: "2025-01-01",
	periodStart: "2025-01-01",
	periodEnd: "2025-01-31",
} as const;

describe("approved workforce handoff cutover", () => {
	it("normalizes the full approved contract inside Payroll", () => {
		const result = normalizePayrollWorkforceHandoff(
			HANDOFF_FIXTURE_P8,
			EXPECTED_HANDOFF,
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.baseCompensation).toBe("85000");
		expect(result.data.approvedHandoff.timeFacts?.regularMinutes).toBe(9600);
		expect(result.data.approvedHandoff.overtimeFacts).toEqual([
			expect.objectContaining({
				overtimeType: "weekday_overtime",
				approvedMinutes: 120,
			}),
		]);
	});

	it("rejects a producer payload whose tenant identity does not match", () => {
		const result = normalizePayrollWorkforceHandoff(HANDOFF_FIXTURE_P8, {
			...EXPECTED_HANDOFF,
			organizationId: "other-organization",
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
	});

	it("rejects legacy status omissions and work facts outside the payroll period", () => {
		expect(
			normalizePayrollWorkforceHandoff(
				{ ...HANDOFF_FIXTURE_P8, employmentStatus: undefined },
				EXPECTED_HANDOFF,
			).ok,
		).toBe(false);
		expect(
			normalizePayrollWorkforceHandoff(
				{
					...HANDOFF_FIXTURE_P8,
					leaveFacts: [
						{
							requestId: "leave-outside",
							policyId: "policy-outside",
							policyVersion: 1,
							paid: true,
							unit: "days",
							startDate: "2025-02-10",
							endDate: "2025-02-10",
							quantity: "1",
							segments: [],
							approvedAt: "2025-02-09T00:00:00.000Z",
							correlationId: "corr-outside",
						},
					],
				},
				EXPECTED_HANDOFF,
			).ok,
		).toBe(false);
	});

	it("rejects incomplete periods and time facts from a different period", () => {
		expect(
			normalizePayrollWorkforceHandoff(HANDOFF_FIXTURE_P8, {
				...EXPECTED_HANDOFF,
				periodEnd: undefined,
			}).ok,
		).toBe(false);
		expect(
			normalizePayrollWorkforceHandoff(
				{
					...HANDOFF_FIXTURE_P8,
					timeFacts: {
						...HANDOFF_FIXTURE_P8.timeFacts,
						periodStart: "2025-02-01",
						periodEnd: "2025-02-28",
					},
				},
				EXPECTED_HANDOFF,
			).ok,
		).toBe(false);
	});

	it("rejects overtime whose timesheet lineage disagrees with approved time", () => {
		const mismatchedTimesheet = {
			...HANDOFF_FIXTURE_P8,
			overtimeFacts: HANDOFF_FIXTURE_P8.overtimeFacts.map((fact) => ({
				...fact,
				timesheetId: "ts-other",
			})),
		};
		const mismatchedOvertimeVersion = {
			...HANDOFF_FIXTURE_P8,
			overtimeFacts: HANDOFF_FIXTURE_P8.overtimeFacts.map((fact) => ({
				...fact,
				sourceVersion: fact.sourceVersion + 1,
			})),
		};
		const mismatchedAggregateVersion = {
			...HANDOFF_FIXTURE_P8,
			sourceVersion: {
				...HANDOFF_FIXTURE_P8.sourceVersion,
				timesheetVersion:
					(HANDOFF_FIXTURE_P8.sourceVersion.timesheetVersion ?? 0) + 1,
			},
		};

		expect(
			normalizePayrollWorkforceHandoff(mismatchedTimesheet, EXPECTED_HANDOFF)
				.ok,
		).toBe(false);
		expect(
			normalizePayrollWorkforceHandoff(
				mismatchedOvertimeVersion,
				EXPECTED_HANDOFF,
			).ok,
		).toBe(false);
		expect(
			normalizePayrollWorkforceHandoff(
				mismatchedAggregateVersion,
				EXPECTED_HANDOFF,
			).ok,
		).toBe(false);
	});

	it("preserves source-owned terminated status", () => {
		const result = normalizePayrollWorkforceHandoff(
			{ ...HANDOFF_FIXTURE_P8, employmentStatus: "terminated" },
			EXPECTED_HANDOFF,
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.employmentStatus).toBe("terminated");
		}
	});

	it("blocks approved overtime until a finalized pricing rule owns it", () => {
		const baseline = buildSyntheticCalcSnapshot();
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				approvedWorkFacts: {
					...baseline.approvedWorkFacts,
					overtimeFacts: [
						{
							overtimeType: "weekday_overtime",
							approvedMinutes: 120,
							timesheetId: "timesheet-approved-1",
							sourceVersion: 3,
						},
					],
				},
			}),
		);

		expect(output.exceptions).toContainEqual(
			expect.objectContaining({
				exceptionCode: "UNPRICED_APPROVED_OVERTIME",
				severity: "blocking",
			}),
		);
	});

	it("blocks approved unpaid leave until a finalized deduction rule owns it", () => {
		const baseline = buildSyntheticCalcSnapshot();
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				approvedWorkFacts: {
					...baseline.approvedWorkFacts,
					leaveFacts: [
						{
							requestId: "leave-1",
							policyId: "policy-1",
							policyVersion: 2,
							paid: false,
							unit: "days",
							startDate: "2025-01-10",
							endDate: "2025-01-10",
							quantity: "1",
							segments: [
								{ date: "2025-01-10", quantity: "1", dayPortion: "full" },
							],
							approvedAt: "2025-01-09T00:00:00.000Z",
							correlationId: "corr-leave-1",
						},
					],
				},
			}),
		);

		expect(output.exceptions).toContainEqual(
			expect.objectContaining({
				exceptionCode: "UNPRICED_APPROVED_UNPAID_TIME",
				severity: "blocking",
			}),
		);
	});

	it("blocks unmatched employee and employer benefit contribution rules", () => {
		const baseline = buildSyntheticCalcSnapshot();
		const output = calculateEmployeePayroll(
			buildSyntheticCalcSnapshot({
				employee: {
					recurringDeductions: [{ code: "MEDICAL", amount: "25" }],
				},
				approvedWorkFacts: {
					...baseline.approvedWorkFacts,
					components: [
						{
							code: "MEDICAL",
							kind: "benefit_employee_contribution",
							amount: "25",
							currencyCode: "USD",
							decimalScale: 0,
							sourceType: "hr_benefit_enrollment",
							sourceId: "benefit-employee-1",
							sourceVersion: 1,
						},
						{
							code: "MEDICAL_EMPLOYER",
							kind: "benefit_employer_contribution",
							amount: "50",
							currencyCode: "USD",
							decimalScale: 0,
							sourceType: "hr_benefit_enrollment",
							sourceId: "benefit-employer-1",
							sourceVersion: 1,
						},
					],
				},
			}),
		);
		expect(output.exceptions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					exceptionCode: "MISSING_HR_DEDUCTION_RULE",
				}),
				expect.objectContaining({
					exceptionCode: "MISSING_EMPLOYER_BENEFIT_RULE",
				}),
			]),
		);
	});
});
