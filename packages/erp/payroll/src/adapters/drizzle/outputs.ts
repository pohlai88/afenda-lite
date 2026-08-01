import {
	database as afendaDatabase,
	and,
	eq,
	payrollResultLine,
	payrollRunEmployee,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import {
	parsePayrollEmployeeAssignmentId,
	parsePayrollResultLineId,
	parsePayrollRunEmployeeId,
	parsePayrollRunId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { payrollJsonObjectSchema } from "../../schemas/common";
import {
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { PayrollOutputsStore } from "../../store/outputs";
import type { PayrollResultLine, PayrollRunEmployee } from "../../types";

function recordAudit(
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
			? errorResult.ok(null)
			: parsePayrollEmployeeAssignmentId(row.assignmentId);
	if (!assignmentId.ok) {
		return assignmentId;
	}
	const snapshotJson = payrollJsonObjectSchema.safeParse(row.snapshotJson);
	if (!snapshotJson.success) {
		return mapPersistenceFailure(
			snapshotJson.error,
			"Persisted payroll snapshot is invalid",
		);
	}
	return errorResult.ok({
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
		snapshotJson: snapshotJson.data,
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
	return errorResult.ok({
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

/** Drizzle persistence methods for payroll outputs. */
export const drizzleOutputsMethods: PayrollOutputsStore = {
	async deleteCalculationOutputsForRun(input, ports) {
		try {
			const [lockedRows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					SELECT status FROM payroll_run
					WHERE organization_id = ${input.organizationId} AND id = ${input.runId}
					FOR UPDATE
				`,
				sqlValue`
					DELETE FROM payroll_result_line
					WHERE organization_id = ${input.organizationId} AND run_id = ${input.runId}
						AND EXISTS (
							SELECT 1 FROM payroll_run
							WHERE organization_id = ${input.organizationId} AND id = ${input.runId}
								AND status NOT IN ('calculated', 'finalized', 'reversed')
						)
				`,
				sqlValue`
					DELETE FROM payroll_run_employee
					WHERE organization_id = ${input.organizationId} AND run_id = ${input.runId}
						AND EXISTS (
							SELECT 1 FROM payroll_run
							WHERE organization_id = ${input.organizationId} AND id = ${input.runId}
								AND status NOT IN ('calculated', 'finalized', 'reversed')
						)
				`,
			]);
			const lockedStatus = lockedRows[0]?.status;
			if (lockedStatus === undefined) {
				return mapNotFound("Payroll run not found");
			}
			if (
				lockedStatus === "calculated" ||
				lockedStatus === "finalized" ||
				lockedStatus === "reversed"
			) {
				return mapInvalidState(
					"Calculated, finalized, or reversed payroll runs cannot change calculation outputs",
				);
			}

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

			return errorResult.ok({ deleted: true });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to delete payroll calculation outputs",
			);
		}
	},

	async replaceRunCalculationOutputs(input, ports) {
		try {
			const employeeRowsJson = JSON.stringify(input.runEmployees);
			const resultLineRowsJson = JSON.stringify(input.resultLines);
			const [lockedRows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					SELECT status FROM payroll_run
					WHERE organization_id = ${input.organizationId} AND id = ${input.runId}
					FOR UPDATE
				`,
				sqlValue`
					DELETE FROM payroll_result_line
					WHERE organization_id = ${input.organizationId} AND run_id = ${input.runId}
						AND EXISTS (SELECT 1 FROM payroll_run WHERE organization_id = ${input.organizationId}
							AND id = ${input.runId} AND status NOT IN ('calculated', 'finalized', 'reversed'))
				`,
				sqlValue`
					DELETE FROM payroll_run_employee
					WHERE organization_id = ${input.organizationId} AND run_id = ${input.runId}
						AND EXISTS (SELECT 1 FROM payroll_run WHERE organization_id = ${input.organizationId}
							AND id = ${input.runId} AND status NOT IN ('calculated', 'finalized', 'reversed'))
				`,
				sqlValue`
					INSERT INTO payroll_run_employee (
						id, organization_id, run_id, employee_id, assignment_id, currency_code,
						gross, employee_deductions, employee_statutory, employer_cost, net,
						snapshot_json, snapshot_hash, calculation_version, status
					)
					SELECT employee.id::uuid, ${input.organizationId}, ${input.runId},
						employee."employeeId", employee."assignmentId"::uuid, employee."currencyCode",
						employee.gross::numeric, employee."employeeDeductions"::numeric,
						employee."employeeStatutory"::numeric, employee."employerCost"::numeric,
						employee.net::numeric, employee."snapshotJson", employee."snapshotHash",
						employee."calculationVersion", employee.status
					FROM jsonb_to_recordset(${employeeRowsJson}::jsonb) AS employee(
						id text, "employeeId" text, "assignmentId" text, "currencyCode" text,
						gross text, "employeeDeductions" text, "employeeStatutory" text,
						"employerCost" text, net text, "snapshotJson" jsonb,
						"snapshotHash" text, "calculationVersion" text, status text
					)
					WHERE EXISTS (SELECT 1 FROM payroll_run WHERE organization_id = ${input.organizationId}
						AND id = ${input.runId} AND status NOT IN ('calculated', 'finalized', 'reversed'))
				`,
				sqlValue`
					INSERT INTO payroll_result_line (
						id, organization_id, run_id, run_employee_id, employee_id, line_kind,
						code, rule_code, rule_version, rule_kind, amount, currency_code,
						source_type, source_id, sequence, trace_ref
					)
					SELECT line.id::uuid, ${input.organizationId}, ${input.runId},
						line."runEmployeeId"::uuid, line."employeeId", line."lineKind",
						line.code, line."ruleCode", line."ruleVersion", line."ruleKind",
						line.amount::numeric, line."currencyCode", line."sourceType",
						line."sourceId", line.sequence::integer, line."traceRef"
					FROM jsonb_to_recordset(${resultLineRowsJson}::jsonb) AS line(
						id text, "runEmployeeId" text, "employeeId" text, "lineKind" text,
						code text, "ruleCode" text, "ruleVersion" text, "ruleKind" text,
						amount text, "currencyCode" text, "sourceType" text,
						"sourceId" text, sequence text, "traceRef" text
					)
					WHERE EXISTS (SELECT 1 FROM payroll_run WHERE organization_id = ${input.organizationId}
						AND id = ${input.runId} AND status NOT IN ('calculated', 'finalized', 'reversed'))
				`,
			]);
			const lockedStatus = lockedRows[0]?.status;
			if (lockedStatus === undefined) {
				return mapNotFound("Payroll run not found");
			}
			if (
				lockedStatus === "calculated" ||
				lockedStatus === "finalized" ||
				lockedStatus === "reversed"
			) {
				return mapInvalidState(
					"Calculated, finalized, or reversed payroll runs cannot change calculation outputs",
				);
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

			const [runEmployees, resultLines] = await Promise.all([
				this.listRunEmployeesForRun(input),
				this.listResultLinesForRun(input),
			]);
			if (!runEmployees.ok) {
				return runEmployees;
			}
			if (!resultLines.ok) {
				return resultLines;
			}
			return errorResult.ok({
				runEmployees: runEmployees.data,
				resultLines: resultLines.data,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to replace payroll calculation outputs",
			);
		}
	},

	async listRunEmployeesForRun(input) {
		try {
			const rows = await afendaDatabase.client
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
			return errorResult.ok(runEmployees);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll run employees",
			);
		}
	},

	async listResultLinesForRun(input) {
		try {
			const rows = await afendaDatabase.client
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
			return errorResult.ok(resultLines);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll result lines",
			);
		}
	},
};
