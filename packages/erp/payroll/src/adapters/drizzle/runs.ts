import { randomUUID } from "node:crypto";
import { and, db, eq, payrollException, payrollRun } from "@afenda/db";
import type { Change } from "@afenda/audit";
import { ok, type Result } from "@afenda/errors/result";

import {
	type PayrollRunId,
	parsePayrollExceptionId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollRunId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	isCreateIdempotencyUniqueViolation,
	isPayrollRunIdentityUniqueViolation,
	mapConflict,
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import { assertPayrollRunTransition } from "../../runs/transitions";
import type { PayrollRunsStore } from "../../store/runs";
import type {
	IdempotentPayrollRunRecord,
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollRun,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
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
		changes?: Change[];
	},
): Promise<Result<{ id: string }>> {
	return ports.audit.record({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		changes: input.changes ?? [],
	});
}

function formatDateTime(value: Date | null): string | null {
	if (value === null) {
		return null;
	}
	return value.toISOString();
}

function parseDateTime(value: string | null): Date | null {
	if (value === null) {
		return null;
	}
	return new Date(value);
}

function mapRunRow(row: typeof payrollRun.$inferSelect): Result<PayrollRun> {
	const id = parsePayrollRunId(row.id);
	if (!id.ok) {
		return id;
	}
	const payGroupId = parsePayrollPayGroupId(row.payGroupId);
	if (!payGroupId.ok) {
		return payGroupId;
	}
	const periodId = parsePayrollPeriodId(row.periodId);
	if (!periodId.ok) {
		return periodId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		payGroupId: payGroupId.data,
		periodId: periodId.data,
		runType: row.runType as PayrollRun["runType"],
		sequence: row.sequence,
		status: row.status as PayrollRun["status"],
		finalizedAt: formatDateTime(row.finalizedAt),
		finalizedBy: row.finalizedBy,
		calculationSnapshotHash: row.calculationSnapshotHash,
		calculationVersion: row.calculationVersion,
		roundingPolicyJson:
			row.roundingPolicyJson === null
				? null
				: (row.roundingPolicyJson as PayrollRun["roundingPolicyJson"]),
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapExceptionRow(
	row: typeof payrollException.$inferSelect,
): Result<PayrollException> {
	const id = parsePayrollExceptionId(row.id);
	const runId = parsePayrollRunId(row.runId);
	if (!id.ok) {
		return id;
	}
	if (!runId.ok) {
		return runId;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		runId: runId.data,
		severity: row.severity as PayrollException["severity"],
		exceptionCode: row.exceptionCode,
		message: row.message,
		employeeRef: row.employeeRef,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	});
}

/** Drizzle persistence methods for payroll runs. */
export const drizzleRunsMethods: PayrollRunsStore = {
	async findRunByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentPayrollRunRecord | null>> {
		try {
			const rows = await db
				.select()
				.from(payrollRun)
				.where(
					and(
						eq(payrollRun.organizationId, input.organizationId),
						eq(payrollRun.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapRunRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				run: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll run idempotency record",
			);
		}
	},

	async createRun(
		record: PayrollRunCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollRun>> {
		const existing = await this.findRunByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint !==
				record.createRequestFingerprint
			) {
				return mapConflict("Idempotency key conflict");
			}
			return ok(existing.data.run);
		}

		const runId = parsePayrollRunId(randomUUID());
		if (!runId.ok) {
			return runId;
		}

		try {
			const rows = await db
				.insert(payrollRun)
				.values({
					id: runId.data,
					organizationId: record.organizationId,
					payGroupId: record.payGroupId,
					periodId: record.periodId,
					runType: record.runType,
					sequence: record.sequence,
					status: "draft",
					finalizedAt: null,
					finalizedBy: null,
					calculationSnapshotHash: null,
					calculationVersion: null,
					roundingPolicyJson: null,
					createIdempotencyKey: record.idempotencyKey,
					createRequestFingerprint: record.createRequestFingerprint,
					version: 1,
					createdBy: record.createdBy,
					updatedBy: record.createdBy,
				})
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return mapPersistenceFailure(
					new Error("Missing returning row"),
					"Failed to create payroll run",
				);
			}

			const mapped = mapRunRow(row);
			if (!mapped.ok) {
				return mapped;
			}

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_run",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return mapped;
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findRunByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return mapConflict("Idempotency key conflict");
					}
					return ok(replay.data.run);
				}
			}
			if (isPayrollRunIdentityUniqueViolation(error)) {
				return mapConflict("Payroll run identity already exists");
			}
			return mapPersistenceFailure(error, "Failed to create payroll run");
		}
	},

	async getRun(input: {
		organizationId: string;
		runId: PayrollRunId;
	}): Promise<Result<PayrollRun | null>> {
		try {
			const rows = await db
				.select()
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
				return ok(null);
			}
			return mapRunRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll run");
		}
	},

	async updateRunWithVersion(
		input: PayrollRunUpdateInput,
		ports: MutationPorts,
	): Promise<Result<PayrollRun>> {
		const current = await this.getRun({
			organizationId: input.organizationId,
			runId: input.runId,
		});
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return mapNotFound("Payroll run not found");
		}

		const versionCheck = assertExpectedVersion(
			current.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		if (current.data.status === "finalized") {
			if (input.status !== "reversed") {
				return mapInvalidState(
					"Finalized payroll runs cannot be updated except to reversed",
				);
			}
		}
		if (current.data.status === "reversed") {
			return mapInvalidState("Reversed payroll runs cannot be updated");
		}

		const nextStatus = input.status ?? current.data.status;
		if (nextStatus !== current.data.status) {
			const transitionCheck = assertPayrollRunTransition(
				current.data.status,
				nextStatus,
			);
			if (!transitionCheck.ok) {
				return transitionCheck;
			}
		}

		try {
			const rows = await db
				.update(payrollRun)
				.set({
					status: input.status ?? current.data.status,
					calculationSnapshotHash:
						input.calculationSnapshotHash !== undefined
							? input.calculationSnapshotHash
							: current.data.calculationSnapshotHash,
					calculationVersion:
						input.calculationVersion !== undefined
							? input.calculationVersion
							: current.data.calculationVersion,
					roundingPolicyJson:
						input.roundingPolicyJson !== undefined
							? input.roundingPolicyJson
							: current.data.roundingPolicyJson,
					finalizedAt:
						input.finalizedAt !== undefined
							? parseDateTime(input.finalizedAt)
							: parseDateTime(current.data.finalizedAt),
					finalizedBy:
						input.finalizedBy !== undefined
							? input.finalizedBy
							: current.data.finalizedBy,
					version: current.data.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(payrollRun.organizationId, input.organizationId),
						eq(payrollRun.id, input.runId),
						eq(payrollRun.version, input.expectedVersion),
					),
				)
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return mapConflict("Payroll run version is stale");
			}

			const mapped = mapRunRow(row);
			if (!mapped.ok) {
				return mapped;
			}

			const audit = await recordAudit(ports, {
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				entity: "payroll_run",
				entityId: mapped.data.id,
				action: "UPDATE",
				changes:
					current.data.status === mapped.data.status
						? []
						: [
								{
									field: "status",
									oldValue: current.data.status,
									newValue: mapped.data.status,
								},
							],
			});
			if (!audit.ok) {
				return audit;
			}

			return mapped;
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update payroll run");
		}
	},

	async createException(
		record: PayrollExceptionCreateRecord,
		ports: MutationPorts,
	): Promise<Result<PayrollException>> {
		const run = await this.getRun({
			organizationId: record.organizationId,
			runId: record.runId,
		});
		if (!run.ok) {
			return run;
		}
		if (run.data === null) {
			return mapNotFound("Payroll run not found");
		}

		const exceptionId = parsePayrollExceptionId(randomUUID());
		if (!exceptionId.ok) {
			return exceptionId;
		}

		try {
			const rows = await db
				.insert(payrollException)
				.values({
					id: exceptionId.data,
					organizationId: record.organizationId,
					runId: record.runId,
					severity: record.severity,
					exceptionCode: record.exceptionCode,
					message: record.message,
					employeeRef: record.employeeRef,
					createdBy: record.createdBy,
				})
				.returning();
			const row = rows[0];
			if (row === undefined) {
				return mapPersistenceFailure(
					new Error("Missing returning row"),
					"Failed to create payroll exception",
				);
			}

			const mapped = mapExceptionRow(row);
			if (!mapped.ok) {
				return mapped;
			}

			const audit = await recordAudit(ports, {
				organizationId: record.organizationId,
				actorUserId: record.createdBy,
				correlationId: record.correlationId,
				entity: "payroll_exception",
				entityId: mapped.data.id,
				action: "CREATE",
			});
			if (!audit.ok) {
				return audit;
			}

			return mapped;
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create payroll exception");
		}
	},

	async listExceptionsForRun(input: {
		organizationId: string;
		runId: PayrollRunId;
	}): Promise<Result<PayrollException[]>> {
		const run = await this.getRun({
			organizationId: input.organizationId,
			runId: input.runId,
		});
		if (!run.ok) {
			return run;
		}
		if (run.data === null) {
			return ok([]);
		}

		try {
			const rows = await db
				.select()
				.from(payrollException)
				.where(
					and(
						eq(payrollException.organizationId, input.organizationId),
						eq(payrollException.runId, input.runId),
					),
				);
			const exceptions: PayrollException[] = [];
			for (const row of rows) {
				const mapped = mapExceptionRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				exceptions.push(mapped.data);
			}
			return ok(exceptions);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll exceptions for run",
			);
		}
	},

	async deleteExceptionsForRun(input, ports) {
		const run = await this.getRun({
			organizationId: input.organizationId,
			runId: input.runId,
		});
		if (!run.ok) {
			return run;
		}
		if (run.data === null) {
			return mapNotFound("Payroll run not found");
		}
		if (run.data.status === "finalized" || run.data.status === "reversed") {
			return mapInvalidState(
				"Finalized or reversed payroll runs cannot delete exceptions",
			);
		}

		try {
			const existing = await db
				.select({ id: payrollException.id })
				.from(payrollException)
				.where(
					and(
						eq(payrollException.organizationId, input.organizationId),
						eq(payrollException.runId, input.runId),
					),
				);
			if (existing.length === 0) {
				return ok({ deletedCount: 0 });
			}

			await db
				.delete(payrollException)
				.where(
					and(
						eq(payrollException.organizationId, input.organizationId),
						eq(payrollException.runId, input.runId),
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

			return ok({ deletedCount: existing.length });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to delete payroll exceptions for run",
			);
		}
	},
};
