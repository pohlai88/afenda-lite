import type { Result } from "@afenda/errors";
import type {
	PayrollDeductionRule,
	PayrollRuleSupersedeResult,
} from "../../kernel/contracts/projected-types";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_ARCHIVE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE,
	PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_UPDATE,
	PAYROLL_QUERY_SETUP_DEDUCTION_RULE_GET,
} from "../../kernel/operations/module-ids";
import {
	archivePayrollDeductionRuleInputSchema,
	createPayrollDeductionRuleInputSchema,
	getPayrollDeductionRuleInputSchema,
	supersedePayrollDeductionRuleInputSchema,
	updatePayrollDeductionRuleInputSchema,
} from "./setup.schema";
import type {
	PayrollSetupCommandOptions,
	PayrollSetupQueryOptions,
} from "./setup-operation";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "./setup-operation";

export function createPayrollDeductionRule(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
): Promise<Result<PayrollDeductionRule>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollDeductionRuleInputSchema,
		invalidMessage: "Invalid payroll deduction rule create input",
		command: PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_CREATE,
		execute: (data, { store, ports }) => {
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

export function updatePayrollDeductionRule(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
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

export function archivePayrollDeductionRule(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
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

export function supersedePayrollDeductionRule(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
): Promise<Result<PayrollRuleSupersedeResult<PayrollDeductionRule>>> {
	return runPayrollSetupCommand(input, options, {
		schema: supersedePayrollDeductionRuleInputSchema,
		invalidMessage: "Invalid payroll deduction rule supersede input",
		command: PAYROLL_COMMAND_SETUP_DEDUCTION_RULE_SUPERSEDE,
		execute: (data, { store, ports }) => {
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

export function getPayrollDeductionRule(
	input: unknown,
	options: PayrollSetupQueryOptions = {},
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
