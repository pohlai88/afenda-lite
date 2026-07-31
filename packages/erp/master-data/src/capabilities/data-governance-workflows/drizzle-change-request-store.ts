import { randomUUID } from "node:crypto";

import { audit as afendaAudit } from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	eq,
	mdChangeRequest,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";
import type { MutationPorts } from "../../ports";
import type {
	ChangeRequest,
	ChangeRequestCommandKind,
	ChangeRequestPayload,
	ChangeRequestStatus,
} from "../../types";
import type {
	ChangeRequestCreateRecord,
	ChangeRequestListFilter,
	ChangeRequestReviewRecord,
} from "../core-organization-masters/store";

const MASTER_DATA_CHANGE_REQUEST_AUDIT_SOURCE =
	"master-data.change-request-store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

interface ChangeRequestSqlRow {
	applied_at: string | Date | null;
	applied_by: string | null;
	code: string;
	command_kind: string;
	created_at: string | Date;
	id: string;
	normalized_code: string;
	organization_id: string;
	payload: ChangeRequestPayload | string;
	review_note: string | null;
	reviewed_at: string | Date | null;
	reviewed_by: string | null;
	status: string;
	subject_entity_id: string;
	subject_entity_type: string;
	submitted_at: string | Date;
	submitted_by: string;
	updated_at: string | Date;
	version: number;
}

function toDate(value: string | Date | null | undefined): Date | null {
	if (value === null || value === undefined) {
		return null;
	}
	return value instanceof Date ? value : new Date(value);
}

function parsePayload(
	raw: ChangeRequestPayload | string,
): ChangeRequestPayload {
	if (typeof raw === "string") {
		return JSON.parse(raw) as ChangeRequestPayload;
	}
	return raw;
}

export function mapChangeRequestSqlRow(
	row: ChangeRequestSqlRow,
): ChangeRequest {
	return {
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		commandKind: row.command_kind as ChangeRequestCommandKind,
		status: row.status as ChangeRequestStatus,
		version: row.version,
		payload: parsePayload(row.payload),
		subjectEntityType: "party",
		subjectEntityId: row.subject_entity_id,
		submittedBy: row.submitted_by,
		submittedAt: toDate(row.submitted_at) ?? new Date(),
		reviewedBy: row.reviewed_by,
		reviewedAt: toDate(row.reviewed_at),
		reviewNote: row.review_note,
		appliedBy: row.applied_by,
		appliedAt: toDate(row.applied_at),
		createdAt: toDate(row.created_at) ?? new Date(),
		updatedAt: toDate(row.updated_at) ?? new Date(),
	};
}

function eventPayloadJson(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	code: string;
	version: number;
	actorId: string;
	correlationId: string;
}): string {
	return JSON.stringify(input);
}

export async function drizzleGetChangeRequestById(
	organizationId: string,
	id: string,
): Promise<Result<ChangeRequest | null>> {
	try {
		const [row] = await afendaDatabase.client
			.select()
			.from(mdChangeRequest)
			.where(
				and(
					eq(mdChangeRequest.id, id),
					eq(mdChangeRequest.organizationId, organizationId),
				),
			)
			.limit(1);
		if (row === undefined) {
			return errorResult.ok(null);
		}
		return errorResult.ok(
			mapChangeRequestSqlRow({
				id: row.id,
				organization_id: row.organizationId,
				code: row.code,
				normalized_code: row.normalizedCode,
				command_kind: row.commandKind,
				status: row.status,
				version: row.version,
				payload: row.payload as ChangeRequestPayload,
				subject_entity_type: row.subjectEntityType,
				subject_entity_id: row.subjectEntityId,
				submitted_by: row.submittedBy,
				submitted_at: row.submittedAt,
				reviewed_by: row.reviewedBy,
				reviewed_at: row.reviewedAt,
				review_note: row.reviewNote,
				applied_by: row.appliedBy,
				applied_at: row.appliedAt,
				created_at: row.createdAt,
				updated_at: row.updatedAt,
			}),
		);
	} catch (error) {
		return failFromPersistence(error, "Failed to load change request");
	}
}

export async function drizzleListChangeRequests(
	filter: ChangeRequestListFilter,
): Promise<Result<ChangeRequest[]>> {
	try {
		const predicates = [
			eq(mdChangeRequest.organizationId, filter.organizationId),
		];
		if (filter.status !== undefined) {
			predicates.push(eq(mdChangeRequest.status, filter.status));
		}
		if (filter.commandKind !== undefined) {
			predicates.push(eq(mdChangeRequest.commandKind, filter.commandKind));
		}
		const rows = await afendaDatabase.client
			.select()
			.from(mdChangeRequest)
			.where(and(...predicates))
			.orderBy(asc(mdChangeRequest.createdAt), asc(mdChangeRequest.id))
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);
		return errorResult.ok(
			rows.map((row) =>
				mapChangeRequestSqlRow({
					id: row.id,
					organization_id: row.organizationId,
					code: row.code,
					normalized_code: row.normalizedCode,
					command_kind: row.commandKind,
					status: row.status,
					version: row.version,
					payload: row.payload as ChangeRequestPayload,
					subject_entity_type: row.subjectEntityType,
					subject_entity_id: row.subjectEntityId,
					submitted_by: row.submittedBy,
					submitted_at: row.submittedAt,
					reviewed_by: row.reviewedBy,
					reviewed_at: row.reviewedAt,
					review_note: row.reviewNote,
					applied_by: row.appliedBy,
					applied_at: row.appliedAt,
					created_at: row.createdAt,
					updated_at: row.updatedAt,
				}),
			),
		);
	} catch (error) {
		return failFromPersistence(error, "Failed to list change requests");
	}
}

export async function drizzleCreateChangeRequest(
	record: ChangeRequestCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ChangeRequest>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const payloadJson = JSON.stringify(record.payload);
	const preparedAudit = afendaAudit.transaction.prepare({
		organizationId: record.organizationId,
		actorUserId: record.submittedBy,
		correlationId: meta.correlationId,
		module: "master_data",
		entity: "change_request",
		entityId: id,
		action: "CREATE",
		changes: [{ field: "status", oldValue: null, newValue: "submitted" }],
		newValue: {
			commandKind: record.commandKind,
			status: "submitted",
		},
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: MASTER_DATA_CHANGE_REQUEST_AUDIT_SOURCE,
			causationId: null,
		},
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;
	const eventPayload = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "change_request",
		entityId: id,
		code: record.code,
		version: 1,
		actorId: record.submittedBy,
		correlationId: meta.correlationId,
	});

	try {
		const [rows] = await afendaDatabase.transaction((sql) => [
			sql`
					WITH mutated AS (
						INSERT INTO md_change_request (
							id, organization_id, code, normalized_code, command_kind, status,
							version, payload, subject_entity_type, subject_entity_id,
							submitted_by, submitted_at
						) VALUES (
							${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.commandKind}, 'submitted', 1, ${payloadJson}::jsonb,
							${record.subjectEntityType}, ${record.subjectEntityId},
							${record.submittedBy}, now()
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.change_request.submitted.v1',
							'master_data', ${meta.correlationId}, submitted_by, ${eventPayload}::jsonb,
							'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
		]);
		const [row] = rows;
		if (row === undefined) {
			return errorResult.fail("INTERNAL_ERROR");
		}
		return errorResult.ok(mapChangeRequestSqlRow(row));
	} catch (error) {
		return failFromPersistence(error, "Failed to create change request");
	}
}

export async function drizzleTransitionChangeRequest(
	record: ChangeRequestReviewRecord,
	_ports: MutationPorts,
	meta: { correlationId: string; eventSuffix: "approved" | "rejected" },
): Promise<Result<ChangeRequest>> {
	const existing = await drizzleGetChangeRequestById(
		record.organizationId,
		record.id,
	);
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Change request not found",
		});
	}
	if (existing.data.version !== record.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Change request version conflict",
		});
	}

	const nextVersion = existing.data.version + 1;
	const eventType = `master_data.change_request.${meta.eventSuffix}.v1`;
	const auditId = randomUUID();
	const eventId = randomUUID();
	const preparedAudit = afendaAudit.transaction.prepare({
		organizationId: record.organizationId,
		actorUserId: record.actorUserId,
		correlationId: meta.correlationId,
		module: "master_data",
		entity: "change_request",
		entityId: record.id,
		action: "UPDATE",
		changes: [
			{
				field: "status",
				oldValue: existing.data.status,
				newValue: record.toStatus,
			},
		],
		oldValue: {
			status: existing.data.status,
			version: existing.data.version,
		},
		newValue: {
			status: record.toStatus,
			version: nextVersion,
		},
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: MASTER_DATA_CHANGE_REQUEST_AUDIT_SOURCE,
			causationId: null,
		},
	});
	if (!preparedAudit.ok) {
		return preparedAudit;
	}
	const audit = preparedAudit.data;
	const eventPayload = eventPayloadJson({
		organizationId: existing.data.organizationId,
		entityType: "change_request",
		entityId: existing.data.id,
		code: existing.data.code,
		version: nextVersion,
		actorId: record.actorUserId,
		correlationId: meta.correlationId,
	});

	try {
		const [rows] = await afendaDatabase.transaction((sql) => [
			sql`
					WITH mutated AS (
						UPDATE md_change_request
						SET
							status = ${record.toStatus},
							version = version + 1,
							reviewed_by = ${record.actorUserId},
							reviewed_at = now(),
							review_note = ${record.reviewNote},
							updated_at = now()
						WHERE id = ${record.id}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status = 'submitted'
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${audit.organizationId}, ${audit.actorUserId},
							${audit.correlationId}, ${audit.module}, ${audit.entity},
							${audit.entityId}, ${audit.action}, ${audit.changesJson}::jsonb,
							${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb,
							${audit.metadataJson}::jsonb, ${audit.ipAddress}, ${audit.userAgent}
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${eventType}, 'master_data',
							${meta.correlationId}, ${record.actorUserId}, ${eventPayload}::jsonb,
							'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
		]);
		const [row] = rows;
		if (row === undefined) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Change request version conflict",
			});
		}
		return errorResult.ok(mapChangeRequestSqlRow(row));
	} catch (error) {
		return failFromPersistence(error, "Failed to transition change request");
	}
}
