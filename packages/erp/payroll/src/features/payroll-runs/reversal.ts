import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import type { PayrollRun } from "../../kernel/contracts/projected-types";
import { runPayrollCommand } from "../../kernel/execution/execute-operation";
import { mapConflict } from "../../kernel/execution/persistence-errors";
import type { MutationPorts } from "../../kernel/execution/ports";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import { PAYROLL_COMMAND_RUN_REVERSE } from "../../kernel/operations/module-ids";
import { buildPayrollReversalProjection } from "../calculation/finalization-evidence";
import type { PayrollReconciliationStore } from "../reconciliation/reconciliation.store";
import { assertPayrollRunUnsettledForReversal } from "../settlement-ingress/run-settlement-policy";
import type { PayrollRunCommandOptions as PayrollCommandOptions } from "./operation-store";
import { loadPayrollRun, transitionPayrollRun } from "./run-helpers";
import { reversePayrollRunInputSchema } from "./runs.schema";
import { assertPayrollRunTransition } from "./transitions";

type ReversePayrollRunInput = z.infer<typeof reversePayrollRunInputSchema>;

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

async function validatePayrollRunReversalPreconditions(
	store: PayrollReconciliationStore,
	run: PayrollRun,
	input: {
		organizationId: string;
	},
): Promise<Result<void>> {
	if (run.status !== "finalized") {
		const blocked = assertPayrollRunTransition(run.status, "reversed");
		if (!blocked.ok) {
			return blocked;
		}
	}
	return await assertPayrollRunUnsettledForReversal(store, {
		organizationId: input.organizationId,
		runId: run.id,
	});
}

async function buildPayrollRunReversalTransition(input: {
	store: NonNullable<PayrollCommandOptions["store"]>;
	ports: MutationPorts;
	run: PayrollRun;
	data: ReversePayrollRunInput;
	reversalRequestFingerprint: string;
}): Promise<Result<PayrollRun>> {
	const [period, runEmployees, resultLines] = await Promise.all([
		input.store.getPeriod({
			organizationId: input.data.organizationId,
			periodId: input.run.periodId,
		}),
		input.store.listRunEmployeesForRun({
			organizationId: input.data.organizationId,
			runId: input.run.id,
		}),
		input.store.listResultLinesForRun({
			organizationId: input.data.organizationId,
			runId: input.run.id,
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
		run: input.run,
		periodEnd: period.data.periodEnd,
		reason: input.data.reason,
		reasonCode: input.data.reasonCode,
		runEmployees: runEmployees.data,
		resultLines: resultLines.data,
	});
	if (!reversalProjection.ok) {
		return reversalProjection;
	}

	return transitionPayrollRun(input.store, input.ports, {
		run: input.run,
		toStatus: "reversed",
		expectedVersion: input.data.expectedVersion,
		actorUserId: input.data.actorUserId,
		correlationId: input.data.correlationId,
		auditReason: input.data.reason,
		reversalReasonCode: input.data.reasonCode,
		reversalIdempotencyKey: input.data.idempotencyKey,
		reversalRequestFingerprint: input.reversalRequestFingerprint,
		reversalProjection: reversalProjection.data,
	});
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

			const preconditions = await validatePayrollRunReversalPreconditions(
				store,
				run,
				{
					organizationId: data.organizationId,
				},
			);
			if (!preconditions.ok) {
				return preconditions;
			}

			return buildPayrollRunReversalTransition({
				store,
				ports,
				run,
				data,
				reversalRequestFingerprint,
			});
		},
	});
}
