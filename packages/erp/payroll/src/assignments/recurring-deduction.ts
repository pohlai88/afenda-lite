import { errorResult, type Result } from "@afenda/errors";

import type { PayrollCommandOptions } from "../command-options";
import { PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE } from "../module-ids";
import { createPayrollRecurringDeductionInputSchema } from "../schemas/assignments";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import { isEffectiveOnDate } from "../shared/effective-date";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	requirePayrollEmployeeAtDate,
} from "../shared/employee-eligibility";
import { runPayrollSetupCommand } from "../shared/setup-command";
import type { PayrollRecurringDeduction } from "../types";

export const PAYROLL_AGGREGATE_RECURRING_DEDUCTION =
	"recurring-deduction" as const;

export function createPayrollRecurringDeduction(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRecurringDeduction>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollRecurringDeductionInputSchema,
		invalidMessage: "Invalid payroll recurring deduction create input",
		command: PAYROLL_COMMAND_ASSIGNMENT_RECURRING_DEDUCTION_CREATE,
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The command boundary validates employee, assignment, rule, currency, and idempotency invariants before mutation.
		execute: async (data, { store, ports, employees }) => {
			const assignment = await store.getEmployeeAssignment({
				organizationId: data.organizationId,
				assignmentId: data.assignmentId,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Payroll employee assignment not found",
				});
			}
			if (assignment.data.employeeId !== data.employeeId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Assignment employee mismatch",
				});
			}
			if (assignment.data.status !== "active") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payroll employee assignment is not active",
				});
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Deduction rule not found",
				});
			}
			if (deductionRule.data.payGroupId !== assignment.data.payGroupId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Deduction rule pay group mismatch",
				});
			}
			if (
				!isEffectiveOnDate(
					deductionRule.data.effectiveFrom,
					deductionRule.data.effectiveTo,
					data.effectiveFrom,
				)
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Deduction rule is not effective on requested date",
				});
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
