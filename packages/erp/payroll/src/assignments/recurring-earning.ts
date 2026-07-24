import { fail, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	payrollErrorDetails,
} from "../error-codes";
import { PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE } from "../module-ids";
import { createPayrollRecurringEarningInputSchema } from "../schemas/assignments";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	requirePayrollEmployeeAtDate,
} from "../shared/employee-eligibility";
import { isEffectiveOnDate } from "../shared/effective-date";
import { runPayrollSetupCommand } from "../shared/setup-command";
import type { PayrollRecurringEarning } from "../types";

export const PAYROLL_AGGREGATE_RECURRING_EARNING = "recurring-earning" as const;

export async function createPayrollRecurringEarning(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRecurringEarning>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollRecurringEarningInputSchema,
		invalidMessage: "Invalid payroll recurring earning create input",
		command: PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE,
		execute: async (data, { store, ports, employees }) => {
			const assignment = await store.getEmployeeAssignment({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return fail(
					"NOT_FOUND",
					"Payroll employee assignment not found",
					payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
				);
			}
			if (assignment.data.employeeId !== data.employeeId) {
				return fail(
					"CONFLICT",
					"Assignment employee mismatch",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}
			if (assignment.data.status !== "active") {
				return fail(
					"CONFLICT",
					"Payroll employee assignment is not active",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}

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

			const earningRule = await store.getEarningRule({
				organizationId: data.organizationId,
				ruleId: data.earningRuleId,
			});
			if (!earningRule.ok) {
				return earningRule;
			}
			if (earningRule.data === null) {
				return fail(
					"NOT_FOUND",
					"Earning rule not found",
					payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
				);
			}
			if (earningRule.data.payGroupId !== assignment.data.payGroupId) {
				return fail(
					"CONFLICT",
					"Earning rule pay group mismatch",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}
			if (
				!isEffectiveOnDate(
					earningRule.data.effectiveFrom,
					earningRule.data.effectiveTo,
					data.effectiveFrom,
				)
			) {
				return fail(
					"CONFLICT",
					"Earning rule is not effective on requested date",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}

			const currency = assertCurrencyAlignment({
				expectedCurrencyCode: earningRule.data.currencyCode,
				actualCurrencyCode: data.currencyCode,
			});
			if (!currency.ok) {
				return currency;
			}

			const fingerprint = buildPayrollCreateFingerprint({
				employeeId: data.employeeId,
				assignmentId: data.assignmentId,
				earningRuleId: data.earningRuleId,
				amount: data.amount,
				currencyCode: data.currencyCode,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});

			return store.createRecurringEarning(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					assignmentId: data.assignmentId,
					earningRuleId: data.earningRuleId,
					amount: data.amount,
					currencyCode: data.currencyCode,
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
