import { errorResult, type Result } from "@afenda/errors";
import type { PayrollVariableInput } from "../../kernel/contracts/projected-types";
import type { PayrollCommandOptions as GenericPayrollCommandOptions } from "../../kernel/execution/command-options";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	PAYROLL_COMMAND_INPUT_VARIABLE_CREATE,
	PAYROLL_QUERY_INPUT_VARIABLE_GET,
} from "../../kernel/operations/module-ids";
import {
	effectiveRangeContains,
	isEffectiveOnDate,
} from "../../kernel/temporal/effective-date";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	assertInputWithinPayrollPeriod,
	requirePayrollEmployeeAtDate,
} from "../workforce-ingress/employee-eligibility";
import type { PayrollVariableInputOperationStore } from "./operation-store";

type PayrollCommandOptions =
	GenericPayrollCommandOptions<PayrollVariableInputOperationStore>;

import {
	createPayrollVariableInputInputSchema,
	getPayrollVariableInputInputSchema,
} from "./inputs.schema";

function buildVariableInputSourceFingerprint(input: {
	employeeId: string;
	payGroupId: string;
	periodId: string;
	earningRuleId: string;
	amount: string;
	currencyCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
}): string {
	return buildPayrollCreateFingerprint(input);
}

export function createPayrollVariableInput(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollVariableInput>> {
	return runPayrollCommand(input, options, {
		schema: createPayrollVariableInputInputSchema,
		invalidMessage: "Invalid payroll variable input create input",
		command: PAYROLL_COMMAND_INPUT_VARIABLE_CREATE,
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The command boundary validates employee, period, rule, currency, source, and idempotency invariants before mutation.
		execute: async (data, { store, ports, employees }) => {
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
			const payGroup = await store.getPayGroup({
				organizationId: data.organizationId,
				payGroupId: data.payGroupId,
			});
			if (!payGroup.ok) {
				return payGroup;
			}
			if (payGroup.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Pay group not found",
				});
			}
			if (payGroup.data.status !== "active") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Pay group is not active",
				});
			}

			const assignments = await store.listActiveAssignmentsForPayGroup({
				organizationId: data.organizationId,
				payGroupId: data.payGroupId,
				effectiveDate: data.effectiveFrom,
			});
			if (!assignments.ok) {
				return assignments;
			}
			const assignment = assignments.data.find(
				(candidate) => candidate.employeeId === data.employeeId,
			);
			if (assignment === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Employee has no active payroll assignment for this pay group",
				});
			}
			if (!effectiveRangeContains(assignment, data)) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Variable input effective range must be within the assignment",
				});
			}

			const period = await store.getPeriod({
				organizationId: data.organizationId,
				periodId: data.periodId,
			});
			if (!period.ok) {
				return period;
			}
			if (period.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Payroll period not found",
				});
			}
			if (period.data.payGroupId !== data.payGroupId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Period pay group mismatch",
				});
			}
			if (period.data.status !== "open") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Payroll period is not open",
				});
			}

			const cutoff = assertInputWithinPayrollPeriod({
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo,
				periodStart: period.data.periodStart,
				periodEnd: period.data.periodEnd,
				cutoffDate: period.data.cutoffDate,
			});
			if (!cutoff.ok) {
				return cutoff;
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
			if (earningRule.data.payGroupId !== data.payGroupId) {
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
						"Variable input effective range must be within the earning rule",
				});
			}

			const currency = assertCurrencyAlignment({
				expectedCurrencyCode: payGroup.data.currencyCode,
				actualCurrencyCode: data.currencyCode,
			});
			if (!currency.ok) {
				return currency;
			}
			const ruleCurrency = assertCurrencyAlignment({
				expectedCurrencyCode: earningRule.data.currencyCode,
				actualCurrencyCode: data.currencyCode,
			});
			if (!ruleCurrency.ok) {
				return ruleCurrency;
			}

			const sourceRequestFingerprint = buildVariableInputSourceFingerprint({
				employeeId: data.employeeId,
				payGroupId: data.payGroupId,
				periodId: data.periodId,
				earningRuleId: data.earningRuleId,
				amount: data.amount,
				currencyCode: data.currencyCode,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			const createRequestFingerprint = buildPayrollCreateFingerprint({
				sourceType: data.sourceType,
				sourceId: data.sourceId,
				idempotencyKey: data.idempotencyKey,
				sourceRequestFingerprint,
			});

			return store.createVariableInput(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					payGroupId: data.payGroupId,
					periodId: data.periodId,
					earningRuleId: data.earningRuleId,
					earningRuleCode: earningRule.data.code,
					earningRuleVersion: earningRule.data.ruleVersion,
					amount: data.amount,
					currencyCode: data.currencyCode,
					sourceType: data.sourceType,
					sourceId: data.sourceId,
					sourceRequestFingerprint,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
					actorUserId: data.actorUserId,
				},
				ports,
			);
		},
	});
}

export function getPayrollVariableInput(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollVariableInput | null>> {
	return runPayrollQuery(input, options, {
		schema: getPayrollVariableInputInputSchema,
		invalidMessage: "Invalid payroll variable input get input",
		query: PAYROLL_QUERY_INPUT_VARIABLE_GET,
		execute: async (data, { store }) =>
			store.getVariableInput({
				organizationId: data.organizationId,
				variableInputId: data.variableInputId,
			}),
	});
}
