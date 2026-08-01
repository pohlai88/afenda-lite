import { describe, expect, it } from "vitest";
import {
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PayrollEventSchemas,
} from "../src/schemas";

const base = {
	organizationId: "org-payroll-events",
	entityType: "payroll_run" as const,
	entityId: "a0000001-0001-4001-8001-000000000001",
	actorId: "actor-payroll-events",
	correlationId: "corr-payroll-events",
	payGroupId: "a0000002-0002-4002-8002-000000000002",
	periodId: "a0000003-0003-4003-8003-000000000003",
	calculationSnapshotHash: "sha256-evidence",
	calculationVersion: "payroll.calc.v1",
};

describe("payroll integration event contracts", () => {
	it("requires semantic finalization totals", () => {
		expect(
			PayrollEventSchemas[PAYROLL_RUN_FINALIZED_EVENT].safeParse({
				...base,
				totals: [
					{
						currencyCode: "USD",
						gross: "1000.00",
						employeeDeductions: "100.00",
						employeeStatutory: "50.00",
						employerCost: "75.00",
						net: "850.00",
					},
				],
			}).success,
		).toBe(true);
		expect(
			PayrollEventSchemas[PAYROLL_RUN_FINALIZED_EVENT].safeParse(base).success,
		).toBe(false);
	});

	it("requires payment and posting semantics owned by payroll", () => {
		expect(
			PayrollEventSchemas[PAYROLL_PAYMENT_REQUESTED_EVENT].safeParse({
				...base,
				paymentDate: "2025-01-31",
				payments: [
					{
						employeeId: "employee-1",
						sourceId: "a0000004-0004-4004-8004-000000000004",
						amount: "850.00",
						currencyCode: "USD",
					},
				],
			}).success,
		).toBe(true);
		expect(
			PayrollEventSchemas[PAYROLL_POSTING_REQUESTED_EVENT].safeParse({
				...base,
				postingDate: "2025-01-31",
				lines: [
					{
						sourceId: "a0000005-0005-4005-8005-000000000005",
						employeeId: "employee-1",
						category: "earning",
						amount: "1000.00",
						currencyCode: "USD",
						dimensions: { costCenter: "CC-1" },
					},
				],
			}).success,
		).toBe(true);
	});

	it("rejects undeclared sensitive payroll fields at every event boundary", () => {
		expect(
			PayrollEventSchemas[PAYROLL_PAYMENT_REQUESTED_EVENT].safeParse({
				...base,
				paymentDate: "2025-01-31",
				payments: [],
				bankAccount: "must-not-leak",
			}).success,
		).toBe(false);
		expect(
			PayrollEventSchemas[PAYROLL_POSTING_REQUESTED_EVENT].safeParse({
				...base,
				postingDate: "2025-01-31",
				lines: [
					{
						sourceId: "a0000005-0005-4005-8005-000000000005",
						employeeId: "employee-1",
						category: "earning",
						amount: "1000.00",
						currencyCode: "USD",
						dimensions: {},
						taxIdentifier: "must-not-leak",
					},
				],
			}).success,
		).toBe(false);
	});

	it("requires reversal correction requests to carry negative compensating values", () => {
		const correctionBase = {
			...base,
			originalRunId: base.entityId,
			reasonCode: "calculation_correction",
		};
		expect(
			PayrollEventSchemas[PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT].safeParse(
				{
					...correctionBase,
					paymentDate: "2025-01-31",
					payments: [
						{
							employeeId: "employee-1",
							sourceId: "a0000004-0004-4004-8004-000000000004",
							amount: "-850",
							currencyCode: "USD",
						},
					],
				},
			).success,
		).toBe(true);
		expect(
			PayrollEventSchemas[PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT].safeParse(
				{
					...correctionBase,
					postingDate: "2025-01-31",
					lines: [
						{
							sourceId: "a0000005-0005-4005-8005-000000000005",
							employeeId: "employee-1",
							category: "earning",
							amount: "1000",
							currencyCode: "USD",
							dimensions: {},
						},
					],
				},
			).success,
		).toBe(false);
		expect(
			PayrollEventSchemas[PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT].safeParse(
				{
					...correctionBase,
					reason: "employee bank details must not cross this boundary",
					paymentDate: "2025-01-31",
					payments: [],
				},
			).success,
		).toBe(false);
	});
});
