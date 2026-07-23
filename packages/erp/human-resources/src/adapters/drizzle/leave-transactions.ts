/**
 * HR Leave Transaction Utilities
 * 
 * Shared transaction patterns and SQL builders for atomic leave operations.
 * Provides utilities for embedding audit logs, outbox events, and row locking
 * within Neon HTTP transactions using CTE patterns.
 */

import { randomUUID } from "node:crypto";
import { runNeonHttpTransaction } from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import type { OutboxFactInput } from "../../ports";

/**
 * Common SQL row types for leave operations
 */
export type LeaveRequestSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	employment_id: string;
	entitlement_id: string;
	policy_id: string;
	start_date: string;
	end_date: string;
	requested_quantity: string;
	unit: string;
	status: string;
	is_backdated: boolean;
	backdate_justification: string | null;
	approved_at: Date | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

export type LeaveAdjustmentSqlRow = {
	id: string;
	organization_id: string;
	entitlement_id: string;
	source_request_id: string | null;
	kind: string;
	delta: string;
	reason: string;
	source: string;
	status: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

export type LeaveEntitlementSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	employment_id: string;
	policy_id: string;
	period_start: string;
	period_end: string;
	opening_quantity: string;
	status: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

export type LeavePolicySqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	leave_type: string;
	unit: string;
	paid: boolean;
	sensitive: boolean;
	allows_negative_balance: boolean;
	allow_self_approval: boolean;
	allows_partial_day: boolean;
	effective_from: string;
	effective_to: string | null;
	status: string;
	supersedes_policy_id: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

/**
 * Audit and outbox JSON builders — SSOT in shared/audit-facts.
 */
export {
	eventPayloadJson,
	fieldChangeJson,
	valueSnapshotJson,
} from "../../shared/audit-facts";

/**
 * CTE builders for common patterns
 */

/**
 * Build audit log CTE for inserting audit records
 */
export function buildAuditCte(params: {
	auditId: string;
	module: string;
	entity: string;
	action: "CREATE" | "UPDATE" | "DELETE";
	correlationId: string;
	changes?: string;
	newValue?: string;
	fromCte: string;
	selectFields: {
		organizationId: string;
		entityId: string;
		actorUserId: string;
	};
}): string {
	const changesClause = params.changes ? `, ${params.changes}::jsonb` : ", '[]'::jsonb";
	const newValueClause = params.newValue ? `, ${params.newValue}::jsonb` : ", NULL";
	
	return `
		audited AS (
			INSERT INTO platform_audit_log (
				id, organization_id, actor_user_id, correlation_id, module, entity,
				entity_id, action, changes, new_value
			)
			SELECT
				'${params.auditId}', ${params.selectFields.organizationId}, ${params.selectFields.actorUserId}, 
				'${params.correlationId}', '${params.module}', '${params.entity}', 
				${params.selectFields.entityId}, '${params.action}'${changesClause}${newValueClause}
			FROM ${params.fromCte}
			RETURNING id
		)
	`;
}

/**
 * Build outbox event CTE for inserting domain events
 */
export function buildOutboxCte(params: {
	eventId: string;
	eventType: OutboxFactInput["type"];
	sourceModule: string;
	correlationId: string;
	payload: string;
	fromCte: string;
	selectFields: {
		organizationId: string;
		actorUserId: string;
	};
}): string {
	return `
		outboxed AS (
			INSERT INTO platform_domain_event (
				id, organization_id, type, source_module, correlation_id, actor_user_id,
				payload, status, attempts
			)
			SELECT
				'${params.eventId}', ${params.selectFields.organizationId}, '${params.eventType}', 
				'${params.sourceModule}', '${params.correlationId}', ${params.selectFields.actorUserId},
				${params.payload}::jsonb, 'pending', 0
			FROM ${params.fromCte}
			RETURNING id
		)
	`;
}

/**
 * Build row locking CTE for entitlements
 */
export function buildLockEntitlementCte(params: {
	organizationId: string;
	entitlementId: string;
}): string {
	return `
		locked_entitlement AS (
			SELECT * FROM hr_leave_entitlement
			WHERE id = '${params.entitlementId}' 
			AND organization_id = '${params.organizationId}'
			FOR UPDATE
		)
	`;
}

/**
 * Build row locking CTE for leave requests
 */
export function buildLockRequestCte(params: {
	organizationId: string;
	requestId: string;
}): string {
	return `
		locked_request AS (
			SELECT * FROM hr_leave_request
			WHERE id = '${params.requestId}' 
			AND organization_id = '${params.organizationId}'
			FOR UPDATE
		)
	`;
}

/**
 * Build balance validation CTE that computes current available balance
 */
export function buildBalanceCheckCte(params: {
	organizationId: string;
	entitlementId?: string;
	fromCte?: string;
}): string {
	const fromClause = params.fromCte ?? "hr_leave_entitlement ent";
	const idFilter =
		params.entitlementId !== undefined
			? `AND ent.id = '${params.entitlementId}'`
			: "";
	return `
		balance_check AS (
			SELECT 
				ent.id as entitlement_id,
				ent.opening_quantity::numeric as opening_quantity,
				COALESCE(
					(SELECT SUM(adj.delta::numeric) 
					 FROM hr_leave_adjustment adj 
					 WHERE adj.entitlement_id = ent.id 
					 AND adj.organization_id = '${params.organizationId}'
					 AND adj.status = 'posted'), 
					0
				) as total_adjustments,
				(ent.opening_quantity::numeric + 
				 COALESCE(
					(SELECT SUM(adj.delta::numeric) 
					 FROM hr_leave_adjustment adj 
					 WHERE adj.entitlement_id = ent.id 
					 AND adj.organization_id = '${params.organizationId}'
					 AND adj.status = 'posted'), 
					0
				 )) as available_balance
			FROM ${fromClause}
			WHERE ent.organization_id = '${params.organizationId}'
			${idFilter}
		)
	`;
}

/**
 * Generic transaction wrapper for leave operations
 */
export async function runLeaveTransaction<T extends unknown[]>(
	queriesOrFn: Parameters<typeof runNeonHttpTransaction<T>>[0],
	options?: Parameters<typeof runNeonHttpTransaction<T>>[1],
): Promise<T> {
	return runNeonHttpTransaction<T>(queriesOrFn, {
		isolationLevel: "ReadCommitted",
		...options,
	});
}

/**
 * After a create-idempotency unique violation, wait briefly for the winning
 * transaction to commit and return the existing row when fingerprints match.
 */
export async function resolveIdempotentCreateReplay<T>(params: {
	find: () => Promise<
		Result<{ fingerprint: string; value: T } | null>
	>;
	expectedFingerprint: string;
	mismatchMessage?: string;
	conflictMessage?: string;
}): Promise<Result<T>> {
	const maxAttempts = 8;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const replay = await params.find();
		if (!replay.ok) {
			return replay;
		}
		if (replay.data !== null) {
			if (replay.data.fingerprint === params.expectedFingerprint) {
				return ok(replay.data.value);
			}
			return fail(
				"CONFLICT",
				params.mismatchMessage ?? "Idempotency key already used with different data",
			);
		}
		if (attempt < maxAttempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
		}
	}
	return fail(
		"CONFLICT",
		params.conflictMessage ?? "Idempotency key conflict",
	);
}

/**
 * Generate unique IDs for transaction components
 */
export function generateTransactionIds() {
	return {
		auditId: randomUUID(),
		eventId: randomUUID(),
	};
}

/**
 * Validation helpers for transaction inputs
 */
export function validateTransactionInput(input: {
	organizationId: string;
	correlationId: string;
	actorUserId: string;
}): Result<void> {
	if (!input.organizationId) {
		return fail("VALIDATION_ERROR", "organizationId is required");
	}
	if (!input.correlationId) {
		return fail("VALIDATION_ERROR", "correlationId is required");
	}
	if (!input.actorUserId) {
		return fail("VALIDATION_ERROR", "actorUserId is required");
	}
	return ok(undefined);
}

/**
 * Common CTE patterns for leave operations
 */

/**
 * Build a complete leave request insertion CTE with segments
 */
export function buildCreateRequestWithSegmentsCte(params: {
	requestId: string;
	organizationId: string;
	employeeId: string;
	employmentId: string;
	entitlementId: string;
	policyId: string;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	unit: string;
	isBackdated: boolean;
	backdateJustification: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	segments: Array<{
		id: string;
		segmentDate: string;
		quantity: string;
		dayPortion: string;
	}>;
}): string {
	const segmentInserts = params.segments.map(segment => `
		('${segment.id}', '${params.organizationId}', '${params.requestId}', 
		 '${segment.segmentDate}', '${segment.quantity}', '${segment.dayPortion}')
	`).join(', ');

	return `
		inserted_request AS (
			INSERT INTO hr_leave_request (
				id, organization_id, employee_id, employment_id, entitlement_id, policy_id,
				start_date, end_date, requested_quantity, unit, status, is_backdated,
				backdate_justification, create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			) VALUES (
				'${params.requestId}', '${params.organizationId}', '${params.employeeId}',
				'${params.employmentId}', '${params.entitlementId}', '${params.policyId}',
				'${params.startDate}', '${params.endDate}', '${params.requestedQuantity}',
				'${params.unit}', 'draft', ${params.isBackdated}, 
				${params.backdateJustification ? `'${params.backdateJustification}'` : 'NULL'},
				'${params.createIdempotencyKey}', '${params.createRequestFingerprint}',
				1, '${params.createdBy}', '${params.createdBy}'
			)
			RETURNING *
		),
		inserted_segments AS (
			INSERT INTO hr_leave_request_segment (
				id, organization_id, request_id, segment_date, quantity, day_portion
			) VALUES ${segmentInserts}
			RETURNING *
		)
	`;
}

/**
 * Build leave adjustment insertion CTE
 */
export function buildCreateAdjustmentCte(params: {
	adjustmentId: string;
	organizationId: string;
	entitlementId: string;
	sourceRequestId: string | null;
	kind: string;
	delta: string;
	reason: string;
	source: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	requiredBalance?: string;
	fromCte?: string;
}): string {
	const balanceCondition = params.requiredBalance && params.fromCte 
		? `WHERE (SELECT available_balance FROM ${params.fromCte}) >= ${params.requiredBalance}`
		: "";

	return `
		inserted_adjustment AS (
			INSERT INTO hr_leave_adjustment (
				id, organization_id, entitlement_id, source_request_id, kind, delta,
				reason, source, status, create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			) 
			SELECT 
				'${params.adjustmentId}', '${params.organizationId}', '${params.entitlementId}',
				${params.sourceRequestId ? `'${params.sourceRequestId}'` : 'NULL'}, '${params.kind}',
				'${params.delta}', '${params.reason}', '${params.source}', 'posted',
				'${params.createIdempotencyKey}', '${params.createRequestFingerprint}',
				1, '${params.createdBy}', '${params.createdBy}'
			${params.fromCte ? `FROM ${params.fromCte}` : ""}
			${balanceCondition}
			RETURNING *
		)
	`;
}