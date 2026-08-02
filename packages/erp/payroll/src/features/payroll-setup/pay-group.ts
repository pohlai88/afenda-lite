import type { Result } from "@afenda/errors";
import type { PayrollPayGroup } from "../../kernel/contracts/projected-types";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	PAYROLL_COMMAND_SETUP_PAY_GROUP_ARCHIVE,
	PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE,
	PAYROLL_COMMAND_SETUP_PAY_GROUP_UPDATE,
	PAYROLL_QUERY_SETUP_PAY_GROUP_GET,
	PAYROLL_QUERY_SETUP_PAY_GROUP_LIST,
} from "../../kernel/operations/module-ids";
import {
	archivePayrollPayGroupInputSchema,
	createPayrollPayGroupInputSchema,
	getPayrollPayGroupInputSchema,
	listPayrollPayGroupsInputSchema,
	updatePayrollPayGroupInputSchema,
} from "./setup.schema";
import type {
	PayrollSetupCommandOptions,
	PayrollSetupQueryOptions,
} from "./setup-operation";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "./setup-operation";

export function createPayrollPayGroup(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
): Promise<Result<PayrollPayGroup>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollPayGroupInputSchema,
		invalidMessage: "Invalid payroll pay group create input",
		command: PAYROLL_COMMAND_SETUP_PAY_GROUP_CREATE,
		execute: (data, { store, ports }) => {
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

export function updatePayrollPayGroup(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
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

export function archivePayrollPayGroup(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
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

export function getPayrollPayGroup(
	input: unknown,
	options: PayrollSetupQueryOptions = {},
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

export function listPayrollPayGroups(
	input: unknown,
	options: PayrollSetupQueryOptions = {},
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
