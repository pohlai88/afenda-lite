// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous payroll statutory ports.
import { errorResult, type Result } from "@afenda/errors";
import type {
	PayrollRun,
	PayrollStatutoryResult,
} from "../../kernel/contracts/projected-types";
import {
	mapInvalidState,
	mapNotFound,
} from "../../kernel/execution/persistence-errors";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
import type {
	PayrollRunId,
	PayrollStatutoryResultId,
} from "../../kernel/identity/brands";
import type { PayrollStatutoryStore } from "./statutory.store";

export interface StatutoryMemoryState {
	statutoryResults: Map<PayrollStatutoryResultId, PayrollStatutoryResult>;
}

interface StatutoryRunState {
	runs: Map<PayrollRunId, PayrollRun>;
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
	runs: StatutoryRunState,
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
	return errorResult.ok(true);
}

export function createMemoryStatutoryMethods(input: {
	statutory: StatutoryMemoryState;
	runs: StatutoryRunState;
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

			return errorResult.ok(results);
		},

		async listStatutoryResultsForRun(listInput) {
			const results = Array.from(statutory.statutoryResults.values()).filter(
				(result) =>
					result.organizationId === listInput.organizationId &&
					result.runId === listInput.runId,
			);
			return errorResult.ok(results.map(cloneStatutoryResult));
		},
	};
}
