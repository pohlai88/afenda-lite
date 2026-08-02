import { errorResult, type Result } from "@afenda/errors";
import type {
	PayrollEmployeeFacts,
	PayrollWorkforceInputPort,
} from "../../kernel/execution/ports";
import { normalizePayrollWorkforceHandoff } from "./normalize-workforce-handoff";

export async function requirePayrollEmployeeAtDate(input: {
	employees: PayrollWorkforceInputPort | undefined;
	organizationId: string;
	employeeId: string;
	effectiveDate: string;
	actorUserId: string;
	correlationId: string;
}): Promise<Result<PayrollEmployeeFacts>> {
	if (input.employees === undefined) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	const employee = await input.employees.getApprovedPayrollHandoff({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		effectiveDate: input.effectiveDate,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
	});
	if (!employee.ok) {
		return employee;
	}

	if (employee.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Employee not found for payroll at effective date",
		});
	}

	return normalizePayrollWorkforceHandoff(employee.data, {
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		effectiveDate: input.effectiveDate,
	});
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

export function assertInputWithinPayrollPeriod(input: {
	effectiveFrom: string;
	effectiveTo?: string | null | undefined;
	periodStart: string;
	periodEnd: string;
	cutoffDate: string;
}): Result<void> {
	if (input.effectiveFrom < input.periodStart) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Input effective date is before the payroll period",
		});
	}
	if (input.effectiveFrom > input.periodEnd) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Input effective date is after the payroll period",
		});
	}
	if (input.effectiveFrom > input.cutoffDate) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Input effective date is after period cutoff",
		});
	}
	if (
		input.effectiveTo !== null &&
		input.effectiveTo !== undefined &&
		input.effectiveTo > input.periodEnd
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Input effective range extends beyond the payroll period",
		});
	}
	return errorResult.ok(undefined);
}
