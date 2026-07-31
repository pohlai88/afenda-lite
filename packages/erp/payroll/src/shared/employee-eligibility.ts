import { errorResult, type Result } from "@afenda/errors";
import type { PayrollEmployeeQueryPort } from "../ports";

export type PayrollEmployeeFacts = NonNullable<
	Awaited<ReturnType<PayrollEmployeeQueryPort["getPayrollEmployee"]>>
>;

export async function requirePayrollEmployeeAtDate(input: {
	employees: PayrollEmployeeQueryPort | undefined;
	organizationId: string;
	employeeId: string;
	effectiveDate: string;
}): Promise<Result<PayrollEmployeeFacts>> {
	if (input.employees === undefined) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	const employee = await input.employees.getPayrollEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		effectiveDate: input.effectiveDate,
	});

	if (employee === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Employee not found for payroll at effective date",
		});
	}

	return errorResult.ok(employee);
}

export function assertEmployeeEligibleForPayroll(
	employee: PayrollEmployeeFacts,
): Result<PayrollEmployeeFacts> {
	if (employee.employmentStatus === "terminated") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Employee is terminated and ineligible for payroll",
		});
	}
	return errorResult.ok(employee);
}

export function assertEmployeePayGroupMatch(input: {
	employee: PayrollEmployeeFacts;
	expectedPayGroupId: string;
}): Result<PayrollEmployeeFacts> {
	if (input.employee.payGroupId !== input.expectedPayGroupId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Employee pay group does not match payroll configuration",
		});
	}
	return errorResult.ok(input.employee);
}

export function assertCurrencyAlignment(input: {
	expectedCurrencyCode: string;
	actualCurrencyCode: string;
}): Result<void> {
	if (input.expectedCurrencyCode !== input.actualCurrencyCode) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Currency does not match pay group or employee compensation",
		});
	}
	return errorResult.ok(undefined);
}

export function assertInputBeforeCutoff(input: {
	effectiveFrom: string;
	cutoffDate: string;
}): Result<void> {
	if (input.effectiveFrom > input.cutoffDate) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Input effective date is after period cutoff",
		});
	}
	return errorResult.ok(undefined);
}
