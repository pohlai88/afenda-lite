import { fail, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_CROSS_ORGANIZATION_REFERENCE,
	PAYROLL_ERROR_INVALID_STATE,
	PAYROLL_ERROR_NOT_FOUND,
	payrollErrorDetails,
} from "../error-codes";
import {
	PAYROLL_COMMAND_RUN_CREATE,
	PAYROLL_QUERY_RUN_GET,
} from "../module-ids";
import {
	createPayrollRunInputSchema,
	getPayrollRunInputSchema,
} from "../schemas/runs";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type { PayrollRun } from "../types";
import { loadPayrollRun } from "./run-helpers";

export const PAYROLL_AGGREGATE_PAYROLL_RUN = "payroll-run" as const;
export type PayrollPayrollRunAggregate = typeof PAYROLL_AGGREGATE_PAYROLL_RUN;

export async function createPayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollRunInputSchema,
		invalidMessage: "Invalid payroll run create input",
		command: PAYROLL_COMMAND_RUN_CREATE,
		execute: async (data, { store, ports }) => {
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
			if (period.data.status !== "open") {
				return fail(
					"CONFLICT",
					"Payroll period is not open",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}
			if (period.data.payGroupId !== data.payGroupId) {
				return fail(
					"CONFLICT",
					"Pay group does not match payroll period",
					payrollErrorDetails(PAYROLL_ERROR_CROSS_ORGANIZATION_REFERENCE),
				);
			}

			const fingerprint = buildPayrollCreateFingerprint({
				payGroupId: data.payGroupId,
				periodId: data.periodId,
				runType: data.runType,
				sequence: data.sequence,
			});
			return store.createRun(
				{
					organizationId: data.organizationId,
					payGroupId: data.payGroupId,
					periodId: data.periodId,
					runType: data.runType,
					sequence: data.sequence,
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

export async function getPayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollRunInputSchema,
		invalidMessage: "Invalid payroll run get input",
		query: PAYROLL_QUERY_RUN_GET,
		execute: async (data, { store }) =>
			loadPayrollRun(store, {
				organizationId: data.organizationId,
				runId: data.runId,
			}),
	});
}
