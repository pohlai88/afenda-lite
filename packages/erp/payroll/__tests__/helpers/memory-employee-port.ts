import type { PayrollEmployeeQueryPort } from "../../src/ports";

export type MemoryEmployeeFixture = {
	employeeId: string;
	organizationId: string;
	payGroupId: string;
	currencyCode: string;
	employmentStatus: "active" | "notice" | "terminated";
	baseCompensation: string;
};

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
		async getPayrollEmployee(input) {
			const fixture = byKey.get(
				`${input.organizationId}:${input.employeeId}`,
			);
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
