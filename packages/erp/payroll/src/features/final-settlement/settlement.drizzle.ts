import { randomUUID } from "node:crypto";

import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	eq,
	payrollFinalSettlement,
	payrollFinalSettlementLine,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { events } from "@afenda/events";

import {
	isPostgresUniqueViolation,
	mapConflict,
	mapPersistenceFailure,
} from "../../kernel/execution/persistence-errors";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	PayrollFinalSettlement,
	PayrollFinalSettlementLine,
} from "./contract";
import {
	payrollFinalSettlementCompensationSnapshotSchema,
	payrollFinalSettlementFactsSchema,
	payrollFinalSettlementLineKindSchema,
	payrollFinalSettlementStatusSchema,
	payrollFinalSettlementStatutoryEvidenceSchema,
	payrollFinalSettlementTotalsSchema,
} from "./settlement.schema";
import type { PayrollFinalSettlementStore } from "./settlement.store";
import {
	buildPayrollFinalSettlementEventPayload,
	payrollFinalSettlementEventForStatus,
} from "./settlement-lifecycle-events";

function prepareSettlementLifecycleWrite(input: {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	nextStatus: PayrollFinalSettlement["status"];
	nextVersion: number;
	organizationId: string;
	previousStatus?: PayrollFinalSettlement["status"];
	previousVersion?: number;
	settlementId: string;
}) {
	const eventType = payrollFinalSettlementEventForStatus(input.nextStatus);
	const changes =
		input.previousStatus === undefined ||
		input.previousStatus === input.nextStatus
			? []
			: [
					{
						field: "status",
						oldValue: input.previousStatus,
						newValue: input.nextStatus,
					},
				];
	const preparedAudit = afendaAudit.transaction.prepare({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "payroll",
		entity: "payroll_final_settlement",
		entityId: input.settlementId,
		action: input.action,
		changes,
		oldValue:
			input.previousStatus === undefined
				? null
				: {
						status: input.previousStatus,
						version: input.previousVersion,
					},
		newValue: { status: input.nextStatus, version: input.nextVersion },
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const payload = buildPayrollFinalSettlementEventPayload({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		settlementId: input.settlementId,
	});
	const payloadValidation = events.registry.validatePayload(eventType, payload);
	const sourceModule = events.registry.sourceModule(eventType);
	if (!payloadValidation.success || sourceModule !== "payroll") {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		audit: preparedAudit.data,
		auditId: randomUUID(),
		eventId: randomUUID(),
		eventType,
		payloadJson: JSON.stringify(payloadValidation.data),
		sourceModule,
	});
}

function mapSettlement(
	row: typeof payrollFinalSettlement.$inferSelect,
): Result<PayrollFinalSettlement> {
	const status = payrollFinalSettlementStatusSchema.safeParse(row.status);
	const facts = payrollFinalSettlementFactsSchema.safeParse(row.factsJson);
	const compensationSnapshot =
		payrollFinalSettlementCompensationSnapshotSchema.safeParse(
			row.compensationSnapshotJson,
		);
	if (!(status.success && facts.success && compensationSnapshot.success)) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let totals: PayrollFinalSettlement["totals"] = null;
	if (row.totalsJson !== null) {
		const parsed = payrollFinalSettlementTotalsSchema.safeParse(row.totalsJson);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		totals = parsed.data;
	}
	let statutoryEvidence: PayrollFinalSettlement["statutoryEvidence"] = null;
	if (row.statutoryEvidenceJson !== null) {
		const parsed = payrollFinalSettlementStatutoryEvidenceSchema.safeParse(
			row.statutoryEvidenceJson,
		);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		statutoryEvidence = parsed.data;
	}
	return errorResult.ok({
		calculatedAt: row.calculatedAt,
		calculatedBy: row.calculatedBy,
		clearanceAt: row.clearanceAt,
		clearanceBy: row.clearanceBy,
		clearanceReason: row.clearanceReason,
		clearanceRequiredReason: row.clearanceRequiredReason,
		compensationSnapshot: compensationSnapshot.data,
		compensationSnapshotHash: row.compensationSnapshotHash,
		correlationId: row.correlationId,
		createdAt: row.createdAt,
		createdBy: row.createdBy,
		employeeId: row.employeeId,
		facts: facts.data,
		finalizedAt: row.finalizedAt,
		finalizedBy: row.finalizedBy,
		id: row.id,
		idempotencyKey: row.createIdempotencyKey,
		organizationId: row.organizationId,
		originRunId: row.originRunId,
		payGroupId: row.payGroupId,
		periodId: row.periodId,
		requestFingerprint: row.createRequestFingerprint,
		statutoryEvidence,
		status: status.data,
		terminationEffectiveOn: row.terminationEffectiveOn,
		terminationId: row.terminationId,
		totals,
		updatedAt: row.updatedAt,
		updatedBy: row.updatedBy,
		version: row.version,
	});
}

function mapLine(
	row: typeof payrollFinalSettlementLine.$inferSelect,
): Result<PayrollFinalSettlementLine> {
	const kind = payrollFinalSettlementLineKindSchema.safeParse(row.kind);
	if (!kind.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		amount: row.amount,
		code: row.code,
		createdAt: row.createdAt,
		currencyCode: row.currencyCode,
		id: row.id,
		kind: kind.data,
		organizationId: row.organizationId,
		sequence: row.sequence,
		settlementId: row.settlementId,
	});
}

export const drizzleFinalSettlementMethods: PayrollFinalSettlementStore = {
	async createFinalSettlement(input, _ports: MutationPorts) {
		const { settlement } = input;
		const prepared = prepareSettlementLifecycleWrite({
			action: "CREATE",
			actorUserId: settlement.createdBy,
			correlationId: settlement.correlationId,
			nextStatus: settlement.status,
			nextVersion: settlement.version,
			organizationId: settlement.organizationId,
			settlementId: settlement.id,
		});
		if (!prepared.ok) {
			return prepared;
		}
		const { audit, auditId, eventId, eventType, payloadJson, sourceModule } =
			prepared.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH mutated AS (
						INSERT INTO payroll_final_settlement (
							id, organization_id, employee_id, termination_id,
							termination_effective_on, period_id, pay_group_id, origin_run_id,
							status, facts_json, compensation_snapshot_json,
							compensation_snapshot_hash, totals_json, statutory_evidence_json,
							clearance_required_reason, clearance_reason, clearance_by,
							clearance_at, calculated_by, calculated_at, finalized_by,
							finalized_at, correlation_id, create_idempotency_key,
							create_request_fingerprint, version, created_by, updated_by,
							created_at, updated_at
						) VALUES (
							${settlement.id}::uuid, ${settlement.organizationId},
							${settlement.employeeId}, ${settlement.terminationId},
							${settlement.terminationEffectiveOn}, ${settlement.periodId}::uuid,
							${settlement.payGroupId}::uuid, ${settlement.originRunId},
							${settlement.status}, ${JSON.stringify(settlement.facts)}::jsonb,
							${JSON.stringify(settlement.compensationSnapshot)}::jsonb,
							${settlement.compensationSnapshotHash},
							${settlement.totals === null ? null : JSON.stringify(settlement.totals)}::jsonb,
							${settlement.statutoryEvidence === null ? null : JSON.stringify(settlement.statutoryEvidence)}::jsonb,
							${settlement.clearanceRequiredReason}, ${settlement.clearanceReason},
							${settlement.clearanceBy}, ${settlement.clearanceAt},
							${settlement.calculatedBy}, ${settlement.calculatedAt},
							${settlement.finalizedBy}, ${settlement.finalizedAt},
							${settlement.correlationId}, ${settlement.idempotencyKey},
							${settlement.requestFingerprint}, ${settlement.version},
							${settlement.createdBy}, ${settlement.updatedBy},
							${settlement.createdAt}, ${settlement.updatedAt}
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
							${`${settlement.id}:${settlement.status}:${settlement.version}`},
							${settlement.correlationId}, created_by, ${payloadJson}::jsonb,
							'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows.length === 0) {
				return mapPersistenceFailure(
					new Error("Missing transactional returning row"),
					"Failed to initiate payroll final settlement",
				);
			}
			return errorResult.ok(settlement);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Idempotency key conflict");
			}
			return mapPersistenceFailure(
				error,
				"Failed to initiate payroll final settlement",
			);
		}
	},

	async findFinalSettlementByIdempotencyKey(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollFinalSettlement)
				.where(
					and(
						eq(payrollFinalSettlement.organizationId, input.organizationId),
						eq(
							payrollFinalSettlement.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapSettlement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll final settlement",
			);
		}
	},

	async getFinalSettlement(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollFinalSettlement)
				.where(
					and(
						eq(payrollFinalSettlement.organizationId, input.organizationId),
						eq(payrollFinalSettlement.id, input.settlementId),
					),
				)
				.limit(1);
			return row === undefined ? errorResult.ok(null) : mapSettlement(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll final settlement",
			);
		}
	},

	async listFinalSettlementLines(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollFinalSettlementLine)
				.where(
					and(
						eq(payrollFinalSettlementLine.organizationId, input.organizationId),
						eq(payrollFinalSettlementLine.settlementId, input.settlementId),
					),
				)
				.orderBy(payrollFinalSettlementLine.sequence);
			const lines: PayrollFinalSettlementLine[] = [];
			for (const row of rows) {
				const mapped = mapLine(row);
				if (!mapped.ok) {
					return mapped;
				}
				lines.push(mapped.data);
			}
			return errorResult.ok(lines);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll final settlement lines",
			);
		}
	},

	async saveFinalSettlementCalculation(input, _ports: MutationPorts) {
		const { settlement } = input;
		const current = await this.getFinalSettlement({
			organizationId: settlement.organizationId,
			settlementId: settlement.id,
		});
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return mapConflict("Final settlement version conflict");
		}
		const prepared = prepareSettlementLifecycleWrite({
			action: "UPDATE",
			actorUserId: settlement.updatedBy,
			correlationId: settlement.correlationId,
			nextStatus: settlement.status,
			nextVersion: settlement.version,
			organizationId: settlement.organizationId,
			previousStatus: current.data.status,
			previousVersion: current.data.version,
			settlementId: settlement.id,
		});
		if (!prepared.ok) {
			return prepared;
		}
		const { audit, auditId, eventId, eventType, payloadJson, sourceModule } =
			prepared.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH mutated AS (
						UPDATE payroll_final_settlement
						SET
							status = ${settlement.status},
							totals_json = ${JSON.stringify(settlement.totals)}::jsonb,
							statutory_evidence_json = ${
								settlement.statutoryEvidence === null
									? null
									: JSON.stringify(settlement.statutoryEvidence)
							}::jsonb,
							clearance_reason = ${settlement.clearanceReason},
							clearance_by = ${settlement.clearanceBy},
							clearance_at = ${settlement.clearanceAt},
							calculated_by = ${settlement.calculatedBy},
							calculated_at = ${settlement.calculatedAt},
							version = ${settlement.version},
							updated_by = ${settlement.updatedBy},
							updated_at = ${settlement.updatedAt}
						WHERE organization_id = ${settlement.organizationId}
							AND id = ${settlement.id}::uuid
							AND version = ${input.expectedVersion}
						RETURNING id, organization_id, updated_by
					),
					lines_deleted AS (
						DELETE FROM payroll_final_settlement_line
						WHERE organization_id = ${settlement.organizationId}
							AND settlement_id = ${settlement.id}::uuid
							AND EXISTS (SELECT 1 FROM mutated)
						RETURNING id
					),
					lines_inserted AS (
						INSERT INTO payroll_final_settlement_line (
							id, organization_id, settlement_id, kind, code, amount,
							currency_code, sequence, created_at
						)
						SELECT
							(entry->>'id')::uuid,
							entry->>'organizationId',
							(entry->>'settlementId')::uuid,
							entry->>'kind',
							entry->>'code',
							(entry->>'amount')::numeric,
							entry->>'currencyCode',
							(entry->>'sequence')::integer,
							(entry->>'createdAt')::timestamptz
						FROM jsonb_array_elements(${JSON.stringify(input.lines)}::jsonb) AS entry
						WHERE EXISTS (SELECT 1 FROM mutated)
						RETURNING id
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
							${`${settlement.id}:${settlement.status}:${settlement.version}`},
							${settlement.correlationId}, updated_by, ${payloadJson}::jsonb,
							'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Final settlement version conflict");
			}
			return errorResult.ok(settlement);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return mapConflict("Final settlement line conflict");
			}
			return mapPersistenceFailure(
				error,
				"Failed to calculate payroll final settlement",
			);
		}
	},

	async saveFinalSettlementTransition(input, _ports: MutationPorts) {
		const { settlement } = input;
		const current = await this.getFinalSettlement({
			organizationId: settlement.organizationId,
			settlementId: settlement.id,
		});
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return mapConflict("Final settlement version conflict");
		}
		const prepared = prepareSettlementLifecycleWrite({
			action: "UPDATE",
			actorUserId: settlement.updatedBy,
			correlationId: settlement.correlationId,
			nextStatus: settlement.status,
			nextVersion: settlement.version,
			organizationId: settlement.organizationId,
			previousStatus: current.data.status,
			previousVersion: current.data.version,
			settlementId: settlement.id,
		});
		if (!prepared.ok) {
			return prepared;
		}
		const { audit, auditId, eventId, eventType, payloadJson, sourceModule } =
			prepared.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH mutated AS (
						UPDATE payroll_final_settlement
						SET
							status = ${settlement.status},
							finalized_by = ${settlement.finalizedBy},
							finalized_at = ${settlement.finalizedAt},
							version = ${settlement.version},
							updated_by = ${settlement.updatedBy},
							updated_at = ${settlement.updatedAt}
						WHERE organization_id = ${settlement.organizationId}
							AND id = ${settlement.id}::uuid
							AND version = ${input.expectedVersion}
						RETURNING id, organization_id, updated_by
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
							${`${settlement.id}:${settlement.status}:${settlement.version}`},
							${settlement.correlationId}, updated_by, ${payloadJson}::jsonb,
							'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.id FROM mutated, audited, outboxed
				`,
			]);
			if (rows.length === 0) {
				return mapConflict("Final settlement version conflict");
			}
			return errorResult.ok(settlement);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update payroll final settlement",
			);
		}
	},
};
