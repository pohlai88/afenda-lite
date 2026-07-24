import type { Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_COMMAND_SETUP_EARNING_RULE_ARCHIVE,
	PAYROLL_COMMAND_SETUP_EARNING_RULE_CREATE,
	PAYROLL_COMMAND_SETUP_EARNING_RULE_SUPERSEDE,
	PAYROLL_COMMAND_SETUP_EARNING_RULE_UPDATE,
	PAYROLL_QUERY_SETUP_EARNING_RULE_GET,
} from "../module-ids";
import {
	archivePayrollEarningRuleInputSchema,
	createPayrollEarningRuleInputSchema,
	getPayrollEarningRuleInputSchema,
	supersedePayrollEarningRuleInputSchema,
	updatePayrollEarningRuleInputSchema,
} from "../schemas/setup";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type {
	PayrollEarningRule,
	PayrollRuleSupersedeResult,
} from "../types";

export async function createPayrollEarningRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEarningRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollEarningRuleInputSchema,
		invalidMessage: "Invalid payroll earning rule create input",
		command: PAYROLL_COMMAND_SETUP_EARNING_RULE_CREATE,
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
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			return store.createEarningRule(
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

export async function updatePayrollEarningRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEarningRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: updatePayrollEarningRuleInputSchema,
		invalidMessage: "Invalid payroll earning rule update input",
		command: PAYROLL_COMMAND_SETUP_EARNING_RULE_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updateEarningRule(
				{
					organizationId: data.organizationId,
					ruleId: data.ruleId,
					name: data.name,
					amount: data.amount,
					rate: data.rate,
					effectiveTo: data.effectiveTo,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function archivePayrollEarningRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEarningRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: archivePayrollEarningRuleInputSchema,
		invalidMessage: "Invalid payroll earning rule archive input",
		command: PAYROLL_COMMAND_SETUP_EARNING_RULE_ARCHIVE,
		execute: async (data, { store, ports }) =>
			store.archiveEarningRule(
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

export async function supersedePayrollEarningRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRuleSupersedeResult<PayrollEarningRule>>> {
	return runPayrollSetupCommand(input, options, {
		schema: supersedePayrollEarningRuleInputSchema,
		invalidMessage: "Invalid payroll earning rule supersede input",
		command: PAYROLL_COMMAND_SETUP_EARNING_RULE_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				ruleId: data.ruleId,
				name: data.name ?? null,
				ruleType: data.ruleType ?? null,
				amount: data.amount ?? null,
				rate: data.rate ?? null,
				currencyCode: data.currencyCode ?? null,
				ruleVersion: data.ruleVersion,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			return store.supersedeEarningRule(
				{
					organizationId: data.organizationId,
					ruleId: data.ruleId,
					name: data.name,
					ruleType: data.ruleType,
					amount: data.amount,
					rate: data.rate,
					currencyCode: data.currencyCode,
					ruleVersion: data.ruleVersion,
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

export async function getPayrollEarningRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollEarningRule | null>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollEarningRuleInputSchema,
		invalidMessage: "Invalid payroll earning rule get input",
		query: PAYROLL_QUERY_SETUP_EARNING_RULE_GET,
		execute: async (data, { store }) =>
			store.getEarningRule({
				organizationId: data.organizationId,
				ruleId: data.ruleId,
			}),
	});
}

export const PAYROLL_AGGREGATE_EARNING_RULE = "earning-rule" as const;
export type PayrollEarningRuleAggregate = typeof PAYROLL_AGGREGATE_EARNING_RULE;
