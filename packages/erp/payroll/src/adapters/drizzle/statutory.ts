import {
	and,
	db,
	eq,
	payrollRun,
	payrollStatutoryResult,
} from "@afenda/db";
import { ok, type Result } from "@afenda/errors/result";

import {
	type PayrollRunId,
	parsePayrollRunEmployeeId,
	parsePayrollRunId,
	parsePayrollStatutoryResultId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import {
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { PayrollStatutoryStore } from "../../store/statutory";
import type { PayrollStatutoryResult } from "../../types";

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

function mapStatutoryResultRow(
	row: typeof payrollStatutoryResult.$inferSelect,
): Result<PayrollStatutoryResult> {
	const id = parsePayrollStatutoryResultId(row.id);
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
	const configSnapshotJson =
		typeof row.configSnapshotJson === "object" &&
		row.configSnapshotJson !== null
			? (row.configSnapshotJson as Record<string, unknown>)
			: {};
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		runId: runId.data,
		runEmployeeId: runEmployeeId.data,
		employeeId: row.employeeId,
		jurisdictionCode: row.jurisdictionCode,
		ruleCode: row.ruleCode,
		ruleVersion: row.ruleVersion,
		calculatorId: row.calculatorId,
		baseAmount: String(row.baseAmount),
		employeeAmount: String(row.employeeAmount),
		employerAmount: String(row.employerAmount),
		currencyCode: row.currencyCode,
		configSnapshotJson,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

async function assertRunAllowsStatutoryMutation(input: {
	organizationId: string;
	runId: PayrollRunId;
}): Promise<Result<true>> {
	try {
		const statusRows = await db
			.select({ status: payrollRun.status })
			.from(payrollRun)
			.where(
				and(
					eq(payrollRun.organizationId, input.organizationId),
					eq(payrollRun.id, input.runId),
				),
			)
			.limit(1);
		const statusRow = statusRows[0];
		if (statusRow === undefined) {
			return mapNotFound("Payroll run not found");
		}
		if (statusRow.status === "finalized" || statusRow.status === "reversed") {
			return mapInvalidState(
				"Finalized or reversed payroll runs cannot change statutory results",
			);
		}
		return ok(true);
	} catch (error) {
		return mapPersistenceFailure(error, "Failed to load payroll run");
	}
}

/** Drizzle persistence methods for payroll statutory outputs. */
export const drizzleStatutoryMethods: PayrollStatutoryStore = {
	async replaceStatutoryResultsForRun(input, ports) {
		const allowed = await assertRunAllowsStatutoryMutation(input);
		if (!allowed.ok) {
			return allowed;
		}

		try {
			await db
				.delete(payrollStatutoryResult)
				.where(
					and(
						eq(payrollStatutoryResult.organizationId, input.organizationId),
						eq(payrollStatutoryResult.runId, input.runId),
					),
				);

			const results: PayrollStatutoryResult[] = [];
			for (const result of input.results) {
				const rows = await db
					.insert(payrollStatutoryResult)
					.values({
						id: result.id,
						organizationId: input.organizationId,
						runId: input.runId,
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
					})
					.returning();
				const row = rows[0];
				if (row === undefined) {
					return mapPersistenceFailure(
						new Error("Missing returning row"),
						"Failed to create payroll statutory result",
					);
				}
				const mapped = mapStatutoryResultRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				results.push(mapped.data);
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

			return ok(results);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to replace payroll statutory results",
			);
		}
	},

	async listStatutoryResultsForRun(input) {
		try {
			const rows = await db
				.select()
				.from(payrollStatutoryResult)
				.where(
					and(
						eq(payrollStatutoryResult.organizationId, input.organizationId),
						eq(payrollStatutoryResult.runId, input.runId),
					),
				);
			const results: PayrollStatutoryResult[] = [];
			for (const row of rows) {
				const mapped = mapStatutoryResultRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				results.push(mapped.data);
			}
			return ok(results);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll statutory results",
			);
		}
	},
};
