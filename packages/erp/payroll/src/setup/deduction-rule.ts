import type { Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_ARCHIVE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_UPDATE,
	PAYROLL_QUERY_SETUP_DEDUCTION_RULE_GET,
} from "../module-ids";
import {
	archivePayrollDeductionRuleInputSchema,
	createPayrollDeductionRuleInputSchema,
	getPayrollDeductionRuleInputSchema,
	supersedePayrollDeductionRuleInputSchema,
	updatePayrollDeductionRuleInputSchema,
} from "../schemas/setup";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type {
	PayrollDeductionRule,
	PayrollRuleSupersedeResult,
} from "../types";

export async function createPayrollDeductionRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollDeductionRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollDeductionRuleInputSchema,
		invalidMessage: "Invalid payroll deduction rule create input",
		command: PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE,
		execute: async (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				payGroupId: data.payGroupId,
				code: data.code,
				name: data.name,
				ruleType: data.ruleType,
				amount: data.amount,
				rate: data.rate,
				currencyCode: data.currencyCode,
				ruleVersion: data.ruleVersion,
				taxTiming: data.taxTiming,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			return store.createDeductionRule(
				{
					organizationId: data.organizationId,
					payGroupId: data.payGroupId,
					code: data.code,
					name: data.name,
					ruleType: data.ruleType,
					amount: data.amount,
					rate: data.rate,
					currencyCode: data.currencyCode,
					ruleVersion: data.ruleVersion,
					taxTiming: data.taxTiming,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function updatePayrollDeductionRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollDeductionRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: updatePayrollDeductionRuleInputSchema,
		invalidMessage: "Invalid payroll deduction rule update input",
		command: PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updateDeductionRule(
				{
					organizationId: data.organizationId,
					ruleId: data.ruleId,
					name: data.name,
					amount: data.amount,
					rate: data.rate,
					taxTiming: data.taxTiming,
					effectiveTo: data.effectiveTo,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function archivePayrollDeductionRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollDeductionRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: archivePayrollDeductionRuleInputSchema,
		invalidMessage: "Invalid payroll deduction rule archive input",
		command: PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_ARCHIVE,
		execute: async (data, { store, ports }) =>
			store.archiveDeductionRule(
				{
					organizationId: data.organizationId,
					ruleId: data.ruleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function supersedePayrollDeductionRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRuleSupersedeResult<PayrollDeductionRule>>> {
	return runPayrollSetupCommand(input, options, {
		schema: supersedePayrollDeductionRuleInputSchema,
		invalidMessage: "Invalid payroll deduction rule supersede input",
		command: PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				ruleId: data.ruleId,
				name: data.name ?? null,
				ruleType: data.ruleType ?? null,
				amount: data.amount ?? null,
				rate: data.rate ?? null,
				currencyCode: data.currencyCode ?? null,
				ruleVersion: data.ruleVersion,
				taxTiming: data.taxTiming ?? null,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			return store.supersedeDeductionRule(
				{
					organizationId: data.organizationId,
					ruleId: data.ruleId,
					name: data.name,
					ruleType: data.ruleType,
					amount: data.amount,
					rate: data.rate,
					currencyCode: data.currencyCode,
					ruleVersion: data.ruleVersion,
					taxTiming: data.taxTiming,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					expectedVersion: data.expectedVersion,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function getPayrollDeductionRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollDeductionRule | null>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollDeductionRuleInputSchema,
		invalidMessage: "Invalid payroll deduction rule get input",
		query: PAYROLL_QUERY_SETUP_DEDUCTION_RULE_GET,
		execute: async (data, { store }) =>
			store.getDeductionRule({
				organizationId: data.organizationId,
				ruleId: data.ruleId,
			}),
	});
}

export const PAYROLL_AGGREGATE_DEDUCTION_RULE = "deduction-rule" as const;
export type PayrollDeductionRuleAggregate =
	typeof PAYROLL_AGGREGATE_DEDUCTION_RULE;
