import { errorResult, type Result } from "@afenda/errors";

import type { PayrollCommandOptions } from "../command-options";
import { PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE } from "../module-ids";
import { createPayrollRecurringEarningInputSchema } from "../schemas/assignments";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	effectiveRangeContains,
	isEffectiveOnDate,
} from "../shared/effective-date";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	requirePayrollEmployeeAtDate,
} from "../shared/employee-eligibility";
import { runPayrollSetupCommand } from "../shared/setup-command";
import type { PayrollRecurringEarning } from "../types";

export const PAYROLL_AGGREGATE_RECURRING_EARNING = "recurring-earning" as const;

export function createPayrollRecurringEarning(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRecurringEarning>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollRecurringEarningInputSchema,
		invalidMessage: "Invalid payroll recurring earning create input",
		command: PAYROLL_COMMAND_ASSIGNMENT_RECURRING_EARNING_CREATE,
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
			if (!effectiveRangeContains(assignment.data, data)) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Recurring earning effective range must be within the assignment",
				});
			}

			const employeeResult = await requirePayrollEmployeeAtDate({
				employees,
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				effectiveDate: data.effectiveFrom,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Earning rule not found",
				});
			}
			if (earningRule.data.payGroupId !== assignment.data.payGroupId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Earning rule pay group mismatch",
				});
			}
			if (
				!isEffectiveOnDate(
					earningRule.data.effectiveFrom,
					earningRule.data.effectiveTo,
					data.effectiveFrom,
				)
			) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Earning rule is not effective on requested date",
				});
			}
			if (!effectiveRangeContains(earningRule.data, data)) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Recurring earning effective range must be within the earning rule",
				});
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
