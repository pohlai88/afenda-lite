import { ok, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import { PAYROLL_COMMAND_RUN_REVERSE } from "../module-ids";
import { reversePayrollRunInputSchema } from "../schemas/runs";
import { runPayrollSetupCommand } from "../shared/setup-command";
import type { PayrollRun } from "../types";
import { loadPayrollRun, transitionPayrollRun } from "./run-helpers";
import { assertPayrollRunTransition } from "./transitions";

export const PAYROLL_AGGREGATE_REVERSAL = "reversal" as const;
export type PayrollReversalAggregate = typeof PAYROLL_AGGREGATE_REVERSAL;

export async function reversePayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollSetupCommand(input, options, {
		schema: reversePayrollRunInputSchema,
		invalidMessage: "Invalid payroll run reverse input",
		command: PAYROLL_COMMAND_RUN_REVERSE,
		execute: async (data, { store, ports }) => {
			const loaded = await loadPayrollRun(store, {
				organizationId: data.organizationId,
				runId: data.runId,
			});
			if (!loaded.ok) {
				return loaded;
			}
			const run = loaded.data;

			if (run.status === "reversed") {
				return ok(run);
			}

			if (run.status !== "finalized") {
				const blocked = assertPayrollRunTransition(run.status, "reversed");
				if (!blocked.ok) {
					return blocked;
				}
			}

			return transitionPayrollRun(store, ports, {
				run,
				toStatus: "reversed",
				expectedVersion: data.expectedVersion,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
			});
		},
	});
}
