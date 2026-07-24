import { ok, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import { PAYROLL_COMMAND_RUN_CALCULATE } from "../module-ids";
import { calculatePayrollRunInputSchema } from "../schemas/runs";
import { assertExpectedVersion } from "../shared/concurrency";
import { runPayrollSetupCommand } from "../shared/setup-command";
import type { PayrollRun } from "../types";
import {
	loadPayrollRun,
	persistPayrollRunExceptions,
	requirePayrollRunCalculator,
	transitionPayrollRun,
} from "./run-helpers";
import { assertPayrollRunTransition } from "./transitions";

export async function calculatePayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollSetupCommand(input, options, {
		schema: calculatePayrollRunInputSchema,
		invalidMessage: "Invalid payroll run calculate input",
		command: PAYROLL_COMMAND_RUN_CALCULATE,
		execute: async (data, { store, ports, calculator }) => {
			const calculatorPort = requirePayrollRunCalculator(calculator);
			if (!calculatorPort.ok) {
				return calculatorPort;
			}

			const loaded = await loadPayrollRun(store, {
				organizationId: data.organizationId,
				runId: data.runId,
			});
			if (!loaded.ok) {
				return loaded;
			}
			let run = loaded.data;

			if (run.status === "calculated") {
				return ok(run);
			}
			if (run.status === "finalized" || run.status === "reversed") {
				const blocked = assertPayrollRunTransition(run.status, "calculated");
				return blocked.ok ? ok(run) : blocked;
			}

			if (run.status === "draft" || run.status === "failed") {
				const toCalculating = await transitionPayrollRun(store, ports, {
					run,
					toStatus: "calculating",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				});
				if (!toCalculating.ok) {
					return toCalculating;
				}
				run = toCalculating.data;
			} else if (run.status === "calculating") {
				const versionCheck = assertExpectedVersion(
					run.version,
					data.expectedVersion,
				);
				if (!versionCheck.ok) {
					return versionCheck;
				}
			} else {
				const blocked = assertPayrollRunTransition(run.status, "calculated");
				return blocked.ok ? ok(run) : blocked;
			}

			const clearedExceptions = await store.deleteExceptionsForRun(
				{
					organizationId: data.organizationId,
					runId: data.runId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
			if (!clearedExceptions.ok) {
				return clearedExceptions;
			}

			const calculated = await calculatorPort.data.calculate(
				{
					organizationId: run.organizationId,
					runId: run.id,
					payGroupId: run.payGroupId,
					periodId: run.periodId,
					runType: run.runType,
					sequence: run.sequence,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
			if (!calculated.ok) {
				const failed = await transitionPayrollRun(store, ports, {
					run,
					toStatus: "failed",
					expectedVersion: run.version,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				});
				return failed.ok ? failed : calculated;
			}

			if (calculated.data.exceptions.length > 0) {
				const persisted = await persistPayrollRunExceptions(store, ports, {
					organizationId: data.organizationId,
					runId: run.id,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
					exceptions: calculated.data.exceptions,
				});
				if (!persisted.ok) {
					return persisted;
				}
			}

			const hasBlocking = calculated.data.exceptions.some(
				(exception) => exception.severity === "blocking",
			);

			return transitionPayrollRun(store, ports, {
				run,
				toStatus: hasBlocking ? "failed" : "calculated",
				expectedVersion: run.version,
				calculationSnapshotHash: calculated.data.calculationSnapshotHash,
				calculationVersion: calculated.data.calculationVersion,
				roundingPolicyJson: calculated.data.roundingPolicyJson,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
			});
		},
	});
}
