import { fail, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	payrollErrorDetails,
} from "../error-codes";
import {
	PAYROLL_COMMAND_ASSIGNMENT_CREATE,
	PAYROLL_QUERY_ASSIGNMENT_GET,
} from "../module-ids";
import {
	createPayrollEmployeeAssignmentInputSchema,
	getPayrollEmployeeAssignmentInputSchema,
} from "../schemas/assignments";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	assertEmployeePayGroupMatch,
	requirePayrollEmployeeAtDate,
} from "../shared/employee-eligibility";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type { PayrollEmployeeAssignment } from "../types";

export const PAYROLL_AGGREGATE_EMPLOYEE_PAYROLL_ASSIGNMENT =
	"employee-payroll-assignment" as const;
export type PayrollEmployeePayrollAssignmentAggregate =
	typeof PAYROLL_AGGREGATE_EMPLOYEE_PAYROLL_ASSIGNMENT;

export async function createPayrollEmployeeAssignment(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEmployeeAssignment>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollEmployeeAssignmentInputSchema,
		invalidMessage: "Invalid payroll employee assignment create input",
		command: PAYROLL_COMMAND_ASSIGNMENT_CREATE,
		execute: async (data, { store, ports, employees }) => {
			const employeeResult = await requirePayrollEmployeeAtDate({
				employees,
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				effectiveDate: data.effectiveFrom,
			});
			if (!employeeResult.ok) {
				return employeeResult;
			}
			const eligible = assertEmployeeEligibleForPayroll(employeeResult.data);
			if (!eligible.ok) {
				return eligible;
			}
			const payGroupMatch = assertEmployeePayGroupMatch({
				employee: eligible.data,
				expectedPayGroupId: data.payGroupId,
			});
			if (!payGroupMatch.ok) {
				return payGroupMatch;
			}

			const payGroup = await store.getPayGroup({
				organizationId: data.organizationId,
				payGroupId: data.payGroupId,
			});
			if (!payGroup.ok) {
				return payGroup;
			}
			if (payGroup.data === null) {
				return fail(
					"NOT_FOUND",
					"Pay group not found",
					payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
				);
			}
			if (payGroup.data.status !== "active") {
				return fail(
					"CONFLICT",
					"Pay group is not active",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}

			const currency = assertCurrencyAlignment({
				expectedCurrencyCode: payGroup.data.currencyCode,
				actualCurrencyCode: eligible.data.currencyCode,
			});
			if (!currency.ok) {
				return currency;
			}

			const fingerprint = buildPayrollCreateFingerprint({
				employeeId: data.employeeId,
				payGroupId: data.payGroupId,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});

			return store.createEmployeeAssignment(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					payGroupId: data.payGroupId,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
					actorUserId: data.actorUserId,
				},
				ports,
			);
		},
	});
}

export async function getPayrollEmployeeAssignment(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEmployeeAssignment | null>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollEmployeeAssignmentInputSchema,
		invalidMessage: "Invalid payroll employee assignment get input",
		query: PAYROLL_QUERY_ASSIGNMENT_GET,
		execute: async (data, { store }) =>
			store.getEmployeeAssignment({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			}),
	});
}
