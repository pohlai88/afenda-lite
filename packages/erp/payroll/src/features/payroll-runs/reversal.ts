import { errorResult, type Result } from "@afenda/errors";
import type { PayrollRun } from "../../kernel/contracts/projected-types";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import { mapConflict } from "../../kernel/execution/persistence-errors";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import { PAYROLL_COMMAND_RUN_REVERSE } from "../../kernel/operations/module-ids";
import { buildPayrollReversalProjection } from "../calculation/finalization-evidence";
import type { PayrollRunCommandOptions as PayrollCommandOptions } from "./operation-store";
import { loadPayrollRun, transitionPayrollRun } from "./run-helpers";
import { reversePayrollRunInputSchema } from "./runs.schema";
import { assertPayrollRunTransition } from "./transitions";

function resolveReversalReplay(input: {
	run: PayrollRun;
	idempotencyKey: string;
	requestFingerprint: string;
}): Result<PayrollRun> | null {
	if (input.run.status !== "reversed") {
		return null;
	}
	return input.run.reversalIdempotencyKey === input.idempotencyKey &&
		input.run.reversalRequestFingerprint === input.requestFingerprint
		? errorResult.ok(input.run)
		: mapConflict("Payroll reversal idempotency conflict");
}

export function reversePayrollRun(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollRun>> {
	return runPayrollCommand(input, options, {
		schema: reversePayrollRunInputSchema,
		invalidMessage: "Invalid payroll run reverse input",
		command: PAYROLL_COMMAND_RUN_REVERSE,
		execute: async (data, { store, ports }) => {
			const reversalRequestFingerprint = buildPayrollCreateFingerprint({
				runId: data.runId,
				expectedVersion: data.expectedVersion,
				reasonCode: data.reasonCode,
				reason: data.reason,
				actorUserId: data.actorUserId,
			});
			const loaded = await loadPayrollRun(store, {
				organizationId: data.organizationId,
				runId: data.runId,
			});
			if (!loaded.ok) {
				return loaded;
			}
			const run = loaded.data;

			const replay = resolveReversalReplay({
				run,
				idempotencyKey: data.idempotencyKey,
				requestFingerprint: reversalRequestFingerprint,
			});
			if (replay !== null) {
				return replay;
			}

			if (run.status !== "finalized") {
				const blocked = assertPayrollRunTransition(run.status, "reversed");
				if (!blocked.ok) {
					return blocked;
				}
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
			const reversalProjection = buildPayrollReversalProjection({
				run,
				periodEnd: period.data.periodEnd,
				reason: data.reason,
				reasonCode: data.reasonCode,
				runEmployees: runEmployees.data,
				resultLines: resultLines.data,
			});
			if (!reversalProjection.ok) {
				return reversalProjection;
			}

			return transitionPayrollRun(store, ports, {
				run,
				toStatus: "reversed",
				expectedVersion: data.expectedVersion,
				actorUserId: data.actorUserId,
				correlationId: data.correlationId,
				auditReason: data.reason,
				reversalReasonCode: data.reasonCode,
				reversalIdempotencyKey: data.idempotencyKey,
				reversalRequestFingerprint,
				reversalProjection: reversalProjection.data,
			});
		},
	});
}
