import { randomUUID } from "node:crypto";
import { audit as afendaAudit, type Change } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	eq,
	payrollException,
	payrollRun,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { events } from "@afenda/events";

import {
	type PayrollRunId,
	parsePayrollExceptionId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollRunId,
} from "../../brands";
import type { MutationPorts } from "../../ports";
import {
	buildPayrollRunEventPayload,
	payrollRunEventsForStatus,
} from "../../runs/lifecycle-events";
import { assertPayrollRunTransition } from "../../runs/transitions";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	isCreateIdempotencyUniqueViolation,
	isPayrollRunIdentityUniqueViolation,
	mapConflict,
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { PayrollRunsStore } from "../../store/runs";
import type {
	IdempotentPayrollRunRecord,
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollRun,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
} from "../../types";

function recordAudit(
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
	return errorResult.ok({
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
	return errorResult.ok({
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
			const rows = await afendaDatabase.client
				.select()
				.from(payrollRun)
				.where(
					and(
						eq(payrollRun.organizationId, input.organizationId),
						eq(payrollRun.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const mapped = mapRunRow(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Run creation keeps idempotency, persistence, audit, and outbox rollback in one transaction boundary.
	async createRun(
		record: PayrollRunCreateRecord,
		_ports: MutationPorts,
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
			return errorResult.ok(existing.data.run);
		}

		const runId = parsePayrollRunId(randomUUID());
		if (!runId.ok) {
			return runId;
		}

		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: record.correlationId,
			module: "payroll",
			entity: "payroll_run",
			entityId: runId.data,
			action: "CREATE",
			newValue: { status: "draft", version: 1 },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const [eventType] = payrollRunEventsForStatus("draft");
		if (eventType === undefined) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const payload = buildPayrollRunEventPayload({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: record.correlationId,
			runId: runId.data,
		});
		const payloadValidation = events.registry.validatePayload(
			eventType,
			payload,
		);
		const sourceModule = events.registry.sourceModule(eventType);
		if (!payloadValidation.success || sourceModule !== "payroll") {
			return errorResult.fail("INTERNAL_ERROR");
		}
		const payloadJson = JSON.stringify(payloadValidation.data);

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH mutated AS (
						INSERT INTO payroll_run (
							id, organization_id, pay_group_id, period_id, run_type,
							sequence, status, finalized_at, finalized_by,
							calculation_snapshot_hash, calculation_version,
							rounding_policy_json, create_idempotency_key,
							create_request_fingerprint, version, created_by, updated_by
						) VALUES (
							${runId.data}, ${record.organizationId}, ${record.payGroupId},
							${record.periodId}, ${record.runType}, ${record.sequence}, 'draft',
							NULL, NULL, NULL, NULL, NULL, ${record.idempotencyKey},
							${record.createRequestFingerprint}, 1, ${record.createdBy},
							${record.createdBy}
						)
						RETURNING id, organization_id, created_by
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, deduplication_key,
							correlation_id, actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, ${eventType}, ${sourceModule},
							${`${runId.data}:draft:1`}, ${record.correlationId},
							created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows.length === 0) {
				return mapPersistenceFailure(
					new Error("Missing transactional returning row"),
					"Failed to create payroll run",
				);
			}
			const created = await this.getRun({
				organizationId: record.organizationId,
				runId: runId.data,
			});
			if (!created.ok) {
				return created;
			}
			if (created.data === null) {
				return mapPersistenceFailure(
					new Error("Created payroll run not found"),
					"Failed to load created payroll run",
				);
			}
			return errorResult.ok(created.data);
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
					return errorResult.ok(replay.data.run);
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
			const rows = await afendaDatabase.client
				.select()
				.from(payrollRun)
				.where(
					and(
						eq(payrollRun.organizationId, input.organizationId),
						eq(payrollRun.id, input.runId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapRunRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load payroll run");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Versioned run transition keeps state validation and rollback evidence in one transaction boundary.
	async updateRunWithVersion(
		input: PayrollRunUpdateInput,
		_ports: MutationPorts,
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

		if (current.data.status === "finalized" && input.status !== "reversed") {
			return mapInvalidState(
				"Finalized payroll runs cannot be updated except to reversed",
			);
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

		const nextVersion = current.data.version + 1;
		const nextSnapshotHash =
			input.calculationSnapshotHash === undefined
				? current.data.calculationSnapshotHash
				: input.calculationSnapshotHash;
		const nextCalculationVersion =
			input.calculationVersion === undefined
				? current.data.calculationVersion
				: input.calculationVersion;
		const nextRoundingPolicy =
			input.roundingPolicyJson === undefined
				? current.data.roundingPolicyJson
				: input.roundingPolicyJson;
		const nextFinalizedAt =
			input.finalizedAt === undefined
				? current.data.finalizedAt
				: input.finalizedAt;
		const nextFinalizedBy =
			input.finalizedBy === undefined
				? current.data.finalizedBy
				: input.finalizedBy;
		const changes: Change[] =
			current.data.status === nextStatus
				? []
				: [
						{
							field: "status",
							oldValue: current.data.status,
							newValue: nextStatus,
						},
					];
		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			module: "payroll",
			entity: "payroll_run",
			entityId: input.runId,
			action: "UPDATE",
			changes,
			oldValue: { status: current.data.status, version: current.data.version },
			newValue: { status: nextStatus, version: nextVersion },
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const eventTypes =
			current.data.status === nextStatus
				? []
				: [...payrollRunEventsForStatus(nextStatus)];
		const [eventType1 = null, eventType2 = null, eventType3 = null] =
			eventTypes;
		const eventId1 = randomUUID();
		const eventId2 = randomUUID();
		const eventId3 = randomUUID();
		const payload = buildPayrollRunEventPayload({
			organizationId: input.organizationId,
			runId: input.runId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
		});
		for (const eventType of eventTypes) {
			const validation = events.registry.validatePayload(eventType, payload);
			if (
				!validation.success ||
				events.registry.sourceModule(eventType) !== "payroll"
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
		}
		const payloadJson = JSON.stringify(payload);
		const roundingPolicyJson =
			nextRoundingPolicy === null ? null : JSON.stringify(nextRoundingPolicy);

		try {
			const [, rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					SELECT id FROM payroll_run
					WHERE organization_id = ${input.organizationId}
						AND id = ${input.runId} AND version = ${input.expectedVersion}
					FOR UPDATE
				`,
				sqlValue`
					WITH mutated AS (
						UPDATE payroll_run
						SET status = ${nextStatus},
							calculation_snapshot_hash = ${nextSnapshotHash},
							calculation_version = ${nextCalculationVersion},
							rounding_policy_json = ${roundingPolicyJson}::jsonb,
							finalized_at = ${nextFinalizedAt}::timestamptz,
							finalized_by = ${nextFinalizedBy}, version = ${nextVersion},
							updated_by = ${input.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.runId} AND version = ${input.expectedVersion}
							AND (
								${nextStatus}::text <> 'finalized'
								OR NOT EXISTS (
									SELECT 1 FROM payroll_exception
									WHERE organization_id = ${input.organizationId}
										AND run_id = ${input.runId} AND severity = 'blocking'
								)
							)
						RETURNING id, organization_id, updated_by
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${randomUUID()}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					),
					event_values(event_id, event_type, dedupe_key) AS (
						VALUES
							(${eventId1}::uuid, ${eventType1}::text, ${`${input.runId}:${nextStatus}:${nextVersion}:1`}::text),
							(${eventId2}::uuid, ${eventType2}::text, ${`${input.runId}:${nextStatus}:${nextVersion}:2`}::text),
							(${eventId3}::uuid, ${eventType3}::text, ${`${input.runId}:${nextStatus}:${nextVersion}:3`}::text)
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, deduplication_key,
							correlation_id, actor_user_id, payload, status, attempts
						)
						SELECT event_values.event_id, mutated.organization_id,
							event_values.event_type, 'payroll', event_values.dedupe_key,
							${input.correlationId}, mutated.updated_by,
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated CROSS JOIN event_values
						WHERE event_values.event_type IS NOT NULL
						RETURNING id
					)
					SELECT mutated.id FROM mutated, audited
				`,
			]);
			if (rows.length === 0) {
				return mapConflict(
					nextStatus === "finalized"
						? "Payroll run is stale or has blocking exceptions"
						: "Payroll run version is stale",
				);
			}
			const updated = await this.getRun({
				organizationId: input.organizationId,
				runId: input.runId,
			});
			if (!updated.ok) {
				return updated;
			}
			if (updated.data === null) {
				return mapNotFound("Payroll run not found after update");
			}
			return errorResult.ok(updated.data);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update payroll run");
		}
	},

	async createException(
		record: PayrollExceptionCreateRecord,
		_ports: MutationPorts,
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
		if (run.data.status === "finalized" || run.data.status === "reversed") {
			return mapInvalidState(
				"Finalized or reversed payroll runs cannot accept exceptions",
			);
		}

		const exceptionId = parsePayrollExceptionId(randomUUID());
		if (!exceptionId.ok) {
			return exceptionId;
		}

		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: record.correlationId,
			module: "payroll",
			entity: "payroll_exception",
			entityId: exceptionId.data,
			action: "CREATE",
			newValue: {
				runId: record.runId,
				severity: record.severity,
			},
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [, rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					SELECT id FROM payroll_run
					WHERE organization_id = ${record.organizationId} AND id = ${record.runId}
					FOR UPDATE
				`,
				sqlValue`
					WITH inserted AS (
						INSERT INTO payroll_exception (
							id, organization_id, run_id, severity, exception_code,
							message, employee_ref, created_by
						)
						SELECT ${exceptionId.data}, ${record.organizationId}, ${record.runId},
							${record.severity}, ${record.exceptionCode}, ${record.message},
							${record.employeeRef}, ${record.createdBy}
						WHERE EXISTS (
							SELECT 1 FROM payroll_run
							WHERE organization_id = ${record.organizationId}
								AND id = ${record.runId}
								AND status NOT IN ('finalized', 'reversed')
						)
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module,
							entity, entity_id, action, changes, old_value, new_value,
							metadata, ip_address, user_agent
						)
						SELECT ${randomUUID()}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM inserted
						RETURNING id
					)
					SELECT inserted.id FROM inserted, audited
				`,
			]);
			if (rows.length === 0) {
				return mapInvalidState(
					"Finalized or reversed payroll runs cannot accept exceptions",
				);
			}

			const persisted = await afendaDatabase.client
				.select()
				.from(payrollException)
				.where(
					and(
						eq(payrollException.organizationId, record.organizationId),
						eq(payrollException.id, exceptionId.data),
					),
				)
				.limit(1);
			const [row] = persisted;
			if (row === undefined) {
				return mapPersistenceFailure(
					new Error("Created payroll exception not found"),
					"Failed to load created payroll exception",
				);
			}
			return mapExceptionRow(row);
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
			return errorResult.ok([]);
		}

		try {
			const rows = await afendaDatabase.client
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
			return errorResult.ok(exceptions);
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
			const existing = await afendaDatabase.client
				.select({ id: payrollException.id })
				.from(payrollException)
				.where(
					and(
						eq(payrollException.organizationId, input.organizationId),
						eq(payrollException.runId, input.runId),
					),
				);
			if (existing.length === 0) {
				return errorResult.ok({ deletedCount: 0 });
			}

			await afendaDatabase.client
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

			return errorResult.ok({ deletedCount: existing.length });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to delete payroll exceptions for run",
			);
		}
	},
};
