import { errorResult } from "@afenda/errors";
import {
	deriveHandoffDecimalScale,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
} from "@afenda/events/schemas";
import type { PayrollWorkforceInputPort } from "../../src/kernel/execution/ports";

export interface MemoryEmployeeFixture {
	baseCompensation: string;
	currencyCode: string;
	employeeId: string;
	employmentStatus: "active" | "notice" | "terminated";
	organizationId: string;
	payGroupId: string;
}

export function createMemoryPayrollEmployeeQueryPort(
	fixtures: MemoryEmployeeFixture[],
): PayrollWorkforceInputPort {
	const byKey = new Map(
		fixtures.map((fixture) => [
			`${fixture.organizationId}:${fixture.employeeId}`,
			fixture,
		]),
	);

	return {
		// biome-ignore lint/suspicious/useAwait: This deterministic test double implements the asynchronous employee port contract.
		async getApprovedPayrollHandoff(input) {
			const fixture = byKey.get(`${input.organizationId}:${input.employeeId}`);
			if (fixture === undefined || fixture.employmentStatus === "terminated") {
				return errorResult.ok(null);
			}
			return errorResult.ok({
				contractVersion: HANDOFF_PAYROLL_CONTRACT_VERSION,
				organizationId: fixture.organizationId,
				employeeId: fixture.employeeId,
				employmentId: `employment-${fixture.employeeId}`,
				employmentStatus: fixture.employmentStatus,
				assignment: { assignmentId: `assignment-${fixture.employeeId}` },
				effectiveDate: input.effectiveDate,
				currencyCode: fixture.currencyCode,
				baseAmount: fixture.baseCompensation,
				decimalScale: deriveHandoffDecimalScale(fixture.baseCompensation),
				roundingMode: "half_even",
				payFrequency: "monthly",
				components: [
					{
						code: "base",
						kind: "base",
						amount: fixture.baseCompensation,
						currencyCode: fixture.currencyCode,
						decimalScale: deriveHandoffDecimalScale(fixture.baseCompensation),
						sourceType: "test_employee_compensation",
						sourceId: `compensation-${fixture.employeeId}`,
						sourceVersion: 1,
					},
				],
				leaveFacts: [],
				timeFacts: null,
				overtimeFacts: [],
				sourceVersion: { compensationVersion: 1 },
				approvalEvidence: {
					approvedAt: "2025-01-01T00:00:00.000Z",
					approvedBy: "test-reviewer",
					correlationId: input.correlationId,
				},
			});
		},
	};
}
