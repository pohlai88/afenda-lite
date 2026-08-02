import type { Result } from "@afenda/errors";
import type { PayrollPeriod } from "../../kernel/contracts/projected-types";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	PAYROLL_COMMAND_SETUP_PERIOD_CLOSE,
	PAYROLL_COMMAND_SETUP_PERIOD_CREATE,
	PAYROLL_COMMAND_SETUP_PERIOD_UPDATE,
	PAYROLL_QUERY_SETUP_PERIOD_GET,
	PAYROLL_QUERY_SETUP_PERIOD_LIST,
} from "../../kernel/operations/module-ids";
import {
	closePayrollPeriodInputSchema,
	createPayrollPeriodInputSchema,
	getPayrollPeriodInputSchema,
	listPayrollPeriodsInputSchema,
	updatePayrollPeriodInputSchema,
} from "../payroll-setup/setup.schema";
import type { PayrollRunCommandOptions as PayrollCommandOptions } from "./operation-store";

export function createPayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod>> {
	return runPayrollCommand(input, options, {
		schema: createPayrollPeriodInputSchema,
		invalidMessage: "Invalid payroll period create input",
		command: PAYROLL_COMMAND_SETUP_PERIOD_CREATE,
		execute: (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				payGroupId: data.payGroupId,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
				cutoffDate: data.cutoffDate,
			});
			return store.createPeriod(
				{
					organizationId: data.organizationId,
					payGroupId: data.payGroupId,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					cutoffDate: data.cutoffDate,
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

export function updatePayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod>> {
	return runPayrollCommand(input, options, {
		schema: updatePayrollPeriodInputSchema,
		invalidMessage: "Invalid payroll period update input",
		command: PAYROLL_COMMAND_SETUP_PERIOD_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updatePeriod(
				{
					organizationId: data.organizationId,
					periodId: data.periodId,
					cutoffDate: data.cutoffDate,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export function closePayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod>> {
	return runPayrollCommand(input, options, {
		schema: closePayrollPeriodInputSchema,
		invalidMessage: "Invalid payroll period close input",
		command: PAYROLL_COMMAND_SETUP_PERIOD_CLOSE,
		execute: async (data, { store, ports }) =>
			store.closePeriod(
				{
					organizationId: data.organizationId,
					periodId: data.periodId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export function getPayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod | null>> {
	return runPayrollQuery(input, options, {
		schema: getPayrollPeriodInputSchema,
		invalidMessage: "Invalid payroll period get input",
		query: PAYROLL_QUERY_SETUP_PERIOD_GET,
		execute: async (data, { store }) =>
			store.getPeriod({
				organizationId: data.organizationId,
				periodId: data.periodId,
			}),
	});
}

export function listPayrollPeriods(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod[]>> {
	return runPayrollQuery(input, options, {
		schema: listPayrollPeriodsInputSchema,
		invalidMessage: "Invalid payroll period list input",
		query: PAYROLL_QUERY_SETUP_PERIOD_LIST,
		execute: async (data, { store }) =>
			store.listPeriodsForPayGroup({
				organizationId: data.organizationId,
				payGroupId: data.payGroupId,
				status: data.status,
			}),
	});
}
