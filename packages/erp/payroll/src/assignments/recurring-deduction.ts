import { fail, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	payrollErrorDetails,
} from "../error-codes";
import { PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE } from "../module-ids";
import { createPayrollRecurringDeductionInputSchema } from "../schemas/assignments";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	requirePayrollEmployeeAtDate,
} from "../shared/employee-eligibility";
import { isEffectiveOnDate } from "../shared/effective-date";
import { runPayrollSetupCommand } from "../shared/setup-command";
import type { PayrollRecurringDeduction } from "../types";

export const PAYROLL_AGGREGATE_RECURRING_DEDUCTION =
	"recurring-deduction" as const;

export async function createPayrollRecurringDeduction(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRecurringDeduction>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollRecurringDeductionInputSchema,
		invalidMessage: "Invalid payroll recurring deduction create input",
		command: PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE,
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

			const deductionRule = await store.getDeductionRule({
				organizationId: data.organizationId,
				ruleId: data.deductionRuleId,
			});
			if (!deductionRule.ok) {
				return deductionRule;
			}
			if (deductionRule.data === null) {
				return fail(
					"NOT_FOUND",
					"Deduction rule not found",
					payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
				);
			}
			if (deductionRule.data.payGroupId !== assignment.data.payGroupId) {
				return fail(
					"CONFLICT",
					"Deduction rule pay group mismatch",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}
			if (
				!isEffectiveOnDate(
					deductionRule.data.effectiveFrom,
					deductionRule.data.effectiveTo,
					data.effectiveFrom,
				)
			) {
				return fail(
					"CONFLICT",
					"Deduction rule is not effective on requested date",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}

			const currency = assertCurrencyAlignment({
				expectedCurrencyCode: deductionRule.data.currencyCode,
				actualCurrencyCode: data.currencyCode,
			});
			if (!currency.ok) {
				return currency;
			}

			const fingerprint = buildPayrollCreateFingerprint({
				employeeId: data.employeeId,
				assignmentId: data.assignmentId,
				deductionRuleId: data.deductionRuleId,
				amount: data.amount,
				currencyCode: data.currencyCode,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});

			return store.createRecurringDeduction(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					assignmentId: data.assignmentId,
					deductionRuleId: data.deductionRuleId,
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
