import type { Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_ARCHIVE,
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_CREATE,
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_SUPERSEDE,
	PAYROLL_COMMAND_SETUP_STATUTORY_RULE_UPDATE,
	PAYROLL_QUERY_SETUP_STATUTORY_RULE_GET,
} from "../module-ids";
import {
	archivePayrollStatutoryRuleInputSchema,
	createPayrollStatutoryRuleInputSchema,
	getPayrollStatutoryRuleInputSchema,
	supersedePayrollStatutoryRuleInputSchema,
	updatePayrollStatutoryRuleInputSchema,
} from "../schemas/setup";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type {
	PayrollRuleSupersedeResult,
	PayrollStatutoryRule,
} from "../types";

export async function createPayrollStatutoryRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollStatutoryRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollStatutoryRuleInputSchema,
		invalidMessage: "Invalid payroll statutory rule create input",
		command: PAYROLL_COMMAND_SETUP_STATUTORY_RULE_CREATE,
		execute: async (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				payGroupId: data.payGroupId,
				code: data.code,
				name: data.name,
				jurisdictionCode: data.jurisdictionCode,
				configJson: data.configJson,
				ruleVersion: data.ruleVersion,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			return store.createStatutoryRule(
				{
					organizationId: data.organizationId,
					payGroupId: data.payGroupId,
					code: data.code,
					name: data.name,
					jurisdictionCode: data.jurisdictionCode,
					configJson: data.configJson,
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

export async function updatePayrollStatutoryRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollStatutoryRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: updatePayrollStatutoryRuleInputSchema,
		invalidMessage: "Invalid payroll statutory rule update input",
		command: PAYROLL_COMMAND_SETUP_STATUTORY_RULE_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updateStatutoryRule(
				{
					organizationId: data.organizationId,
					ruleId: data.ruleId,
					name: data.name,
					jurisdictionCode: data.jurisdictionCode,
					configJson: data.configJson,
					effectiveTo: data.effectiveTo,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function archivePayrollStatutoryRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollStatutoryRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: archivePayrollStatutoryRuleInputSchema,
		invalidMessage: "Invalid payroll statutory rule archive input",
		command: PAYROLL_COMMAND_SETUP_STATUTORY_RULE_ARCHIVE,
		execute: async (data, { store, ports }) =>
			store.archiveStatutoryRule(
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

export async function supersedePayrollStatutoryRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRuleSupersedeResult<PayrollStatutoryRule>>> {
	return runPayrollSetupCommand(input, options, {
		schema: supersedePayrollStatutoryRuleInputSchema,
		invalidMessage: "Invalid payroll statutory rule supersede input",
		command: PAYROLL_COMMAND_SETUP_STATUTORY_RULE_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				ruleId: data.ruleId,
				name: data.name ?? null,
				jurisdictionCode: data.jurisdictionCode ?? null,
				configJson: data.configJson ?? null,
				ruleVersion: data.ruleVersion,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			return store.supersedeStatutoryRule(
				{
					organizationId: data.organizationId,
					ruleId: data.ruleId,
					name: data.name,
					jurisdictionCode: data.jurisdictionCode,
					configJson: data.configJson,
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

export async function getPayrollStatutoryRule(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollStatutoryRule | null>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollStatutoryRuleInputSchema,
		invalidMessage: "Invalid payroll statutory rule get input",
		query: PAYROLL_QUERY_SETUP_STATUTORY_RULE_GET,
		execute: async (data, { store }) =>
			store.getStatutoryRule({
				organizationId: data.organizationId,
				ruleId: data.ruleId,
			}),
	});
}

export const PAYROLL_AGGREGATE_STATUTORY_RULE = "statutory-rule" as const;
export type PayrollStatutoryRuleAggregate =
	typeof PAYROLL_AGGREGATE_STATUTORY_RULE;
