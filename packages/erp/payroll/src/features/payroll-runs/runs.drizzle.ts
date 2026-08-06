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
import type {
	IdempotentPayrollRunRecord,
	PayrollException,
	PayrollExceptionCreateRecord,
	PayrollRun,
	PayrollRunCreateRecord,
	PayrollRunUpdateInput,
} from "../../kernel/contracts/projected-types";
import { assertExpectedVersion } from "../../kernel/execution/concurrency";
import {
	isPayrollRunIdentityUniqueViolation,
	isPostgresUniqueViolation,
	mapConflict,
	mapInvalidState,
	mapNotFound,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import type { MutationPorts } from "../../kernel/execution/ports";
import {
	type PayrollRunId,
	parsePayrollExceptionId,
	parsePayrollPayGroupId,
	parsePayrollPeriodId,
	parsePayrollRunId,
} from "../../kernel/identity/brands";
import {
	buildPayrollRunEventPayload,
	buildPayrollRunEventPayloadForType,
	payrollRunEventsForStatus,
} from "./lifecycle-events";
import { assertPayrollRunReversalUpdate } from "./reversal-policy";
import type { PayrollRunsStore } from "./runs.store";
import { assertPayrollRunTransition } from "./transitions";

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
		reversalReasonCode:
			row.reversalReasonCode as PayrollRun["reversalReasonCode"],
		reversalIdempotencyKey: row.reversalIdempotencyKey,
		reversalRequestFingerprint: row.reversalRequestFingerprint,
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
			if (isPostgresUniqueViolation(error)) {
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

	async listRunsForPeriod(input: {
		organizationId: string;
		periodId: string;
	}): Promise<Result<PayrollRun[]>> {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollRun)
				.where(
					and(
						eq(payrollRun.organizationId, input.organizationId),
						eq(payrollRun.periodId, input.periodId),
					),
				);
			const runs: PayrollRun[] = [];
			for (const row of rows) {
				const mapped = mapRunRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				runs.push(mapped.data);
			}
			return errorResult.ok(runs);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll runs for period",
			);
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
		const reversalCheck = assertPayrollRunReversalUpdate({
			current: current.data,
			update: input,
			nextStatus,
		});
		if (!reversalCheck.ok) {
			return reversalCheck;
		}
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
		const nextReversalReasonCode =
			input.reversalReasonCode === undefined
				? current.data.reversalReasonCode
				: input.reversalReasonCode;
		const nextReversalIdempotencyKey =
			input.reversalIdempotencyKey === undefined
				? current.data.reversalIdempotencyKey
				: input.reversalIdempotencyKey;
		const nextReversalRequestFingerprint =
			input.reversalRequestFingerprint === undefined
				? current.data.reversalRequestFingerprint
				: input.reversalRequestFingerprint;
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
		if (input.auditReason !== undefined) {
			changes.push({
				field: "reason",
				oldValue: null,
				newValue: input.auditReason,
			});
		}
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
		const eventRun = { ...current.data, status: nextStatus };
		const eventId1 = randomUUID();
		const eventId2 = randomUUID();
		const eventId3 = randomUUID();
		const payloads = eventTypes.map((eventType) =>
			buildPayrollRunEventPayloadForType({
				eventType,
				actorUserId: input.actorUserId,
				correlationId: input.correlationId,
				run: eventRun,
				finalizationProjection: input.finalizationProjection,
				reversalProjection: input.reversalProjection,
			}),
		);
		for (const [index, eventType] of eventTypes.entries()) {
			const validation = events.registry.validatePayload(
				eventType,
				payloads[index],
			);
			if (
				!validation.success ||
				events.registry.sourceModule(eventType) !== "payroll"
			) {
				return errorResult.fail("INTERNAL_ERROR");
			}
		}
		const [payload1 = null, payload2 = null, payload3 = null] = payloads.map(
			(payload) => JSON.stringify(payload),
		);
		const roundingPolicyJson =
			nextRoundingPolicy === null ? null : JSON.stringify(nextRoundingPolicy);
		const reversalTotalsJson = JSON.stringify(
			input.reversalProjection?.totals ?? [],
		);

		try {
			const [, , rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					SELECT id FROM payroll_run
					WHERE organization_id = ${input.organizationId}
						AND id = ${input.runId} AND version = ${input.expectedVersion}
					FOR UPDATE
				`,
				sqlValue`
					SELECT pg_advisory_xact_lock(
						hashtextextended(
							${input.organizationId}::text || ':' || rule_ref.rule_kind || ':' || rule_ref.rule_id::text,
							0
						)
					)
					FROM (
						SELECT DISTINCT rule_kind, rule_id
						FROM payroll_run_employee
						CROSS JOIN LATERAL (
							SELECT 'earning'::text AS rule_kind, (item ->> 'id')::uuid AS rule_id
							FROM jsonb_array_elements(
								CASE WHEN ${nextStatus}::text = 'finalized'
									THEN COALESCE(payroll_run_employee.snapshot_json -> 'earningRules', '[]'::jsonb)
									ELSE '[]'::jsonb END
							) AS item
							UNION ALL
							SELECT 'deduction'::text, (item ->> 'id')::uuid
							FROM jsonb_array_elements(
								CASE WHEN ${nextStatus}::text = 'finalized'
									THEN COALESCE(payroll_run_employee.snapshot_json -> 'deductionRules', '[]'::jsonb)
									ELSE '[]'::jsonb END
							) AS item
							UNION ALL
							SELECT 'statutory'::text, (item ->> 'id')::uuid
							FROM jsonb_array_elements(
								CASE WHEN ${nextStatus}::text = 'finalized'
									THEN COALESCE(payroll_run_employee.snapshot_json -> 'statutoryRules', '[]'::jsonb)
									ELSE '[]'::jsonb END
							) AS item
						) AS usage
						WHERE payroll_run_employee.organization_id = ${input.organizationId}
							AND payroll_run_employee.run_id = ${input.runId}
					) AS rule_ref
					ORDER BY rule_ref.rule_kind, rule_ref.rule_id
				`,
				sqlValue`
					WITH snapshot_rule_refs AS MATERIALIZED (
						SELECT DISTINCT rule_usage.rule_kind, rule_usage.rule_id,
							rule_usage.record_version
						FROM payroll_run_employee
						CROSS JOIN LATERAL (
							SELECT 'earning'::text AS rule_kind, (item ->> 'id')::uuid AS rule_id,
								(item ->> 'recordVersion')::integer AS record_version
							FROM jsonb_array_elements(
								CASE WHEN ${nextStatus}::text = 'finalized'
									THEN COALESCE(payroll_run_employee.snapshot_json -> 'earningRules', '[]'::jsonb)
									ELSE '[]'::jsonb END
							) AS item
							UNION ALL
							SELECT 'deduction'::text, (item ->> 'id')::uuid,
								(item ->> 'recordVersion')::integer
							FROM jsonb_array_elements(
								CASE WHEN ${nextStatus}::text = 'finalized'
									THEN COALESCE(payroll_run_employee.snapshot_json -> 'deductionRules', '[]'::jsonb)
									ELSE '[]'::jsonb END
							) AS item
							UNION ALL
							SELECT 'statutory'::text, (item ->> 'id')::uuid,
								(item ->> 'recordVersion')::integer
							FROM jsonb_array_elements(
								CASE WHEN ${nextStatus}::text = 'finalized'
									THEN COALESCE(payroll_run_employee.snapshot_json -> 'statutoryRules', '[]'::jsonb)
									ELSE '[]'::jsonb END
							) AS item
						) AS rule_usage
						WHERE payroll_run_employee.organization_id = ${input.organizationId}
							AND payroll_run_employee.run_id = ${input.runId}
					),
					mutated AS (
						UPDATE payroll_run
						SET status = ${nextStatus},
							calculation_snapshot_hash = ${nextSnapshotHash},
							calculation_version = ${nextCalculationVersion},
							rounding_policy_json = ${roundingPolicyJson}::jsonb,
							finalized_at = ${nextFinalizedAt}::timestamptz,
							finalized_by = ${nextFinalizedBy}, version = ${nextVersion},
							reversal_reason_code = ${nextReversalReasonCode},
							reversal_idempotency_key = ${nextReversalIdempotencyKey},
							reversal_request_fingerprint = ${nextReversalRequestFingerprint},
							updated_by = ${input.actorUserId}, updated_at = NOW()
					WHERE payroll_run.organization_id = ${input.organizationId}
						AND id = ${input.runId} AND version = ${input.expectedVersion}
						AND (
							${nextStatus}::text <> 'finalized'
							OR (
								NOT EXISTS (
									SELECT 1 FROM payroll_exception
									WHERE payroll_exception.organization_id = ${input.organizationId}
										AND run_id = ${input.runId} AND severity = 'blocking'
								)
								AND NOT EXISTS (
									SELECT 1 FROM snapshot_rule_refs
									WHERE CASE snapshot_rule_refs.rule_kind
										WHEN 'earning' THEN NOT EXISTS (
											SELECT 1 FROM payroll_earning_rule
											WHERE payroll_earning_rule.organization_id = ${input.organizationId}
												AND id = snapshot_rule_refs.rule_id
												AND version = snapshot_rule_refs.record_version
										)
										WHEN 'deduction' THEN NOT EXISTS (
											SELECT 1 FROM payroll_deduction_rule
											WHERE payroll_deduction_rule.organization_id = ${input.organizationId}
												AND id = snapshot_rule_refs.rule_id
												AND version = snapshot_rule_refs.record_version
										)
										WHEN 'statutory' THEN NOT EXISTS (
											SELECT 1 FROM payroll_statutory_rule
											WHERE payroll_statutory_rule.organization_id = ${input.organizationId}
												AND id = snapshot_rule_refs.rule_id
												AND version = snapshot_rule_refs.record_version
										)
										ELSE TRUE
									END
								)
							)
						)
						RETURNING id, organization_id, updated_by
					),
					finalized_rule_usage AS (
						INSERT INTO payroll_rule_finalized_usage (
							id, organization_id, rule_kind, rule_id, run_id
						)
						SELECT DISTINCT gen_random_uuid(), mutated.organization_id,
							rule_usage.rule_kind, rule_usage.rule_id, mutated.id
						FROM mutated CROSS JOIN snapshot_rule_refs AS rule_usage
						ON CONFLICT (organization_id, rule_kind, rule_id, run_id)
						DO NOTHING
						RETURNING id
					),
					reversal_adjustments AS (
						INSERT INTO payroll_adjustment (
							id, organization_id, original_run_id, reversal_run_id,
							original_run_employee_id, adjustment_type, amount,
							currency_code, reason, create_idempotency_key,
							create_request_fingerprint, created_by
						)
						SELECT gen_random_uuid(), mutated.organization_id, mutated.id, NULL,
							NULL, 'reversal', -(reversal_total.net::numeric),
							reversal_total."currencyCode", ${input.auditReason},
							${input.reversalIdempotencyKey}::text || ':' || reversal_total."currencyCode",
							${input.reversalRequestFingerprint},
							mutated.updated_by
						FROM mutated
						CROSS JOIN jsonb_to_recordset(${reversalTotalsJson}::jsonb)
							AS reversal_total("currencyCode" text, net text)
						WHERE ${nextStatus}::text = 'reversed'
						RETURNING id
					),
					payslip_work_items AS (
						INSERT INTO payroll_payslip (
							id, organization_id, run_id, run_employee_id, employee_id,
							view_version, content_hash, status, version,
							created_by, updated_by
						)
						SELECT gen_random_uuid(), mutated.organization_id, mutated.id,
							run_employee.id, run_employee.employee_id, 1,
							NULL, 'pending', 1,
							mutated.updated_by, mutated.updated_by
						FROM mutated
						JOIN payroll_run_employee AS run_employee
							ON run_employee.organization_id = mutated.organization_id
							AND run_employee.run_id = mutated.id
						WHERE ${nextStatus}::text = 'finalized'
						ON CONFLICT (organization_id, run_employee_id, view_version)
						DO NOTHING
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
						FROM mutated
						RETURNING id
					),
					event_values(event_id, event_type, dedupe_key, payload_json) AS (
						VALUES
							(${eventId1}::uuid, ${eventType1}::text, ${`${input.runId}:${nextStatus}:${nextVersion}:1`}::text, ${payload1}::jsonb),
							(${eventId2}::uuid, ${eventType2}::text, ${`${input.runId}:${nextStatus}:${nextVersion}:2`}::text, ${payload2}::jsonb),
							(${eventId3}::uuid, ${eventType3}::text, ${`${input.runId}:${nextStatus}:${nextVersion}:3`}::text, ${payload3}::jsonb)
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, deduplication_key,
							correlation_id, actor_user_id, payload, status, attempts
						)
						SELECT event_values.event_id, mutated.organization_id,
							event_values.event_type, 'payroll', event_values.dedupe_key,
							${input.correlationId}, mutated.updated_by,
							event_values.payload_json, 'pending', 0
						FROM mutated CROSS JOIN event_values
						WHERE event_values.event_type IS NOT NULL
						RETURNING id
					)
					SELECT mutated.id,
						(SELECT count(*) FROM payslip_work_items),
						(SELECT count(*) FROM reversal_adjustments)
					FROM mutated, audited
				`,
			]);
			if (rows.length === 0) {
				return mapConflict(
					nextStatus === "finalized"
						? "Payroll run is stale, has blocking exceptions, or references changed rules"
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

	async deleteExceptionsForRun(input, _ports) {
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

		const preparedAudit = afendaAudit.transaction.prepare({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			module: "payroll",
			entity: "payroll_run",
			entityId: input.runId,
			action: "DELETE",
			changes: [
				{
					field: "exceptions",
					oldValue: "present",
					newValue: "cleared",
				},
			],
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
				WITH locked_run AS MATERIALIZED (
					SELECT id FROM payroll_run
					WHERE payroll_run.organization_id = ${input.organizationId}
						AND id = ${input.runId}
						AND status NOT IN ('finalized', 'reversed')
					FOR UPDATE
				),
				deleted AS (
					DELETE FROM payroll_exception
					WHERE payroll_exception.organization_id = ${input.organizationId}
						AND run_id = ${input.runId}
						AND EXISTS (SELECT 1 FROM locked_run)
					RETURNING id
				),
					deleted_summary AS (
						SELECT count(*) AS deleted_count FROM deleted
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
						FROM deleted_summary WHERE deleted_count > 0
						RETURNING id
					)
					SELECT deleted.id FROM deleted CROSS JOIN audited
				`,
			]);
			if (rows.length === 0) {
				const latest = await this.getRun({
					organizationId: input.organizationId,
					runId: input.runId,
				});
				if (!latest.ok) {
					return latest;
				}
				if (
					latest.data === null ||
					latest.data.status === "finalized" ||
					latest.data.status === "reversed"
				) {
					return mapInvalidState(
						"Finalized or reversed payroll runs cannot delete exceptions",
					);
				}
				return errorResult.ok({ deletedCount: 0 });
			}

			return errorResult.ok({ deletedCount: rows.length });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to delete payroll exceptions for run",
			);
		}
	},
};
