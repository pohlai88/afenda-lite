import {
	and,
	db,
	eq,
	payrollResultLine,
	payrollRun,
	payrollRunEmployee,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";

import {
	type PayrollRunId,
	parsePayrollEmployeeAssignmentId,
	parsePayrollResultLineId,
	parsePayrollRunEmployeeId,
	parsePayrollRunId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import {
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { PayrollOutputsStore } from "../../store/outputs";
import type {
	PayrollResultLine,
	PayrollRunEmployee,
	ReplaceRunCalculationOutputsInput,
} from "../../types";

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

function mapRunEmployeeRow(
	row: typeof payrollRunEmployee.$inferSelect,
): Result<PayrollRunEmployee> {
	const id = parsePayrollRunEmployeeId(row.id);
	const runId = parsePayrollRunId(row.runId);
	if (!id.ok) {
		return id;
	}
	if (!runId.ok) {
		return runId;
	}
	const assignmentId =
		row.assignmentId === null
			? ok(null)
			: parsePayrollEmployeeAssignmentId(row.assignmentId);
	if (!assignmentId.ok) {
		return assignmentId;
	}
	const snapshotJson =
		typeof row.snapshotJson === "object" && row.snapshotJson !== null
			? (row.snapshotJson as Record<string, unknown>)
			: {};
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		runId: runId.data,
		employeeId: row.employeeId,
		assignmentId: assignmentId.data,
		currencyCode: row.currencyCode,
		gross: String(row.gross),
		employeeDeductions: String(row.employeeDeductions),
		employeeStatutory: String(row.employeeStatutory),
		employerCost: String(row.employerCost),
		net: String(row.net),
		snapshotJson,
		snapshotHash: row.snapshotHash,
		calculationVersion: row.calculationVersion,
		status: row.status as PayrollRunEmployee["status"],
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapResultLineRow(
	row: typeof payrollResultLine.$inferSelect,
): Result<PayrollResultLine> {
	const id = parsePayrollResultLineId(row.id);
	const runId = parsePayrollRunId(row.runId);
	const runEmployeeId = parsePayrollRunEmployeeId(row.runEmployeeId);
	if (!id.ok) {
		return id;
	}
	if (!runId.ok) {
		return runId;
	}
	if (!runEmployeeId.ok) {
		return runEmployeeId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		runId: runId.data,
		runEmployeeId: runEmployeeId.data,
		employeeId: row.employeeId,
		lineKind: row.lineKind as PayrollResultLine["lineKind"],
		code: row.code,
		ruleCode: row.ruleCode,
		ruleVersion: row.ruleVersion,
		ruleKind: row.ruleKind as PayrollResultLine["ruleKind"],
		amount: String(row.amount),
		currencyCode: row.currencyCode,
		sourceType: row.sourceType,
		sourceId: row.sourceId,
		sequence: row.sequence,
		traceRef: row.traceRef,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

async function assertRunAllowsOutputMutation(input: {
	organizationId: string;
	runId: PayrollRunId;
}): Promise<Result<{ status: string }>> {
	try {
		const rows = await db
			.select({ status: payrollRun.status })
			.from(payrollRun)
			.where(
				and(
					eq(payrollRun.organizationId, input.organizationId),
					eq(payrollRun.id, input.runId),
				),
			)
			.limit(1);
		const row = rows[0];
		if (row === undefined) {
			return mapNotFound("Payroll run not found");
		}
		if (row.status === "finalized" || row.status === "reversed") {
			return mapInvalidState(
				"Finalized or reversed payroll runs cannot change calculation outputs",
			);
		}
		return ok({ status: row.status });
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load payroll run");
	}
}

/** Drizzle persistence methods for payroll outputs. */
export const drizzleOutputsMethods: PayrollOutputsStore = {
	async deleteCalculationOutputsForRun(input, ports) {
		const run = await assertRunAllowsOutputMutation(input);
		if (!run.ok) {
			return run;
		}

		try {
			await db
				.delete(payrollResultLine)
				.where(
					and(
						eq(payrollResultLine.organizationId, input.organizationId),
						eq(payrollResultLine.runId, input.runId),
					),
				);
			await db
				.delete(payrollRunEmployee)
				.where(
					and(
						eq(payrollRunEmployee.organizationId, input.organizationId),
						eq(payrollRunEmployee.runId, input.runId),
					),
				);

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_run",
				entityId: input.runId,
				action: "DELETE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok({ deleted: true });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to delete payroll calculation outputs",
			);
		}
	},

	async replaceRunCalculationOutputs(input, ports) {
		const run = await assertRunAllowsOutputMutation(input);
		if (!run.ok) {
			return run;
		}

		const deleted = await this.deleteCalculationOutputsForRun(
			{
				organizationId: input.organizationId,
				runId: input.runId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
			},
			ports,
		);
		if (!deleted.ok) {
			return deleted;
		}

		const runEmployees: PayrollRunEmployee[] = [];
		const resultLines: PayrollResultLine[] = [];

		try {
			for (const employee of input.runEmployees) {
				const rows = await db
					.insert(payrollRunEmployee)
					.values({
						id: employee.id,
						organizationId: input.organizationId,
						runId: input.runId,
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
					})
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapPersistenceFailure(
						new Error("Missing returning row"),
						"Failed to create payroll run employee",
					);
				}
				const mapped = mapRunEmployeeRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				runEmployees.push(mapped.data);
			}

			for (const line of input.resultLines) {
				const rows = await db
					.insert(payrollResultLine)
					.values({
						id: line.id,
						organizationId: input.organizationId,
						runId: input.runId,
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
					})
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapPersistenceFailure(
						new Error("Missing returning row"),
						"Failed to create payroll result line",
					);
				}
				const mapped = mapResultLineRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				resultLines.push(mapped.data);
			}

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_run",
				entityId: input.runId,
				action: "UPDATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return ok({ runEmployees, resultLines });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to replace payroll calculation outputs",
			);
		}
	},

	async listRunEmployeesForRun(input) {
		try {
			const rows = await db
				.select()
				.from(payrollRunEmployee)
				.where(
					and(
						eq(payrollRunEmployee.organizationId, input.organizationId),
						eq(payrollRunEmployee.runId, input.runId),
					),
				);
			const runEmployees: PayrollRunEmployee[] = [];
			for (const row of rows) {
				const mapped = mapRunEmployeeRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				runEmployees.push(mapped.data);
			}
			return ok(runEmployees);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll run employees",
			);
		}
	},

	async listResultLinesForRun(input) {
		try {
			const rows = await db
				.select()
				.from(payrollResultLine)
				.where(
					and(
						eq(payrollResultLine.organizationId, input.organizationId),
						eq(payrollResultLine.runId, input.runId),
					),
				);
			const resultLines: PayrollResultLine[] = [];
			for (const row of rows) {
				const mapped = mapResultLineRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				resultLines.push(mapped.data);
			}
			return ok(resultLines);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll result lines",
			);
		}
	},
};
