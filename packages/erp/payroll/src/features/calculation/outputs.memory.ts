// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous payroll output ports.
import { errorResult, type Result } from "@afenda/errors";
import type {
	PayrollResultLine,
	PayrollRun,
	PayrollRunEmployee,
} from "../../kernel/contracts/projected-types";
import {
	mapInvalidState,
	mapNotFound,
} from "../../kernel/execution/persistence-errors";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
import type {
	PayrollResultLineId,
	PayrollRunEmployeeId,
	PayrollRunId,
} from "../../kernel/identity/brands";
import type { PayrollOutputsStore } from "./outputs.store";

export interface OutputsMemoryState {
	resultLines: Map<PayrollResultLineId, PayrollResultLine>;
	runEmployees: Map<PayrollRunEmployeeId, PayrollRunEmployee>;
}

interface OutputRunState {
	runs: Map<PayrollRunId, PayrollRun>;
}

function cloneRunEmployee(entity: PayrollRunEmployee): PayrollRunEmployee {
	return { ...entity, snapshotJson: { ...entity.snapshotJson } };
}

function cloneResultLine(entity: PayrollResultLine): PayrollResultLine {
	return { ...entity };
}

function assertRunAllowsOutputMutation(
	runs: OutputRunState,
	input: { organizationId: string; runId: PayrollRunId },
): Result<true> {
	const run = runs.runs.get(input.runId);
	if (run === undefined || run.organizationId !== input.organizationId) {
		return mapNotFound("Payroll run not found");
	}
	if (
		run.status === "calculated" ||
		run.status === "finalized" ||
		run.status === "reversed"
	) {
		return mapInvalidState(
			"Calculated, finalized, or reversed payroll runs cannot change calculation outputs",
		);
	}
	return errorResult.ok(true);
}

export function createMemoryOutputsMethods(input: {
	outputs: OutputsMemoryState;
	runs: OutputRunState;
}): PayrollOutputsStore {
	const { outputs, runs } = input;

	return {
		async deleteCalculationOutputsForRun(deleteInput, ports) {
			const allowed = assertRunAllowsOutputMutation(runs, deleteInput);
			if (!allowed.ok) {
				return allowed;
			}

			for (const [id, line] of outputs.resultLines.entries()) {
				if (
					line.organizationId === deleteInput.organizationId &&
					line.runId === deleteInput.runId
				) {
					outputs.resultLines.delete(id);
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

			return errorResult.ok({ deleted: true });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: full replace and chunk merge share one audit/persist boundary.
		async replaceRunCalculationOutputs(replaceInput, ports) {
			const allowed = assertRunAllowsOutputMutation(runs, replaceInput);
			if (!allowed.ok) {
				return allowed;
			}
			const mergeIds =
				replaceInput.employeeIds === undefined
					? null
					: new Set(replaceInput.employeeIds);
			if (mergeIds === null) {
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
			} else {
				for (const [id, line] of outputs.resultLines.entries()) {
					if (
						line.organizationId === replaceInput.organizationId &&
						line.runId === replaceInput.runId &&
						mergeIds.has(line.employeeId)
					) {
						outputs.resultLines.delete(id);
					}
				}
				for (const [id, employee] of outputs.runEmployees.entries()) {
					if (
						employee.organizationId === replaceInput.organizationId &&
						employee.runId === replaceInput.runId &&
						mergeIds.has(employee.employeeId)
					) {
						outputs.runEmployees.delete(id);
					}
				}
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

			return errorResult.ok({ runEmployees, resultLines });
		},

		async listRunEmployeesForRun(listInput) {
			const runEmployees = Array.from(outputs.runEmployees.values()).filter(
				(employee) =>
					employee.organizationId === listInput.organizationId &&
					employee.runId === listInput.runId,
			);
			return errorResult.ok(runEmployees.map(cloneRunEmployee));
		},

		async listResultLinesForRun(listInput) {
			const resultLines = Array.from(outputs.resultLines.values()).filter(
				(line) =>
					line.organizationId === listInput.organizationId &&
					line.runId === listInput.runId,
			);
			return errorResult.ok(resultLines.map(cloneResultLine));
		},

		async listResultLinesForEmployeeRuns(listInput) {
			if (listInput.runIds.length === 0) {
				return errorResult.ok([]);
			}
			const runIdSet = new Set(listInput.runIds);
			const resultLines = Array.from(outputs.resultLines.values()).filter(
				(line) =>
					line.organizationId === listInput.organizationId &&
					line.employeeId === listInput.employeeId &&
					runIdSet.has(line.runId),
			);
			return errorResult.ok(resultLines.map(cloneResultLine));
		},
	};
}
