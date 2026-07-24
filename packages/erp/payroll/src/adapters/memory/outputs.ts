import { ok, type Result } from "@afenda/errors/result";

import type { PayrollRunId } from "../../brands";
import type { MutationPorts } from "../../ports";
import { mapInvalidState, mapNotFound } from "../../shared/persistence-errors";
import type { PayrollOutputsStore } from "../../store/outputs";
import type {
	PayrollResultLine,
	PayrollRunEmployee,
	ReplaceRunCalculationOutputsInput,
} from "../../types";
import type { OutputsMemoryState, RunsMemoryState } from "./state";

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

function cloneRunEmployee(entity: PayrollRunEmployee): PayrollRunEmployee {
	return { ...entity, snapshotJson: { ...entity.snapshotJson } };
}

function cloneResultLine(entity: PayrollResultLine): PayrollResultLine {
	return { ...entity };
}

function assertRunAllowsOutputMutation(
	runs: RunsMemoryState,
	input: { organizationId: string; runId: PayrollRunId },
): Result<true> {
	const run = runs.runs.get(input.runId);
	if (run === undefined || run.organizationId !== input.organizationId) {
		return mapNotFound("Payroll run not found");
	}
	if (run.status === "finalized" || run.status === "reversed") {
		return mapInvalidState(
			"Finalized or reversed payroll runs cannot change calculation outputs",
		);
	}
	return ok(true);
}

export function createMemoryOutputsMethods(input: {
	outputs: OutputsMemoryState;
	runs: RunsMemoryState;
}): PayrollOutputsStore {
	const { outputs, runs } = input;

	return {
		async deleteCalculationOutputsForRun(deleteInput, ports) {
			const allowed = assertRunAllowsOutputMutation(runs, deleteInput);
			if (!allowed.ok) {
				return allowed;
			}

			let deletedLines = 0;
			for (const [id, line] of outputs.resultLines.entries()) {
				if (
					line.organizationId === deleteInput.organizationId &&
					line.runId === deleteInput.runId
				) {
					outputs.resultLines.delete(id);
					deletedLines += 1;
				}
			}
			for (const [id, employee] of outputs.runEmployees.entries()) {
				if (
					employee.organizationId === deleteInput.organizationId &&
					employee.runId === deleteInput.runId
				) {
					outputs.runEmployees.delete(id);
				}
			}
			void deletedLines;

			const audit = await recordAudit(ports, {
				organizationId: deleteInput.organizationId,
				actorUserId: deleteInput.actorUserId,
				correlationId: deleteInput.correlationId,
				entity: "payroll_run",
				entityId: deleteInput.runId,
				action: "DELETE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok({ deleted: true });
		},

		async replaceRunCalculationOutputs(replaceInput, ports) {
			const deleted = await this.deleteCalculationOutputsForRun(
				{
					organizationId: replaceInput.organizationId,
					runId: replaceInput.runId,
					actorUserId: replaceInput.actorUserId,
					correlationId: replaceInput.correlationId,
				},
				ports,
			);
			if (!deleted.ok) {
				return deleted;
			}

			const now = new Date();
			const runEmployees: PayrollRunEmployee[] = [];
			const resultLines: PayrollResultLine[] = [];

			for (const employee of replaceInput.runEmployees) {
				const record: PayrollRunEmployee = {
					id: employee.id,
					organizationId: replaceInput.organizationId,
					runId: replaceInput.runId,
					employeeId: employee.employeeId,
					assignmentId: employee.assignmentId,
					currencyCode: employee.currencyCode,
					gross: employee.gross,
					employeeDeductions: employee.employeeDeductions,
					employeeStatutory: employee.employeeStatutory,
					employerCost: employee.employerCost,
					net: employee.net,
					snapshotJson: employee.snapshotJson,
					snapshotHash: employee.snapshotHash,
					calculationVersion: employee.calculationVersion,
					status: employee.status,
					createdAt: now,
					updatedAt: now,
				};
				outputs.runEmployees.set(record.id, record);
				runEmployees.push(cloneRunEmployee(record));
			}

			for (const line of replaceInput.resultLines) {
				const record: PayrollResultLine = {
					id: line.id,
					organizationId: replaceInput.organizationId,
					runId: replaceInput.runId,
					runEmployeeId: line.runEmployeeId,
					employeeId: line.employeeId,
					lineKind: line.lineKind,
					code: line.code,
					ruleCode: line.ruleCode,
					ruleVersion: line.ruleVersion,
					ruleKind: line.ruleKind,
					amount: line.amount,
					currencyCode: line.currencyCode,
					sourceType: line.sourceType,
					sourceId: line.sourceId,
					sequence: line.sequence,
					traceRef: line.traceRef,
					createdAt: now,
					updatedAt: now,
				};
				outputs.resultLines.set(record.id, record);
				resultLines.push(cloneResultLine(record));
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

			return ok({ runEmployees, resultLines });
		},

		async listRunEmployeesForRun(listInput) {
			const runEmployees = Array.from(outputs.runEmployees.values()).filter(
				(employee) =>
					employee.organizationId === listInput.organizationId &&
					employee.runId === listInput.runId,
			);
			return ok(runEmployees.map(cloneRunEmployee));
		},

		async listResultLinesForRun(listInput) {
			const resultLines = Array.from(outputs.resultLines.values()).filter(
				(line) =>
					line.organizationId === listInput.organizationId &&
					line.runId === listInput.runId,
			);
			return ok(resultLines.map(cloneResultLine));
		},
	};
}
