/**
 * HR Leave SQL Builders
 *
 * Specialized SQL generation utilities for complex leave workflow transactions.
 * Provides high-level builders for complete leave operations that require
 * multiple related database changes in a single atomic transaction.
 */

import type { OutboxFactInput } from "../../ports";
import { ACTIVE_LEAVE_OVERLAP_STATUSES } from "../../shared/leave-guards";
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

function activeLeaveOverlapStatusSqlList(includeDraft: boolean): string {
	return ACTIVE_LEAVE_OVERLAP_STATUSES.filter(
		(status) => includeDraft || status !== "draft",
	)
		.map((status) => `'${status}'`)
		.join(", ");
}

/**
 * Acquire the employee-scoped booking lock as its own transaction statement.
 * Under READ COMMITTED, the following mutation statement then receives a fresh
 * snapshot after any competing booking transaction commits.
 */
export function buildLeaveEmployeeBookingLockSql(params: {
	organizationId: string;
	requestId: string;
}): string {
	return `
		SELECT pg_advisory_xact_lock(
			hashtext(organization_id || ':' || employee_id)
		)
		FROM hr_leave_request
		WHERE id = '${params.requestId}'
			AND organization_id = '${params.organizationId}'
	`;
}

/**
 * Employee-scoped booking lock and segment overlap detection for submit/approve.
 * Requires `locked_request` CTE to exist earlier in the same WITH clause.
 */
export function buildLeaveOverlapGuardCtes(params: {
	organizationId: string;
	requestId: string;
	includeDraft: boolean;
}): string {
	const statuses = activeLeaveOverlapStatusSqlList(params.includeDraft);
	return `
		employee_booking_lock AS (
			SELECT pg_advisory_xact_lock(
				hashtext(locked_request.organization_id || ':' || locked_request.employee_id)
			)
			FROM locked_request
		),
		overlap AS (
			SELECT EXISTS (
				SELECT 1
				FROM hr_leave_request_segment candidate
				INNER JOIN locked_request req
					ON req.id = candidate.request_id
					AND req.organization_id = candidate.organization_id
				INNER JOIN hr_leave_request peer_req
					ON peer_req.organization_id = candidate.organization_id
					AND peer_req.employee_id = req.employee_id
					AND peer_req.id <> req.id
					AND peer_req.status IN (${statuses})
				INNER JOIN hr_leave_request_segment peer_seg
					ON peer_seg.organization_id = peer_req.organization_id
					AND peer_seg.request_id = peer_req.id
				WHERE candidate.request_id = '${params.requestId}'
					AND candidate.organization_id = '${params.organizationId}'
					AND candidate.segment_date = peer_seg.segment_date
					AND (
						candidate.day_portion = 'full'
						OR peer_seg.day_portion = 'full'
						OR candidate.day_portion = peer_seg.day_portion
					)
			) AS found
			FROM employee_booking_lock
		),
	`;
}

/**
 * Build submit transaction SQL with employee booking lock and overlap guard.
 */
export function buildSubmitLeaveRequestSql(params: {
	requestId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	eventType?: OutboxFactInput["type"];
}): string {
	const { auditId, eventId } = generateTransactionIds();
	const changesJson = fieldChangeJson("status", null, "submitted");

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

	return `
		WITH ${buildLockRequestCte({
			organizationId: params.organizationId,
			requestId: params.requestId,
		}).replace(/^[\s]*WITH\s/, "")},
		${buildLeaveOverlapGuardCtes({
			organizationId: params.organizationId,
			requestId: params.requestId,
			includeDraft: false,
		})}
		updated_request AS (
			UPDATE hr_leave_request
			SET
				status = 'submitted',
				version = hr_leave_request.version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			FROM locked_request, overlap
			WHERE hr_leave_request.id = locked_request.id
			AND hr_leave_request.organization_id = '${params.organizationId}'
			AND hr_leave_request.version = ${params.expectedVersion}
			AND NOT (SELECT found FROM overlap)
			RETURNING hr_leave_request.*
		),
		${auditCte.replace(/^[\s]*audited AS/, "audited AS")}${
			params.eventType
				? `,
		${outboxCte.replace(/^[\s]*outboxed AS/, "outboxed AS")}`
				: ""
		}
		SELECT
			(SELECT found FROM overlap) AS overlap_detected,
			updated_request.*
		FROM overlap
		LEFT JOIN updated_request ON NOT (SELECT found FROM overlap)
		LEFT JOIN audited ON true
		${params.eventType ? "LEFT JOIN outboxed ON true" : ""}
	`;
}

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
	eventType: OutboxFactInput["type"];
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
		${buildLeaveOverlapGuardCtes({
			organizationId: params.organizationId,
			requestId: params.requestId,
			includeDraft: true,
		})}
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
			FROM locked_request req, overlap
			WHERE NOT (SELECT found FROM overlap)
			AND (
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
			eventType: params.eventType,
			sourceModule: "human-resources",
			correlationId: params.correlationId,
			payload: `'${payloadJson}'`,
			fromCte: "updated_request",
			selectFields: {
				organizationId: "organization_id",
				actorUserId: `'${params.actorUserId}'`,
			},
		}).replace(/^[\s]*outboxed AS/, "outboxed AS")}
		SELECT
			(SELECT found FROM overlap) AS overlap_detected,
			updated_request.*
		FROM overlap
		LEFT JOIN updated_request ON NOT (SELECT found FROM overlap)
		LEFT JOIN consumption_adjustment ON NOT (SELECT found FROM overlap)
		LEFT JOIN approval_decision ON NOT (SELECT found FROM overlap)
		LEFT JOIN audited ON true
		LEFT JOIN outboxed ON true
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
	eventType: OutboxFactInput["type"];
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
			eventType: params.eventType,
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
 * Build simple status transition transaction SQL (reject, return, withdraw).
 * Submit and approve use dedicated builders with overlap guards.
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
	sourceCarryOutDelta: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	sourceCarryOutAdjustmentId: string;
	eventType: OutboxFactInput["type"];
}): string {
	const { auditId: sourceAuditId, eventId } = generateTransactionIds();
	const { auditId: newAuditId } = generateTransactionIds();
	const { auditId: carryOutAuditId } = generateTransactionIds();

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
	const carryOutValueJson = valueSnapshotJson({
		kind: "carry_forward",
		delta: params.sourceCarryOutDelta,
		reason: `Carry forward to new period ${params.newPeriodStart}–${params.newPeriodEnd}`,
		source: "system",
	});

	return `
		WITH source_entitlement AS (
			SELECT * FROM hr_leave_entitlement
			WHERE id = '${params.sourceEntitlementId}'
			AND organization_id = '${params.organizationId}'
			AND status = 'active'
			AND version = ${params.expectedVersion}
			FOR UPDATE
		),
		source_carry_out AS (
			INSERT INTO hr_leave_adjustment (
				id, organization_id, entitlement_id, source_request_id, kind, delta,
				reason, source, status, create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			)
			SELECT
				'${params.sourceCarryOutAdjustmentId}', organization_id, id, NULL, 'carry_forward',
				'${params.sourceCarryOutDelta}', 'Carry forward to new period ${params.newPeriodStart}–${params.newPeriodEnd}', 'system', 'posted',
				'${params.createIdempotencyKey}:carry-out', '${params.createRequestFingerprint}',
				1, '${params.actorUserId}', '${params.actorUserId}'
			FROM source_entitlement
			RETURNING *
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
			auditId: carryOutAuditId,
			module: "human-resources",
			entity: "hr_leave_adjustment",
			action: "CREATE",
			correlationId: params.correlationId,
			newValue: `'${carryOutValueJson}'`,
			fromCte: "source_carry_out",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*audited AS/, "carry_out_audited AS")},
		${buildOutboxCte({
			eventId,
			eventType: params.eventType,
			sourceModule: "human-resources",
			correlationId: params.correlationId,
			payload: `'${eventPayloadJson({
				organizationId: params.organizationId,
				entityType: "hr_leave_entitlement",
				entityId: params.sourceEntitlementId,
				actorId: params.actorUserId,
				correlationId: params.correlationId,
			})}'`,
			fromCte: "new_entitlement",
			selectFields: {
				organizationId: "organization_id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*outboxed AS/, "outboxed AS")}
		SELECT new_entitlement.*
		FROM new_entitlement, source_carry_out, source_audited, new_audited, carry_out_audited, outboxed
	`;
}

/**
 * Build expire entitlement transaction SQL (wipe balance while active, then expire)
 */
export function buildExpireEntitlementSql(params: {
	entitlementId: string;
	organizationId: string;
	expectedVersion: number;
	actorUserId: string;
	correlationId: string;
	expiryAdjustmentId: string;
	createRequestFingerprint: string;
	eventType?: OutboxFactInput["type"];
}): string {
	const { auditId: entitlementAuditId, eventId } = generateTransactionIds();
	const { auditId: expiryAuditId } = generateTransactionIds();

	const changesJson = fieldChangeJson("status", "active", "expired");
	const expiryValueJson = valueSnapshotJson({
		kind: "expiry",
		reason: "Entitlement expired",
		source: "system",
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
					actorId: params.actorUserId,
					correlationId: params.correlationId,
				})}'`,
				fromCte: "expiry_adjustment",
				selectFields: {
					organizationId: "organization_id",
					actorUserId: "created_by",
				},
			})
		: "";

	return `
		WITH locked_entitlement AS (
			SELECT * FROM hr_leave_entitlement
			WHERE id = '${params.entitlementId}'
			AND organization_id = '${params.organizationId}'
			AND status = 'active'
			AND version = ${params.expectedVersion}
			FOR UPDATE
		),
		balance_snapshot AS (
			SELECT
				le.*,
				(
					CAST(le.opening_quantity AS numeric) + COALESCE((
						SELECT SUM(CAST(a.delta AS numeric))
						FROM hr_leave_adjustment a
						WHERE a.entitlement_id = le.id
							AND a.organization_id = le.organization_id
							AND a.status = 'posted'
					), 0)
				) AS current_balance
			FROM locked_entitlement le
		),
		expiry_adjustment AS (
			INSERT INTO hr_leave_adjustment (
				id, organization_id, entitlement_id, source_request_id, kind, delta,
				reason, source, status, create_idempotency_key, create_request_fingerprint,
				version, created_by, updated_by
			)
			SELECT
				'${params.expiryAdjustmentId}',
				organization_id,
				id,
				NULL,
				'expiry',
				(0 - current_balance)::text,
				'Entitlement expired',
				'system',
				'posted',
				'${params.entitlementId}:expiry',
				'${params.createRequestFingerprint}',
				1,
				'${params.actorUserId}',
				'${params.actorUserId}'
			FROM balance_snapshot
			WHERE current_balance <> 0
			RETURNING *
		),
		updated_entitlement AS (
			UPDATE hr_leave_entitlement
			SET
				status = 'expired',
				version = hr_leave_entitlement.version + 1,
				updated_by = '${params.actorUserId}',
				updated_at = NOW()
			FROM balance_snapshot
			WHERE hr_leave_entitlement.id = balance_snapshot.id
			AND hr_leave_entitlement.organization_id = balance_snapshot.organization_id
			RETURNING hr_leave_entitlement.*
		),
		${buildAuditCte({
			auditId: entitlementAuditId,
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
		}).replace(/^[\s]*audited AS/, "entitlement_audited AS")},
		${buildAuditCte({
			auditId: expiryAuditId,
			module: "human-resources",
			entity: "hr_leave_adjustment",
			action: "CREATE",
			correlationId: params.correlationId,
			newValue: `'${expiryValueJson}'`,
			fromCte: "expiry_adjustment",
			selectFields: {
				organizationId: "organization_id",
				entityId: "id",
				actorUserId: "created_by",
			},
		}).replace(/^[\s]*audited AS/, "expiry_audited AS")}${
			params.eventType
				? `,
		${outboxCte.replace(/^[\s]*outboxed AS/, "outboxed AS")}`
				: ""
		}
		SELECT updated_entitlement.*
		FROM updated_entitlement
		CROSS JOIN entitlement_audited
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
	accrualBasis: string;
	accrualFrequency: string | null;
	accrualQuantityPerPeriod: string | null;
	carryForwardEnabled: boolean;
	carryForwardMaxQuantity: string | null;
	entitlementExpiryRule: string;
	entitlementExpiryDays: number | null;
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
				accrual_basis, accrual_frequency, accrual_quantity_per_period,
				carry_forward_enabled, carry_forward_max_quantity,
				entitlement_expiry_rule, entitlement_expiry_days,
				effective_from, effective_to, status, version, created_by, updated_by
			) VALUES (
				'${params.policyId}', '${params.organizationId}', '${params.code}', '${params.name}',
				'${params.leaveType}', '${params.unit}', ${params.paid}, ${params.sensitive},
				${params.allowsNegativeBalance}, ${params.allowSelfApproval}, ${params.allowsPartialDay},
				'${params.accrualBasis}', ${params.accrualFrequency ? `'${params.accrualFrequency}'` : "NULL"},
				${params.accrualQuantityPerPeriod ? `'${params.accrualQuantityPerPeriod}'` : "NULL"},
				${params.carryForwardEnabled},
				${params.carryForwardMaxQuantity ? `'${params.carryForwardMaxQuantity}'` : "NULL"},
				'${params.entitlementExpiryRule}',
				${params.entitlementExpiryDays ?? "NULL"},
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
