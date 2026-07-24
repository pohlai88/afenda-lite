import type { Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_COMMAND_SETUP_PERIOD_CLOSE,
	PAYROLL_COMMAND_SETUP_PERIOD_CREATE,
	PAYROLL_COMMAND_SETUP_PERIOD_UPDATE,
	PAYROLL_QUERY_SETUP_PERIOD_GET,
	PAYROLL_QUERY_SETUP_PERIOD_LIST,
} from "../module-ids";
import {
	closePayrollPeriodInputSchema,
	createPayrollPeriodInputSchema,
	getPayrollPeriodInputSchema,
	listPayrollPeriodsInputSchema,
	updatePayrollPeriodInputSchema,
} from "../schemas/setup";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type { PayrollPeriod } from "../types";

export async function createPayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollPeriodInputSchema,
		invalidMessage: "Invalid payroll period create input",
		command: PAYROLL_COMMAND_SETUP_PERIOD_CREATE,
		execute: async (data, { store, ports }) => {
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

export async function updatePayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod>> {
	return runPayrollSetupCommand(input, options, {
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

export async function closePayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod>> {
	return runPayrollSetupCommand(input, options, {
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

export async function getPayrollPeriod(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod | null>> {
	return runPayrollSetupQuery(input, options, {
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

export async function listPayrollPeriods(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollPeriod[]>> {
	return runPayrollSetupQuery(input, options, {
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

export const PAYROLL_AGGREGATE_PAYROLL_PERIOD = "payroll-period" as const;
export type PayrollPayrollPeriodAggregate =
	typeof PAYROLL_AGGREGATE_PAYROLL_PERIOD;
