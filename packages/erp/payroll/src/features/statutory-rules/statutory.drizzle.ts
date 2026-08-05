import {
	database as afendaDatabase,
	and,
	eq,
	inArray,
	payrollRun,
	payrollStatutoryResult,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import type { PayrollStatutoryResult } from "../../kernel/contracts/projected-types";
import {
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import { recordPayrollAudit as recordAudit } from "../../kernel/execution/record-audit";
import {
	type PayrollRunId,
	parsePayrollRunEmployeeId,
	parsePayrollRunId,
	parsePayrollStatutoryResultId,
} from "../../kernel/identity/brands";
import { payrollJsonObjectSchema } from "../../kernel/validation/common.schema";
import type { PayrollStatutoryStore } from "./statutory.store";

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
	const configSnapshotJson = payrollJsonObjectSchema.safeParse(
		row.configSnapshotJson,
	);
	if (!configSnapshotJson.success) {
		return mapPersistenceFailure(
			configSnapshotJson.error,
			"Persisted payroll statutory snapshot is invalid",
		);
	}
	return errorResult.ok({
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
		configSnapshotJson: configSnapshotJson.data,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

async function assertRunAllowsStatutoryMutation(input: {
	organizationId: string;
	runId: PayrollRunId;
}): Promise<Result<true>> {
	try {
		const statusRows = await afendaDatabase.client
			.select({ status: payrollRun.status })
			.from(payrollRun)
			.where(
				and(
					eq(payrollRun.organizationId, input.organizationId),
					eq(payrollRun.id, input.runId),
				),
			)
			.limit(1);
		const [statusRow] = statusRows;
		if (statusRow === undefined) {
			return mapNotFound("Payroll run not found");
		}
		if (statusRow.status === "finalized" || statusRow.status === "reversed") {
			return mapInvalidState(
				"Finalized or reversed payroll runs cannot change statutory results",
			);
		}
		return errorResult.ok(true);
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
			await afendaDatabase.client
				.delete(payrollStatutoryResult)
				.where(
					and(
						eq(payrollStatutoryResult.organizationId, input.organizationId),
						eq(payrollStatutoryResult.runId, input.runId),
						...(input.employeeIds === undefined
							? []
							: [
									inArray(payrollStatutoryResult.employeeId, input.employeeIds),
								]),
					),
				);

			const results: PayrollStatutoryResult[] = [];
			if (input.results.length > 0) {
				const rows = await afendaDatabase.client
					.insert(payrollStatutoryResult)
					.values(
						input.results.map((result) => ({
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
						})),
					)
					.returning();
				for (const row of rows) {
					const mapped = mapStatutoryResultRow(row);
					if (!mapped.ok) {
						return mapped;
					}
					results.push(mapped.data);
				}
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

			return errorResult.ok(results);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to replace payroll statutory results",
			);
		}
	},

	async listStatutoryResultsForRun(input) {
		try {
			const rows = await afendaDatabase.client
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
			return errorResult.ok(results);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll statutory results",
			);
		}
	},
};
