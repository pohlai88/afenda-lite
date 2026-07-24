import { ok, type Result } from "@afenda/errors/result";

import type { PayrollRunId } from "../../brands";
import type { MutationPorts } from "../../ports";
import { mapInvalidState, mapNotFound } from "../../shared/persistence-errors";
import type { PayrollStatutoryStore } from "../../store/statutory";
import type { PayrollStatutoryResult } from "../../types";
import type { RunsMemoryState, StatutoryMemoryState } from "./state";

async function recordAudit(
	ports: MutationPorts,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		entity: string;
		entityId: string;
		action: "CREATE" | "UPDATE" | "DELETE";
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: [],
	});
}

function cloneStatutoryResult(
	entity: PayrollStatutoryResult,
): PayrollStatutoryResult {
	return {
		...entity,
		configSnapshotJson: { ...entity.configSnapshotJson },
	};
}

function assertRunAllowsStatutoryMutation(
	runs: RunsMemoryState,
	input: { organizationId: string; runId: PayrollRunId },
): Result<true> {
	const run = runs.runs.get(input.runId);
	if (run === undefined || run.organizationId !== input.organizationId) {
		return mapNotFound("Payroll run not found");
	}
	if (run.status === "finalized" || run.status === "reversed") {
		return mapInvalidState(
			"Finalized or reversed payroll runs cannot change statutory results",
		);
	}
	return ok(true);
}

export function createMemoryStatutoryMethods(input: {
	statutory: StatutoryMemoryState;
	runs: RunsMemoryState;
}): PayrollStatutoryStore {
	const { statutory, runs } = input;

	return {
		async replaceStatutoryResultsForRun(replaceInput, ports) {
			const allowed = assertRunAllowsStatutoryMutation(runs, replaceInput);
			if (!allowed.ok) {
				return allowed;
			}

			for (const [id, result] of statutory.statutoryResults.entries()) {
				if (
					result.organizationId === replaceInput.organizationId &&
					result.runId === replaceInput.runId
				) {
					statutory.statutoryResults.delete(id);
				}
			}

			const now = new Date();
			const results: PayrollStatutoryResult[] = [];
			for (const result of replaceInput.results) {
				const record: PayrollStatutoryResult = {
					id: result.id,
					organizationId: replaceInput.organizationId,
					runId: replaceInput.runId,
					runEmployeeId: result.runEmployeeId,
					employeeId: result.employeeId,
					jurisdictionCode: result.jurisdictionCode,
					ruleCode: result.ruleCode,
					ruleVersion: result.ruleVersion,
					calculatorId: result.calculatorId,
					baseAmount: result.baseAmount,
					employeeAmount: result.employeeAmount,
					employerAmount: result.employerAmount,
					currencyCode: result.currencyCode,
					configSnapshotJson: result.configSnapshotJson,
					createdAt: now,
					updatedAt: now,
				};
				statutory.statutoryResults.set(record.id, record);
				results.push(cloneStatutoryResult(record));
			}

			const audit = await recordAudit(ports, {
				organizationId: replaceInput.organizationId,
				actorUserId: replaceInput.actorUserId,
				correlationId: replaceInput.correlationId,
				entity: "payroll_run",
				entityId: replaceInput.runId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok(results);
		},

		async listStatutoryResultsForRun(listInput) {
			const results = Array.from(statutory.statutoryResults.values()).filter(
				(result) =>
					result.organizationId === listInput.organizationId &&
					result.runId === listInput.runId,
			);
			return ok(results.map(cloneStatutoryResult));
		},
	};
}
