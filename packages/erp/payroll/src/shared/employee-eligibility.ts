import { fail, ok, type Result } from "@afenda/errors/result";

import {
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	PAYROLL_ERROR_VALIDATION,
	payrollErrorDetails,
} from "../error-codes";
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
		return fail(
			"INTERNAL_ERROR",
			"Payroll employee query port is not configured",
			payrollErrorDetails(PAYROLL_ERROR_VALIDATION),
		);
	}

	const employee = await input.employees.getPayrollEmployee({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		effectiveDate: input.effectiveDate,
	});

	if (employee === null) {
		return fail(
			"NOT_FOUND",
			"Employee not found for payroll at effective date",
			payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
		);
	}

	return ok(employee);
}

export function assertEmployeeEligibleForPayroll(
	employee: PayrollEmployeeFacts,
): Result<PayrollEmployeeFacts> {
	if (employee.employmentStatus === "terminated") {
		return fail(
			"CONFLICT",
			"Employee is terminated and ineligible for payroll",
			payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
		);
	}
	return ok(employee);
}

export function assertEmployeePayGroupMatch(input: {
	employee: PayrollEmployeeFacts;
	expectedPayGroupId: string;
}): Result<PayrollEmployeeFacts> {
	if (input.employee.payGroupId !== input.expectedPayGroupId) {
		return fail(
			"CONFLICT",
			"Employee pay group does not match payroll configuration",
			payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
		);
	}
	return ok(input.employee);
}

export function assertCurrencyAlignment(input: {
	expectedCurrencyCode: string;
	actualCurrencyCode: string;
}): Result<void> {
	if (input.expectedCurrencyCode !== input.actualCurrencyCode) {
		return fail(
			"CONFLICT",
			"Currency does not match pay group or employee compensation",
			payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
		);
	}
	return ok(undefined);
}

export function assertInputBeforeCutoff(input: {
	effectiveFrom: string;
	cutoffDate: string;
}): Result<void> {
	if (input.effectiveFrom > input.cutoffDate) {
		return fail(
			"CONFLICT",
			"Input effective date is after period cutoff",
			payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
		);
	}
	return ok(undefined);
}
