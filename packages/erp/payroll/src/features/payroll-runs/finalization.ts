import { errorResult, type Result } from "@afenda/errors";
import type { PayrollRun } from "../../kernel/contracts/projected-types";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import { PAYROLL_COMMAND_RUN_FINALIZE } from "../../kernel/operations/module-ids";
import { buildPayrollFinalizationProjection } from "../calculation/finalization-evidence";
import type { PayrollRunCommandOptions as PayrollCommandOptions } from "./operation-store";
import {
	hasBlockingPayrollExceptions,
	loadPayrollRun,
	transitionPayrollRun,
} from "./run-helpers";
import { finalizePayrollRunInputSchema } from "./runs.schema";
import { assertPayrollRunTransition } from "./transitions";

export function finalizePayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollCommand(input, options, {
		schema: finalizePayrollRunInputSchema,
		invalidMessage: "Invalid payroll run finalize input",
		command: PAYROLL_COMMAND_RUN_FINALIZE,
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Finalization deliberately verifies authorization, blockers, persisted evidence, and the atomic transition boundary.
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
				return errorResult.ok(run);
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Blocking payroll exceptions prevent finalization",
				});
			}
			const [period, runEmployees, resultLines] = await Promise.all([
				store.getPeriod({
					organizationId: data.organizationId,
					periodId: run.periodId,
				}),
				store.listRunEmployeesForRun({
					organizationId: data.organizationId,
					runId: run.id,
				}),
				store.listResultLinesForRun({
					organizationId: data.organizationId,
					runId: run.id,
				}),
			]);
			if (!period.ok) {
				return period;
			}
			if (!runEmployees.ok) {
				return runEmployees;
			}
			if (!resultLines.ok) {
				return resultLines;
			}
			if (period.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Payroll period not found",
				});
			}
			const finalizationProjection = buildPayrollFinalizationProjection({
				run,
				periodEnd: period.data.periodEnd,
				runEmployees: runEmployees.data,
				resultLines: resultLines.data,
			});
			if (!finalizationProjection.ok) {
				return finalizationProjection;
			}

			return transitionPayrollRun(store, ports, {
				run,
				toStatus: "finalized",
				expectedVersion: data.expectedVersion,
				finalizedAt: new Date().toISOString(),
				finalizedBy: data.actorUserId,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				finalizationProjection: finalizationProjection.data,
			});
		},
	});
}
