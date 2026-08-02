import { describe, expect, it } from "vitest";

import { assembleApprovedPayrollHandoffInputSchema } from "../src/features/payroll-handoff/approved-payroll-handoff";

const BASE_INPUT = {
	organizationId: "organization-payroll-period",
	employeeId: "00000000-0000-4000-8000-000000000701",
	effectiveDate: "2026-07-31",
	actorUserId: "payroll-operator",
	correlationId: "correlation-payroll-period",
} as const;

describe("approved payroll handoff period input", () => {
	it("accepts a bounded payroll period for automatic work-fact discovery", () => {
		const result = assembleApprovedPayrollHandoffInputSchema.safeParse({
			...BASE_INPUT,
			periodStart: "2026-07-01",
			periodEnd: "2026-07-31",
		});

		expect(result.success).toBe(true);
	});

	it("rejects an incomplete or reversed payroll period", () => {
		expect(
			assembleApprovedPayrollHandoffInputSchema.safeParse({
				...BASE_INPUT,
				periodStart: "2026-07-01",
			}).success,
		).toBe(false);
		expect(
			assembleApprovedPayrollHandoffInputSchema.safeParse({
				...BASE_INPUT,
				periodStart: "2026-08-01",
				periodEnd: "2026-07-31",
			}).success,
		).toBe(false);
	});
});
