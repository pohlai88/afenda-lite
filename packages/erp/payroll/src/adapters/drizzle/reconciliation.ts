import { randomUUID } from "node:crypto";
import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	eq,
	payrollReconciliation,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import { parsePayrollReconciliationId, parsePayrollRunId } from "../../brands";
import {
	isPostgresUniqueViolation,
	mapConflict,
	mapNotFound,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import type { PayrollReconciliationStore } from "../../store/reconciliation";
import type { PayrollReconciliation } from "../../types";

function mapRow(
	row: typeof payrollReconciliation.$inferSelect,
): Result<PayrollReconciliation> {
	const id = parsePayrollReconciliationId(row.id);
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
		kind: row.kind as PayrollReconciliation["kind"],
		downstreamReference: row.downstreamReference,
		expectedAmount: String(row.expectedAmount),
		actualAmount: String(row.actualAmount),
		toleranceAmount: String(row.toleranceAmount),
		currencyCode: row.currencyCode,
		status: row.status as PayrollReconciliation["status"],
		resolutionNote: row.resolutionNote,
		resolvedBy: row.resolvedBy,
		resolvedAt: row.resolvedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

export const drizzleReconciliationMethods: PayrollReconciliationStore = {
	async findReconciliationByIdempotencyKey(input) {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollReconciliation)
				.where(
					and(
						eq(payrollReconciliation.organizationId, input.organizationId),
						eq(
							payrollReconciliation.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const mapped = mapRow(row);
			return mapped.ok
				? errorResult.ok({
						entity: mapped.data,
						createRequestFingerprint: row.createRequestFingerprint,
					})
				: mapped;
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load payroll reconciliation idempotency",
			);
		}
	},
	async createReconciliation(record, _ports) {
		const existing = await this.findReconciliationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.idempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
				? errorResult.ok(existing.data.entity)
				: mapConflict("Idempotency key conflict");
		}
		const id = parsePayrollReconciliationId(randomUUID());
		if (!id.ok) {
			return id;
		}
		const prepared = afendaAudit.transaction.prepare({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: record.correlationId,
			module: "payroll",
			entity: "payroll_reconciliation",
			entityId: id.data,
			action: "CREATE",
			newValue: {
				runId: record.runId,
				kind: record.kind,
				status: record.status,
			},
		});
		if (!prepared.ok) {
			return prepared;
		}
		const audit = prepared.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
				WITH inserted AS (
					INSERT INTO payroll_reconciliation (
						id, organization_id, run_id, kind, downstream_reference,
						expected_amount, actual_amount, tolerance_amount, currency_code,
						status, create_idempotency_key, create_request_fingerprint,
						version, created_by, updated_by
					)
					SELECT ${id.data}, ${record.organizationId}, ${record.runId}, ${record.kind},
						${record.downstreamReference}, ${record.expectedAmount}, ${record.actualAmount},
						${record.toleranceAmount}, ${record.currencyCode}, ${record.status},
						${record.idempotencyKey}, ${record.createRequestFingerprint}, 1,
						${record.createdBy}, ${record.createdBy}
					WHERE EXISTS (SELECT 1 FROM payroll_run WHERE organization_id = ${record.organizationId} AND id = ${record.runId} AND status IN ('finalized','reversed'))
					RETURNING id
				), audited AS (
					INSERT INTO platform_audit_log (id, organization_id, actor_user_id, correlation_id, module, entity, entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent)
					SELECT ${randomUUID()}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId}, ${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent} FROM inserted RETURNING id
				) SELECT inserted.id FROM inserted, audited
			`,
			]);
			if (rows.length === 0) {
				return mapNotFound("Finalized payroll run not found");
			}
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollReconciliation)
				.where(
					and(
						eq(payrollReconciliation.organizationId, record.organizationId),
						eq(payrollReconciliation.id, id.data),
					),
				)
				.limit(1);
			return row === undefined
				? mapNotFound("Payroll reconciliation not found")
				: mapRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const replay = await this.findReconciliationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
				});
				if (
					replay.ok &&
					replay.data !== null &&
					replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
				) {
					return errorResult.ok(replay.data.entity);
				}
				return mapConflict("Payroll reconciliation conflict");
			}
			return mapPersistenceFailure(
				error,
				"Failed to create payroll reconciliation",
			);
		}
	},
	async resolveReconciliation(input, _ports) {
		const prepared = afendaAudit.transaction.prepare({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			module: "payroll",
			entity: "payroll_reconciliation",
			entityId: input.reconciliationId,
			action: "UPDATE",
			changes: [
				{ field: "status", oldValue: "discrepant", newValue: "resolved" },
			],
		});
		if (!prepared.ok) {
			return prepared;
		}
		const audit = prepared.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
					WITH updated AS (
						UPDATE payroll_reconciliation
						SET status = 'resolved', resolution_note = ${input.resolutionNote},
							resolved_by = ${input.actorUserId}, resolved_at = NOW(),
							version = version + 1, updated_by = ${input.actorUserId}, updated_at = NOW()
						WHERE organization_id = ${input.organizationId}
							AND id = ${input.reconciliationId}
							AND version = ${input.expectedVersion} AND status = 'discrepant'
						RETURNING id
					), audited AS (
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
						FROM updated RETURNING id
					) SELECT updated.id FROM updated, audited
				`,
			]);
			if (rows.length === 0) {
				return mapConflict(
					"Payroll reconciliation is missing, stale, or not discrepant",
				);
			}
			const [row] = await afendaDatabase.client
				.select()
				.from(payrollReconciliation)
				.where(
					and(
						eq(payrollReconciliation.organizationId, input.organizationId),
						eq(payrollReconciliation.id, input.reconciliationId),
					),
				)
				.limit(1);
			return row === undefined
				? mapNotFound("Payroll reconciliation not found")
				: mapRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve payroll reconciliation",
			);
		}
	},
	async listReconciliationsForRun(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(payrollReconciliation)
				.where(
					and(
						eq(payrollReconciliation.organizationId, input.organizationId),
						eq(payrollReconciliation.runId, input.runId),
					),
				)
				.orderBy(payrollReconciliation.createdAt, payrollReconciliation.id);
			const entities: PayrollReconciliation[] = [];
			for (const row of rows) {
				const mapped = mapRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				entities.push(mapped.data);
			}
			return errorResult.ok(entities);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list payroll reconciliations",
			);
		}
	},
};
