import { fail, ok, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_CONFLICT,
	payrollErrorDetails,
} from "../error-codes";
import {
	PAYROLL_COMMAND_SETUP_PAY_GROUP_ARCHIVE,
	PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE,
	PAYROLL_COMMAND_SETUP_PAY_GROUP_UPDATE,
	PAYROLL_QUERY_SETUP_PAY_GROUP_GET,
	PAYROLL_QUERY_SETUP_PAY_GROUP_LIST,
} from "../module-ids";
import {
	archivePayrollPayGroupInputSchema,
	createPayrollPayGroupInputSchema,
	getPayrollPayGroupInputSchema,
	listPayrollPayGroupsInputSchema,
	updatePayrollPayGroupInputSchema,
} from "../schemas/setup";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type { PayrollPayGroup } from "../types";

export async function createPayrollPayGroup(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayGroup>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollPayGroupInputSchema,
		invalidMessage: "Invalid payroll pay group create input",
		command: PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE,
		execute: async (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				calendarId: data.calendarId,
				code: data.code,
				name: data.name,
				currencyCode: data.currencyCode,
			});
			return store.createPayGroup(
				{
					organizationId: data.organizationId,
					calendarId: data.calendarId,
					code: data.code,
					name: data.name,
					currencyCode: data.currencyCode,
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

export async function updatePayrollPayGroup(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayGroup>> {
	return runPayrollSetupCommand(input, options, {
		schema: updatePayrollPayGroupInputSchema,
		invalidMessage: "Invalid payroll pay group update input",
		command: PAYROLL_COMMAND_SETUP_PAY_GROUP_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updatePayGroup(
				{
					organizationId: data.organizationId,
					payGroupId: data.payGroupId,
					name: data.name,
					currencyCode: data.currencyCode,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function archivePayrollPayGroup(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayGroup>> {
	return runPayrollSetupCommand(input, options, {
		schema: archivePayrollPayGroupInputSchema,
		invalidMessage: "Invalid payroll pay group archive input",
		command: PAYROLL_COMMAND_SETUP_PAY_GROUP_ARCHIVE,
		execute: async (data, { store, ports }) =>
			store.archivePayGroup(
				{
					organizationId: data.organizationId,
					payGroupId: data.payGroupId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function getPayrollPayGroup(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayGroup | null>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollPayGroupInputSchema,
		invalidMessage: "Invalid payroll pay group get input",
		query: PAYROLL_QUERY_SETUP_PAY_GROUP_GET,
		execute: async (data, { store }) =>
			store.getPayGroup({
				organizationId: data.organizationId,
				payGroupId: data.payGroupId,
			}),
	});
}

export async function listPayrollPayGroups(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPayGroup[]>> {
	return runPayrollSetupQuery(input, options, {
		schema: listPayrollPayGroupsInputSchema,
		invalidMessage: "Invalid payroll pay group list input",
		query: PAYROLL_QUERY_SETUP_PAY_GROUP_LIST,
		execute: async (data, { store }) =>
			store.listPayGroups({
				organizationId: data.organizationId,
				status: data.status,
			}),
	});
}

export const PAYROLL_AGGREGATE_PAY_GROUP = "pay-group" as const;
export type PayrollPayGroupAggregate = typeof PAYROLL_AGGREGATE_PAY_GROUP;
