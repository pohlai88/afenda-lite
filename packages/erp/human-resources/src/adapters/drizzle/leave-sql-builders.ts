/**
 * HR Leave SQL Builders
 *
 * Specialized SQL generation utilities for complex leave workflow transactions.
 * Provides high-level builders for complete leave operations that require
 * multiple related database changes in a single atomic transaction.
 */

import {
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
} from "@afenda/events";
import type { OutboxFactInput } from "../../ports";
import {
	buildAuditCte,
	buildCreateRequestWithSegmentsCte,
	buildLockEntitlementCte,
	buildLockRequestCte,
	buildOutboxCte,
	eventPayloadJson,
	fieldChangeJson,
	generateTransactionIds,
	valueSnapshotJson,
} from "./leave-transactions";

/**
 * Build complete CREATE leave request transaction SQL
 */
export function buildCreateLeaveRequestSql(params: {
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
	correlationId: string;
	segments: Array<{
		id: string;
		segmentDate: string;
		quantity: string;
		dayPortion: string;
	}>;
}): string {
	const { auditId } = generateTransactionIds();

	const newValueJson = valueSnapshotJson({
		employeeId: params.employeeId,
		startDate: params.startDate,
		endDate: params.endDate,
		requestedQuantity: params.requestedQuantity,
		segmentCount: params.segments.length,
	});

	const requestCte = buildCreateRequestWithSegmentsCte(params);

	const auditCte = buildAuditCte({
		auditId,
		module: "human-resources",
		entity: "hr_leave_request",
		action: "CREATE",
		correlationId: params.correlationId,
		newValue: `'${newValueJson}'`,
		fromCte: "inserted_request",
		selectFields: {
			organizationId: "organization_id",
			entityId: "id",
			actorUserId: "created_by",
		},
	});

	return `
		WITH ${requestCte.replace(/^[\s]*WITH\s/, "")}, 
		${auditCte.replace(/^[\s]*audited AS/, "audited AS")}
		SELECT inserted_request.* 
		FROM inserted_request, inserted_segments, audited
		WHERE inserted_segments.request_id = inserted_request.id
		LIMIT 1
	`;
}

/**
 * Build complete APPROVE leave request transaction SQL
 */
export function buildApproveLeaveRequestSql(params: {
	requestId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	note?: string | null;
	consumptionAdjustmentId: string;
	decisionId: string;
	createRequestFingerprint: string;
}): string {
	const { auditId, eventId } = generateTransactionIds();

	const payloadJson = eventPayloadJson({
		organizationId: params.organizationId,
		entityType: "hr_leave_request",
		entityId: params.requestId,
		actorId: params.actorUserId,
		correlationId: params.correlationId,
	});

	const changesJson = fieldChangeJson("status", null, "approved");

	return `
		WITH ${buildLockRequestCte({
			organizationId: params.organizationId,
			requestId: params.requestId,
		}).replace(/^[\s]*WITH\s/, "")},
		entitlement_lock AS (
			SELECT ent.* FROM hr_leave_entitlement ent
			INNER JOIN locked_request req ON req.entitlement_id = ent.id
			CROSS JOIN LATERAL (
				SELECT pg_advisory_xact_lock(hashtext(ent.id::text))
			) AS entitlement_advisory
			WHERE ent.organization_id = '${params.organizationId}'
			FOR UPDATE OF ent
		),
		consumption_adjustment AS (
			INSERT INTO hr_leave_adjustment (
				id, organization_id, entitlement_id, source_request_id, kind, delta,
				reason, source, status, create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			)
			SELECT 
				'${params.consumptionAdjustmentId}', '${params.organizationId}', 
				req.entitlement_id, req.id, 'consumption', 
				('-' || req.requested_quantity), 
				'Approved leave request ' || req.id, 'approval', 'posted',
				req.id || ':consumption', '${params.createRequestFingerprint}',
				1, '${params.actorUserId}', '${params.actorUserId}'
			FROM locked_request req
			WHERE (
				SELECT ent.opening_quantity::numeric + COALESCE(SUM(adj.delta::numeric), 0)
				FROM entitlement_lock ent
				LEFT JOIN hr_leave_adjustment adj
					ON adj.entitlement_id = ent.id
					AND adj.organization_id = '${params.organizationId}'
					AND adj.status = 'posted'
				WHERE ent.id = req.entitlement_id
				GROUP BY ent.opening_quantity
			) >= req.requested_quantity::numeric
			RETURNING *
		),
		updated_request AS (
			UPDATE hr_leave_request 
			SET 
				status = 'approved',
				approved_at = NOW(),
				version = hr_leave_request.version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			FROM consumption_adjustment
			WHERE hr_leave_request.id = '${params.requestId}'
			AND hr_leave_request.organization_id = '${params.organizationId}'
			AND hr_leave_request.version = ${params.expectedVersion}
			RETURNING hr_leave_request.*
		),
		approval_decision AS (
			INSERT INTO hr_leave_approval_decision (
				id, organization_id, request_id, decision, decided_by, decided_at, note
			)
			SELECT 
				'${params.decisionId}', '${params.organizationId}', id, 'approved', 
				'${params.actorUserId}', NOW(), ${params.note ? `'${params.note}'` : "NULL"}
			FROM updated_request
			RETURNING *
		),
		${buildAuditCte({
			auditId,
			module: "human-resources",
			entity: "hr_leave_request",
			action: "UPDATE",
			correlationId: params.correlationId,
			changes: `'${changesJson}'`,
			fromCte: "updated_request",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*audited AS/, "audited AS")},
		${buildOutboxCte({
			eventId,
			eventType: HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
			sourceModule: "human-resources",
			correlationId: params.correlationId,
			payload: `'${payloadJson}'`,
			fromCte: "updated_request",
			selectFields: {
				organizationId: "organization_id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*outboxed AS/, "outboxed AS")}
		SELECT updated_request.*
		FROM updated_request, consumption_adjustment, approval_decision, audited, outboxed
	`;
}

/**
 * Build complete CANCEL approved leave request transaction SQL
 */
export function buildCancelApprovedLeaveRequestSql(params: {
	requestId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	note?: string | null;
	reversalAdjustmentId: string;
	decisionId: string;
	createRequestFingerprint: string;
}): string {
	const { auditId, eventId } = generateTransactionIds();

	const payloadJson = eventPayloadJson({
		organizationId: params.organizationId,
		entityType: "hr_leave_request",
		entityId: params.requestId,
		actorId: params.actorUserId,
		correlationId: params.correlationId,
	});

	const changesJson = fieldChangeJson("status", "approved", "cancelled");

	return `
		WITH ${buildLockRequestCte({
			organizationId: params.organizationId,
			requestId: params.requestId,
		}).replace(/^[\s]*WITH\s/, "")},
		entitlement_lock AS (
			SELECT ent.* FROM hr_leave_entitlement ent
			INNER JOIN locked_request req ON req.entitlement_id = ent.id
			WHERE ent.organization_id = '${params.organizationId}'
			FOR UPDATE
		),
		reversal_adjustment AS (
			INSERT INTO hr_leave_adjustment (
				id, organization_id, entitlement_id, source_request_id, kind, delta,
				reason, source, status, create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			)
			SELECT 
				'${params.reversalAdjustmentId}', '${params.organizationId}', 
				req.entitlement_id, req.id, 'cancellation_reversal', 
				req.requested_quantity, 
				'Cancelled approved leave request ' || req.id, 'cancellation', 'posted',
				req.id || ':reversal', '${params.createRequestFingerprint}',
				1, '${params.actorUserId}', '${params.actorUserId}'
			FROM locked_request req
			WHERE req.status = 'approved'
			RETURNING *
		),
		updated_request AS (
			UPDATE hr_leave_request 
			SET 
				status = 'cancelled',
				version = hr_leave_request.version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			FROM reversal_adjustment
			WHERE hr_leave_request.id = '${params.requestId}'
			AND hr_leave_request.organization_id = '${params.organizationId}'
			AND hr_leave_request.version = ${params.expectedVersion}
			RETURNING hr_leave_request.*
		),
		cancellation_decision AS (
			INSERT INTO hr_leave_approval_decision (
				id, organization_id, request_id, decision, decided_by, decided_at, note
			)
			SELECT 
				'${params.decisionId}', '${params.organizationId}', id, 'cancelled', 
				'${params.actorUserId}', NOW(), ${params.note ? `'${params.note}'` : "NULL"}
			FROM updated_request
			RETURNING *
		),
		${buildAuditCte({
			auditId,
			module: "human-resources",
			entity: "hr_leave_request",
			action: "UPDATE",
			correlationId: params.correlationId,
			changes: `'${changesJson}'`,
			fromCte: "updated_request",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*audited AS/, "audited AS")},
		${buildOutboxCte({
			eventId,
			eventType: HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
			sourceModule: "human-resources",
			correlationId: params.correlationId,
			payload: `'${payloadJson}'`,
			fromCte: "updated_request",
			selectFields: {
				organizationId: "organization_id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*outboxed AS/, "outboxed AS")}
		SELECT updated_request.*
		FROM updated_request, reversal_adjustment, cancellation_decision, audited, outboxed
	`;
}

/**
 * Build complete AMEND leave request transaction SQL
 */
export function buildAmendLeaveRequestSql(params: {
	requestId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	startDate: string;
	endDate: string;
	requestedQuantity: string;
	isBackdated: boolean;
	backdateJustification: string | null;
	segments: Array<{
		id: string;
		segmentDate: string;
		quantity: string;
		dayPortion: string;
	}>;
}): string {
	const { auditId } = generateTransactionIds();

	const changesJson = fieldChangeJson(
		"segments",
		"replaced",
		params.segments.length,
	);

	const segmentInserts = params.segments
		.map(
			(segment) => `
		('${segment.id}', '${params.organizationId}', '${params.requestId}', 
		 '${segment.segmentDate}', '${segment.quantity}', '${segment.dayPortion}')
	`,
		)
		.join(", ");

	return `
		WITH deleted_segments AS (
			DELETE FROM hr_leave_request_segment 
			WHERE request_id = '${params.requestId}'
			AND organization_id = '${params.organizationId}'
			RETURNING request_id
		),
		updated_request AS (
			UPDATE hr_leave_request 
			SET 
				start_date = '${params.startDate}',
				end_date = '${params.endDate}',
				requested_quantity = '${params.requestedQuantity}',
				is_backdated = ${params.isBackdated},
				backdate_justification = ${params.backdateJustification ? `'${params.backdateJustification}'` : "NULL"},
				version = version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			WHERE id = '${params.requestId}'
			AND organization_id = '${params.organizationId}'
			AND version = ${params.expectedVersion}
			RETURNING *
		),
		inserted_segments AS (
			INSERT INTO hr_leave_request_segment (
				id, organization_id, request_id, segment_date, quantity, day_portion
			) VALUES ${segmentInserts}
			RETURNING *
		),
		${buildAuditCte({
			auditId,
			module: "human-resources",
			entity: "hr_leave_request",
			action: "UPDATE",
			correlationId: params.correlationId,
			changes: `'${changesJson}'`,
			fromCte: "updated_request",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*audited AS/, "audited AS")}
		SELECT updated_request.*
		FROM updated_request, inserted_segments, audited
		WHERE inserted_segments.request_id = updated_request.id
		LIMIT 1
	`;
}

/**
 * Build CREATE leave entitlement transaction SQL
 */
export function buildCreateLeaveEntitlementSql(params: {
	entitlementId: string;
	organizationId: string;
	employeeId: string;
	employmentId: string;
	policyId: string;
	periodStart: string;
	periodEnd: string;
	openingQuantity: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	correlationId: string;
}): string {
	const { auditId } = generateTransactionIds();

	const newValueJson = valueSnapshotJson({
		employeeId: params.employeeId,
		policyId: params.policyId,
		periodStart: params.periodStart,
		periodEnd: params.periodEnd,
		openingQuantity: params.openingQuantity,
	});

	return `
		WITH inserted_entitlement AS (
			INSERT INTO hr_leave_entitlement (
				id, organization_id, employee_id, employment_id, policy_id,
				period_start, period_end, opening_quantity, status,
				create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			) VALUES (
				'${params.entitlementId}', '${params.organizationId}', '${params.employeeId}',
				'${params.employmentId}', '${params.policyId}', '${params.periodStart}',
				'${params.periodEnd}', '${params.openingQuantity}', 'active',
				'${params.createIdempotencyKey}', '${params.createRequestFingerprint}',
				1, '${params.createdBy}', '${params.createdBy}'
			)
			RETURNING *
		),
		${buildAuditCte({
			auditId,
			module: "human-resources",
			entity: "hr_leave_entitlement",
			action: "CREATE",
			correlationId: params.correlationId,
			newValue: `'${newValueJson}'`,
			fromCte: "inserted_entitlement",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*audited AS/, "audited AS")}
		SELECT inserted_entitlement.*
		FROM inserted_entitlement, audited
	`;
}

/**
 * Build CREATE leave adjustment transaction SQL
 */
export function buildCreateLeaveAdjustmentSql(params: {
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
	correlationId: string;
	eventType?: OutboxFactInput["type"];
}): string {
	const { auditId, eventId } = generateTransactionIds();

	const newValueJson = valueSnapshotJson({
		entitlementId: params.entitlementId,
		kind: params.kind,
		delta: params.delta,
		reason: params.reason,
		source: params.source,
	});

	const auditCte = buildAuditCte({
		auditId,
		module: "human-resources",
		entity: "hr_leave_adjustment",
		action: "CREATE",
		correlationId: params.correlationId,
		newValue: `'${newValueJson}'`,
		fromCte: "inserted_adjustment",
		selectFields: {
			organizationId: "organization_id",
			entityId: "id",
			actorUserId: "created_by",
		},
	});

	const outboxCte = params.eventType
		? buildOutboxCte({
				eventId,
				eventType: params.eventType,
				sourceModule: "human-resources",
				correlationId: params.correlationId,
				payload: `'${eventPayloadJson({
					organizationId: params.organizationId,
					entityType: "hr_leave_entitlement",
					entityId: params.entitlementId,
					actorId: params.createdBy,
					correlationId: params.correlationId,
				})}'`,
				fromCte: "inserted_adjustment",
				selectFields: {
					organizationId: "organization_id",
					actorUserId: "created_by",
				},
			})
		: "";

	return `
		WITH ${buildLockEntitlementCte({
			organizationId: params.organizationId,
			entitlementId: params.entitlementId,
		}).replace(/^[\s]*WITH\s/, "")},
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
			FROM locked_entitlement
			WHERE locked_entitlement.status = 'active'
			RETURNING *
		),
		${auditCte.replace(/^[\s]*audited AS/, "audited AS")}${
			params.eventType
				? `,
		${outboxCte.replace(/^[\s]*outboxed AS/, "outboxed AS")}`
				: ""
		}
		SELECT inserted_adjustment.*
		FROM inserted_adjustment, audited${params.eventType ? ", outboxed" : ""}
	`;
}

/**
 * Build simple status transition transaction SQL (submit, reject, return, withdraw)
 */
export function buildStatusTransitionSql(params: {
	requestId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	nextStatus: string;
	decision?: string;
	decisionId?: string;
	note?: string | null;
	eventType?: OutboxFactInput["type"];
	approvedAt?: Date;
}): string {
	const { auditId, eventId } = generateTransactionIds();

	const changesJson = fieldChangeJson("status", null, params.nextStatus);

	const decisionCte =
		params.decision && params.decisionId
			? `
		approval_decision AS (
			INSERT INTO hr_leave_approval_decision (
				id, organization_id, request_id, decision, decided_by, decided_at, note
			)
			SELECT 
				'${params.decisionId}', '${params.organizationId}', id, '${params.decision}', 
				'${params.actorUserId}', NOW(), ${params.note ? `'${params.note}'` : "NULL"}
			FROM updated_request
			RETURNING *
		),
	`
			: "";

	const auditCte = buildAuditCte({
		auditId,
		module: "human-resources",
		entity: "hr_leave_request",
		action: "UPDATE",
		correlationId: params.correlationId,
		changes: `'${changesJson}'`,
		fromCte: "updated_request",
		selectFields: {
			organizationId: "organization_id",
			entityId: "id",
			actorUserId: `'${params.actorUserId}'`,
		},
	});

	const outboxCte = params.eventType
		? buildOutboxCte({
				eventId,
				eventType: params.eventType,
				sourceModule: "human-resources",
				correlationId: params.correlationId,
				payload: `'${eventPayloadJson({
					organizationId: params.organizationId,
					entityType: "hr_leave_request",
					entityId: params.requestId,
					actorId: params.actorUserId,
					correlationId: params.correlationId,
				})}'`,
				fromCte: "updated_request",
				selectFields: {
					organizationId: "organization_id",
					actorUserId: `'${params.actorUserId}'`,
				},
			})
		: "";

	const approvedAtClause = params.approvedAt
		? `, approved_at = '${params.approvedAt.toISOString()}'`
		: "";

	return `
		WITH updated_request AS (
			UPDATE hr_leave_request 
			SET 
				status = '${params.nextStatus}',
				version = version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()${approvedAtClause}
			WHERE id = '${params.requestId}'
			AND organization_id = '${params.organizationId}'
			AND version = ${params.expectedVersion}
			RETURNING *
		),
		${decisionCte}
		${auditCte.replace(/^[\s]*audited AS/, "audited AS")}${
			params.eventType
				? `,
		${outboxCte.replace(/^[\s]*outboxed AS/, "outboxed AS")}`
				: ""
		}
		SELECT updated_request.*
		FROM updated_request${params.decision && params.decisionId ? ", approval_decision" : ""}, audited${params.eventType ? ", outboxed" : ""}
	`;
}

/**
 * Build entitlement status transition transaction SQL (carry-forward, expire)
 */
export function buildEntitlementStatusTransitionSql(params: {
	entitlementId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	nextStatus: string;
}): string {
	const { auditId } = generateTransactionIds();

	const changesJson = fieldChangeJson("status", null, params.nextStatus);

	return `
		WITH updated_entitlement AS (
			UPDATE hr_leave_entitlement 
			SET 
				status = '${params.nextStatus}',
				version = version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			WHERE id = '${params.entitlementId}'
			AND organization_id = '${params.organizationId}'
			AND version = ${params.expectedVersion}
			RETURNING *
		),
		${buildAuditCte({
			auditId,
			module: "human-resources",
			entity: "hr_leave_entitlement",
			action: "UPDATE",
			correlationId: params.correlationId,
			changes: `'${changesJson}'`,
			fromCte: "updated_entitlement",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*audited AS/, "audited AS")}
		SELECT updated_entitlement.*
		FROM updated_entitlement, audited
	`;
}

/**
 * Build carry-forward entitlement transaction SQL
 */
export function buildCarryForwardEntitlementSql(params: {
	sourceEntitlementId: string;
	newEntitlementId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	newPeriodStart: string;
	newPeriodEnd: string;
	carriedQuantity: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	carryAdjustmentId: string;
}): string {
	const { auditId: sourceAuditId, eventId } = generateTransactionIds();
	const { auditId: newAuditId } = generateTransactionIds();
	const { auditId: carryAuditId } = generateTransactionIds();

	const sourceChangesJson = fieldChangeJson(
		"status",
		"active",
		"carried_forward",
	);
	const newValueJson = valueSnapshotJson({
		periodStart: params.newPeriodStart,
		periodEnd: params.newPeriodEnd,
		openingQuantity: params.carriedQuantity,
	});
	const carryValueJson = valueSnapshotJson({
		kind: "carry_forward",
		delta: params.carriedQuantity,
		reason: `Carry forward from entitlement ${params.sourceEntitlementId}`,
		source: "system",
	});

	return `
		WITH source_entitlement AS (
			SELECT * FROM hr_leave_entitlement
			WHERE id = '${params.sourceEntitlementId}'
			AND organization_id = '${params.organizationId}'
			FOR UPDATE
		),
		updated_source AS (
			UPDATE hr_leave_entitlement 
			SET 
				status = 'carried_forward',
				version = hr_leave_entitlement.version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			FROM source_entitlement
			WHERE hr_leave_entitlement.id = '${params.sourceEntitlementId}'
			AND hr_leave_entitlement.organization_id = '${params.organizationId}'
			AND hr_leave_entitlement.version = ${params.expectedVersion}
			RETURNING hr_leave_entitlement.*
		),
		new_entitlement AS (
			INSERT INTO hr_leave_entitlement (
				id, organization_id, employee_id, employment_id, policy_id,
				period_start, period_end, opening_quantity, status,
				create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			)
			SELECT 
				'${params.newEntitlementId}', organization_id, employee_id, employment_id, policy_id,
				'${params.newPeriodStart}', '${params.newPeriodEnd}', '${params.carriedQuantity}', 'active',
				'${params.createIdempotencyKey}', '${params.createRequestFingerprint}',
				1, '${params.actorUserId}', '${params.actorUserId}'
			FROM updated_source
			RETURNING *
		),
		carry_adjustment AS (
			INSERT INTO hr_leave_adjustment (
				id, organization_id, entitlement_id, source_request_id, kind, delta,
				reason, source, status, create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			)
			SELECT 
				'${params.carryAdjustmentId}', organization_id, id, NULL, 'carry_forward',
				'${params.carriedQuantity}', 'Carry forward from entitlement ${params.sourceEntitlementId}', 'system', 'posted',
				'${params.createIdempotencyKey}:carry', '${params.createRequestFingerprint}',
				1, '${params.actorUserId}', '${params.actorUserId}'
			FROM new_entitlement
			RETURNING *
		),
		${buildAuditCte({
			auditId: sourceAuditId,
			module: "human-resources",
			entity: "hr_leave_entitlement",
			action: "UPDATE",
			correlationId: params.correlationId,
			changes: `'${sourceChangesJson}'`,
			fromCte: "updated_source",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*audited AS/, "source_audited AS")},
		${buildAuditCte({
			auditId: newAuditId,
			module: "human-resources",
			entity: "hr_leave_entitlement",
			action: "CREATE",
			correlationId: params.correlationId,
			newValue: `'${newValueJson}'`,
			fromCte: "new_entitlement",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*audited AS/, "new_audited AS")},
		${buildAuditCte({
			auditId: carryAuditId,
			module: "human-resources",
			entity: "hr_leave_adjustment",
			action: "CREATE",
			correlationId: params.correlationId,
			newValue: `'${carryValueJson}'`,
			fromCte: "carry_adjustment",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*audited AS/, "carry_audited AS")},
		${buildOutboxCte({
			eventId,
			eventType: HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
			sourceModule: "human-resources",
			correlationId: params.correlationId,
			payload: `'${eventPayloadJson({
				organizationId: params.organizationId,
				entityType: "hr_leave_entitlement",
				entityId: params.newEntitlementId,
				actorId: params.actorUserId,
				correlationId: params.correlationId,
			})}'`,
			fromCte: "carry_adjustment",
			selectFields: {
				organizationId: "organization_id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*outboxed AS/, "outboxed AS")}
		SELECT new_entitlement.*
		FROM new_entitlement, carry_adjustment, source_audited, new_audited, carry_audited, outboxed
	`;
}

/**
 * Build CREATE leave policy transaction SQL
 */
export function buildCreateLeavePolicySql(params: {
	policyId: string;
	organizationId: string;
	code: string;
	name: string;
	leaveType: string;
	unit: string;
	paid: boolean;
	sensitive: boolean;
	allowsNegativeBalance: boolean;
	allowSelfApproval: boolean;
	allowsPartialDay: boolean;
	effectiveFrom: string;
	effectiveTo: string | null;
	createdBy: string;
	correlationId: string;
	eligibilityId: string;
	minTenureDays: number | null;
	allowedEmploymentStatuses: string[];
}): string {
	const { auditId } = generateTransactionIds();

	const newValueJson = valueSnapshotJson({
		code: params.code,
		name: params.name,
		leaveType: params.leaveType,
		unit: params.unit,
		paid: params.paid,
	});

	const statusesJson = JSON.stringify(params.allowedEmploymentStatuses);

	return `
		WITH inserted_policy AS (
			INSERT INTO hr_leave_policy (
				id, organization_id, code, name, leave_type, unit, paid, sensitive,
				allows_negative_balance, allow_self_approval, allows_partial_day,
				effective_from, effective_to, status, version, created_by, updated_by
			) VALUES (
				'${params.policyId}', '${params.organizationId}', '${params.code}', '${params.name}',
				'${params.leaveType}', '${params.unit}', ${params.paid}, ${params.sensitive},
				${params.allowsNegativeBalance}, ${params.allowSelfApproval}, ${params.allowsPartialDay},
				'${params.effectiveFrom}', ${params.effectiveTo ? `'${params.effectiveTo}'` : "NULL"},
				'draft', 1, '${params.createdBy}', '${params.createdBy}'
			)
			RETURNING *
		),
		inserted_eligibility AS (
			INSERT INTO hr_leave_policy_eligibility (
				id, organization_id, policy_id, min_tenure_days, allowed_employment_statuses,
				created_by, updated_by
			)
			SELECT 
				'${params.eligibilityId}', organization_id, id, ${params.minTenureDays ?? "NULL"},
				'${statusesJson}', '${params.createdBy}', '${params.createdBy}'
			FROM inserted_policy
			RETURNING *
		),
		${buildAuditCte({
			auditId,
			module: "human-resources",
			entity: "hr_leave_policy",
			action: "CREATE",
			correlationId: params.correlationId,
			newValue: `'${newValueJson}'`,
			fromCte: "inserted_policy",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*audited AS/, "audited AS")}
		SELECT inserted_policy.*
		FROM inserted_policy, inserted_eligibility, audited
	`;
}

/**
 * Build policy status transition transaction SQL
 */
export function buildPolicyStatusTransitionSql(params: {
	policyId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	nextStatus: string;
}): string {
	const { auditId } = generateTransactionIds();

	const changesJson = fieldChangeJson("status", null, params.nextStatus);

	return `
		WITH updated_policy AS (
			UPDATE hr_leave_policy 
			SET 
				status = '${params.nextStatus}',
				version = version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			WHERE id = '${params.policyId}'
			AND organization_id = '${params.organizationId}'
			AND version = ${params.expectedVersion}
			RETURNING *
		),
		${buildAuditCte({
			auditId,
			module: "human-resources",
			entity: "hr_leave_policy",
			action: "UPDATE",
			correlationId: params.correlationId,
			changes: `'${changesJson}'`,
			fromCte: "updated_policy",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*audited AS/, "audited AS")}
		SELECT updated_policy.*
		FROM updated_policy, audited
	`;
}
