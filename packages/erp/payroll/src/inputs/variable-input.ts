import { fail, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	payrollErrorDetails,
} from "../error-codes";
import {
	PAYROLL_COMMAND_INPUT_VARIABLE_CREATE,
	PAYROLL_QUERY_INPUT_VARIABLE_GET,
} from "../module-ids";
import {
	createPayrollVariableInputInputSchema,
	getPayrollVariableInputInputSchema,
} from "../schemas/inputs";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	assertCurrencyAlignment,
	assertEmployeeEligibleForPayroll,
	assertEmployeePayGroupMatch,
	assertInputBeforeCutoff,
	requirePayrollEmployeeAtDate,
} from "../shared/employee-eligibility";
import { isEffectiveOnDate } from "../shared/effective-date";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type { PayrollVariableInput } from "../types";

export const PAYROLL_AGGREGATE_VARIABLE_INPUT = "variable-input" as const;

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

export async function createPayrollVariableInput(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollVariableInput>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollVariableInputInputSchema,
		invalidMessage: "Invalid payroll variable input create input",
		command: PAYROLL_COMMAND_INPUT_VARIABLE_CREATE,
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

			const period = await store.getPeriod({
				organizationId: data.organizationId,
				periodId: data.periodId,
			});
			if (!period.ok) {
				return period;
			}
			if (period.data === null) {
				return fail(
					"NOT_FOUND",
					"Payroll period not found",
					payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
				);
			}
			if (period.data.payGroupId !== data.payGroupId) {
				return fail(
					"CONFLICT",
					"Period pay group mismatch",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}
			if (period.data.status !== "open") {
				return fail(
					"CONFLICT",
					"Payroll period is not open",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}

			const cutoff = assertInputBeforeCutoff({
				effectiveFrom: data.effectiveFrom,
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
				return fail(
					"NOT_FOUND",
					"Earning rule not found",
					payrollErrorDetails(PAYROLL_ERROR_NOT_FOUND),
				);
			}
			if (earningRule.data.payGroupId !== data.payGroupId) {
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

export async function getPayrollVariableInput(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollVariableInput | null>> {
	return runPayrollSetupQuery(input, options, {
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
