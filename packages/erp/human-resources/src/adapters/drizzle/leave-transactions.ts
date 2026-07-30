/**
 * HR Leave Transaction Utilities
 *
 * Shared transaction patterns and SQL builders for atomic leave operations.
 * Provides utilities for embedding audit logs, outbox events, and row locking
 * within Neon HTTP transactions using CTE patterns.
 */

import { randomUUID } from "node:crypto";
import {
	type PreparedDerivedEntityAuditInsertValues,
	prepareDerivedEntityAuditInsertValues,
} from "@afenda/audit";
import {
	type NeonHttpTransactionResults,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import type { OutboxFactInput } from "../../ports";

/**
 * Common SQL row types for leave operations
 */
export interface LeaveRequestSqlRow {
	approved_at: Date | null;
	backdate_justification: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	end_date: string;
	entitlement_id: string;
	id: string;
	is_backdated: boolean;
	organization_id: string;
	policy_id: string;
	requested_quantity: string;
	start_date: string;
	status: string;
	unit: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface LeaveAdjustmentSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	delta: string;
	entitlement_id: string;
	id: string;
	kind: string;
	organization_id: string;
	reason: string;
	source: string;
	source_request_id: string | null;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface LeaveEntitlementSqlRow {
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	employee_id: string;
	employment_id: string;
	id: string;
	opening_quantity: string;
	organization_id: string;
	period_end: string;
	period_start: string;
	policy_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface LeavePolicySqlRow {
	accrual_basis: string;
	accrual_frequency: string | null;
	accrual_quantity_per_period: string | null;
	allow_self_approval: boolean;
	allows_negative_balance: boolean;
	allows_partial_day: boolean;
	carry_forward_enabled: boolean;
	carry_forward_max_quantity: string | null;
	code: string;
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	entitlement_expiry_days: number | null;
	entitlement_expiry_rule: string;
	id: string;
	leave_type: string;
	name: string;
	organization_id: string;
	paid: boolean;
	sensitive: boolean;
	status: string;
	supersedes_policy_id: string | null;
	unit: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

/**
 * Audit and outbox JSON builders — SSOT in shared/audit-facts.
 */
export {
	eventPayloadJson,
	fieldChangeJson,
	valueSnapshotJson,
} from "../../shared/audit-facts";

const LEAVE_AUDIT_SOURCE = "human-resources.leave";
const SQL_IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;
const SQL_COLUMN_REFERENCE_PATTERN =
	/^(?:[a-z_][a-z0-9_]*\.)?[a-z_][a-z0-9_]*$/;

function assertGeneratedSqlIdentifier(value: string, label: string): void {
	if (!SQL_IDENTIFIER_PATTERN.test(value)) {
		throw new TypeError(`Invalid generated SQL ${label}`);
	}
}

function assertGeneratedSqlColumnReference(value: string, label: string): void {
	if (!SQL_COLUMN_REFERENCE_PATTERN.test(value)) {
		throw new TypeError(`Invalid generated SQL ${label}`);
	}
}

function parseGeneratedAuditJson(
	value: string | undefined,
	label: string,
): unknown {
	if (value === undefined) {
		return;
	}
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new TypeError(`Invalid generated audit ${label}`, { cause: error });
	}
}

function sqlStringLiteral(value: string | null): string {
	return value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
}

function preparedAuditValueSql(
	audit: PreparedDerivedEntityAuditInsertValues,
	entityIdReference: string,
): string {
	return [
		sqlStringLiteral(audit.organizationId),
		sqlStringLiteral(audit.actorUserId),
		sqlStringLiteral(audit.correlationId),
		sqlStringLiteral(audit.module),
		sqlStringLiteral(audit.entity),
		entityIdReference,
		sqlStringLiteral(audit.action),
		`${sqlStringLiteral(audit.changesJson)}::jsonb`,
		`${sqlStringLiteral(audit.oldValueJson)}::jsonb`,
		`${sqlStringLiteral(audit.newValueJson)}::jsonb`,
		`${sqlStringLiteral(audit.metadataJson)}::jsonb`,
		sqlStringLiteral(audit.ipAddress),
		sqlStringLiteral(audit.userAgent),
	].join(", ");
}

/**
 * CTE builders for common patterns
 */

/**
 * Build audit log CTE for inserting audit records
 */
export function buildAuditCte(params: {
	auditId: string;
	organizationId: string;
	actorUserId: string;
	module: string;
	entity: string;
	action: "CREATE" | "UPDATE" | "DELETE";
	correlationId: string;
	changesJson?: string;
	newValueJson?: string;
	causationId?: string | null;
	reasonCode: string;
	fromCte: string;
	entityIdReference: string;
}): string {
	assertGeneratedSqlIdentifier(params.fromCte, "source CTE");
	assertGeneratedSqlColumnReference(
		params.entityIdReference,
		"entity ID reference",
	);
	const preparedAudit = prepareDerivedEntityAuditInsertValues({
		organizationId: params.organizationId,
		actorUserId: params.actorUserId,
		correlationId: params.correlationId,
		module: params.module,
		entity: params.entity,
		action: params.action,
		changes: parseGeneratedAuditJson(params.changesJson, "changes"),
		newValue: parseGeneratedAuditJson(params.newValueJson, "new value"),
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: LEAVE_AUDIT_SOURCE,
			occurredAt: null,
			causationId: params.causationId ?? null,
			reasonCode: params.reasonCode,
		},
	});
	if (!preparedAudit.ok) {
		throw new TypeError("Invalid generated leave audit command");
	}
	const valuesSql = preparedAuditValueSql(
		preparedAudit.data,
		params.entityIdReference,
	);

	return `
		audited AS (
			INSERT INTO platform_audit_log (
				id, organization_id, actor_user_id, correlation_id, module, entity,
				entity_id, action, changes, old_value, new_value, metadata,
				ip_address, user_agent
			)
			SELECT
				${sqlStringLiteral(params.auditId)}, ${valuesSql}
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
		params.entitlementId === undefined
			? ""
			: `AND ent.id = '${params.entitlementId}'`;
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
export async function runLeaveTransaction(
	queriesOrFn: Parameters<typeof runNeonHttpTransaction>[0],
	options?: Parameters<typeof runNeonHttpTransaction>[1],
): Promise<NeonHttpTransactionResults> {
	return await runNeonHttpTransaction(queriesOrFn, {
		isolationLevel: "ReadCommitted",
		...options,
	});
}

/**
 * After a create-idempotency unique violation, wait briefly for the winning
 * transaction to commit and return the existing row when fingerprints match.
 */
export function resolveIdempotentCreateReplay<T>(params: {
	find: () => Promise<Result<{ fingerprint: string; value: T } | null>>;
	expectedFingerprint: string;
	mismatchMessage?: string;
	conflictMessage?: string;
}): Promise<Result<T>> {
	const maxAttempts = 8;
	const resolveAttempt = async (attempt: number): Promise<Result<T>> => {
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
				params.mismatchMessage ??
					"Idempotency key already used with different data",
			);
		}
		if (attempt < maxAttempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
			return resolveAttempt(attempt + 1);
		}
		return fail(
			"CONFLICT",
			params.conflictMessage ?? "Idempotency key conflict",
		);
	};
	return resolveAttempt(0);
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
	const segmentInserts = params.segments
		.map(
			(segment) => `
		('${segment.id}', '${params.organizationId}', '${params.requestId}', 
		 '${segment.segmentDate}', '${segment.quantity}', '${segment.dayPortion}')
	`,
		)
		.join(", ");

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
				${params.backdateJustification ? `'${params.backdateJustification}'` : "NULL"},
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
	const balanceCondition =
		params.requiredBalance && params.fromCte
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
				${params.sourceRequestId ? `'${params.sourceRequestId}'` : "NULL"}, '${params.kind}',
				'${params.delta}', '${params.reason}', '${params.source}', 'posted',
				'${params.createIdempotencyKey}', '${params.createRequestFingerprint}',
				1, '${params.createdBy}', '${params.createdBy}'
			${params.fromCte ? `FROM ${params.fromCte}` : ""}
			${balanceCondition}
			RETURNING *
		)
	`;
}
