import { fail, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_INVALID_STATE,
	payrollErrorDetails,
} from "../error-codes";
import {
	PAYROLL_COMMAND_RUN_CALCULATE,
	PAYROLL_QUERY_RUN_GET,
} from "../module-ids";
import {
	listPayrollExceptionsForRunInputSchema,
	recordPayrollExceptionInputSchema,
} from "../schemas/runs";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type { PayrollException } from "../types";
import { loadPayrollRun } from "./run-helpers";

export const PAYROLL_AGGREGATE_EXCEPTION = "exception" as const;
export type PayrollExceptionAggregate = typeof PAYROLL_AGGREGATE_EXCEPTION;

export async function recordPayrollException(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollException>> {
	return runPayrollSetupCommand(input, options, {
		schema: recordPayrollExceptionInputSchema,
		invalidMessage: "Invalid payroll exception record input",
		command: PAYROLL_COMMAND_RUN_CALCULATE,
		execute: async (data, { store, ports }) => {
			const loaded = await loadPayrollRun(store, {
				organizationId: data.organizationId,
				runId: data.runId,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (loaded.data.status === "reversed") {
				return fail(
					"CONFLICT",
					"Cannot record exceptions on reversed payroll runs",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}

			return store.createException(
				{
					organizationId: data.organizationId,
					runId: data.runId,
					severity: data.severity,
					exceptionCode: data.exceptionCode,
					message: data.message,
					employeeRef: data.employeeRef,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function listPayrollExceptionsForRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollException[]>> {
	return runPayrollSetupQuery(input, options, {
		schema: listPayrollExceptionsForRunInputSchema,
		invalidMessage: "Invalid payroll exception list input",
		query: PAYROLL_QUERY_RUN_GET,
		execute: async (data, { store }) =>
			store.listExceptionsForRun({
				organizationId: data.organizationId,
				runId: data.runId,
			}),
	});
}
