import type { PayrollEmployeeQueryPort } from "../../src/ports";

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
): PayrollEmployeeQueryPort {
	const byKey = new Map(
		fixtures.map((fixture) => [
			`${fixture.organizationId}:${fixture.employeeId}`,
			fixture,
		]),
	);

	return {
		// biome-ignore lint/suspicious/useAwait: This deterministic test double implements the asynchronous employee port contract.
		async getPayrollEmployee(input) {
			const fixture = byKey.get(`${input.organizationId}:${input.employeeId}`);
			if (fixture === undefined) {
				return null;
			}
			return {
				employeeId: fixture.employeeId,
				employmentStatus: fixture.employmentStatus,
				payGroupId: fixture.payGroupId,
				baseCompensation: fixture.baseCompensation,
				currencyCode: fixture.currencyCode,
				recurringAllowances: [],
				recurringDeductions: [],
			};
		},
	};
}
