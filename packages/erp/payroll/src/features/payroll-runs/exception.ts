import { errorResult, type Result } from "@afenda/errors";
import type { PayrollException } from "../../kernel/contracts/projected-types";
import {
	runPayrollCommand,
	runPayrollQuery,
} from "../../kernel/execution/execute-operation";
import {
	PAYROLL_COMMAND_RUN_CALCULATE,
	PAYROLL_QUERY_RUN_GET,
} from "../../kernel/operations/module-ids";
import type { PayrollRunCommandOptions as PayrollCommandOptions } from "./operation-store";
import { loadPayrollRun } from "./run-helpers";
import {
	listPayrollExceptionsForRunInputSchema,
	recordPayrollExceptionInputSchema,
} from "./runs.schema";

export function recordPayrollException(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollException>> {
	return runPayrollCommand(input, options, {
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Cannot record exceptions on reversed payroll runs",
				});
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

export function listPayrollExceptionsForRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollException[]>> {
	return runPayrollQuery(input, options, {
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
