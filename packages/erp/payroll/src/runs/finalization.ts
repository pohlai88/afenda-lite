import { fail, ok, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_INVALID_STATE,
	payrollErrorDetails,
} from "../error-codes";
import { PAYROLL_COMMAND_RUN_FINALIZE } from "../module-ids";
import { finalizePayrollRunInputSchema } from "../schemas/runs";
import { runPayrollSetupCommand } from "../shared/setup-command";
import type { PayrollRun } from "../types";
import {
	hasBlockingPayrollExceptions,
	loadPayrollRun,
	transitionPayrollRun,
} from "./run-helpers";
import { assertPayrollRunTransition } from "./transitions";

export const PAYROLL_AGGREGATE_FINALIZATION = "finalization" as const;
export type PayrollFinalizationAggregate = typeof PAYROLL_AGGREGATE_FINALIZATION;

export async function finalizePayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollSetupCommand(input, options, {
		schema: finalizePayrollRunInputSchema,
		invalidMessage: "Invalid payroll run finalize input",
		command: PAYROLL_COMMAND_RUN_FINALIZE,
		execute: async (data, { store, ports }) => {
			const loaded = await loadPayrollRun(store, {
				organizationId: data.organizationId,
				runId: data.runId,
			});
			if (!loaded.ok) {
				return loaded;
			}
			const run = loaded.data;

			if (run.status === "finalized") {
				return ok(run);
			}

			if (run.status !== "calculated") {
				const blocked = assertPayrollRunTransition(run.status, "finalized");
				if (!blocked.ok) {
					return blocked;
				}
			}

			const exceptions = await store.listExceptionsForRun({
				organizationId: data.organizationId,
				runId: data.runId,
			});
			if (!exceptions.ok) {
				return exceptions;
			}
			if (hasBlockingPayrollExceptions(exceptions.data)) {
				return fail(
					"CONFLICT",
					"Blocking payroll exceptions prevent finalization",
					payrollErrorDetails(PAYROLL_ERROR_INVALID_STATE),
				);
			}

			return transitionPayrollRun(store, ports, {
				run,
				toStatus: "finalized",
				expectedVersion: data.expectedVersion,
				finalizedAt: new Date().toISOString(),
				finalizedBy: data.actorUserId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
			});
		},
	});
}
