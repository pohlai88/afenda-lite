import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	eq,
	mdChangeRequest,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "./contracts/reasons";
import type { MutationPorts } from "./ports";
import type {
	ChangeRequestCreateRecord,
	ChangeRequestListFilter,
	ChangeRequestReviewRecord,
} from "./store";
import type {
	ChangeRequest,
	ChangeRequestCommandKind,
	ChangeRequestPayload,
	ChangeRequestStatus,
} from "./types";

type ChangeRequestSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	command_kind: string;
	status: string;
	version: number;
	payload: ChangeRequestPayload | string;
	subject_entity_type: string;
	subject_entity_id: string;
	submitted_by: string;
	submitted_at: string | Date;
	reviewed_by: string | null;
	reviewed_at: string | Date | null;
	review_note: string | null;
	applied_by: string | null;
	applied_at: string | Date | null;
	created_at: string | Date;
	updated_at: string | Date;
};

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

function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	return JSON.stringify([{ field, oldValue, newValue }]);
}

function valueSnapshotJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
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

function isUniqueViolation(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /unique|duplicate key/i.test(message);
}

export async function drizzleGetChangeRequestById(
	organizationId: string,
	id: string,
): Promise<Result<ChangeRequest | null>> {
	try {
		const [row] = await db
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
			return ok(null);
		}
		return ok(
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
		return failFromUnknown(error, "Failed to load change request");
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
		const rows = await db
			.select()
			.from(mdChangeRequest)
			.where(and(...predicates))
			.orderBy(asc(mdChangeRequest.createdAt), asc(mdChangeRequest.id))
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);
		return ok(
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
		return failFromUnknown(error, "Failed to list change requests");
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
	const changesJson = fieldChangeJson("status", null, "submitted");
	const newValueJson = valueSnapshotJson({
		commandKind: record.commandKind,
		status: "submitted",
	});
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
		const [rows] = await runNeonHttpTransaction<[ChangeRequestSqlRow[]]>(
			(sql) => [
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
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, submitted_by, ${meta.correlationId},
							'master_data', 'change_request', id, 'CREATE', ${changesJson}::jsonb,
							${newValueJson}::jsonb
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
			],
		);
		const row = rows[0];
		if (row === undefined) {
			return fail("INTERNAL_ERROR", "Change request create returned no row");
		}
		return ok(mapChangeRequestSqlRow(row));
	} catch (error) {
		if (isUniqueViolation(error)) {
			return fail("CONFLICT", "Change request code already exists", {
				reason: "MASTER_CODE_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return failFromUnknown(error, "Failed to create change request");
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
		return fail("NOT_FOUND", "Change request not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	if (existing.data.version !== record.expectedVersion) {
		return fail("CONFLICT", "Change request version conflict", {
			reason: "MASTER_VERSION_CONFLICT",
		} satisfies MasterFailureDetails);
	}

	const nextVersion = existing.data.version + 1;
	const eventType = `master_data.change_request.${meta.eventSuffix}.v1`;
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson(
		"status",
		existing.data.status,
		record.toStatus,
	);
	const oldValueJson = valueSnapshotJson({
		status: existing.data.status,
		version: existing.data.version,
	});
	const newValueJson = valueSnapshotJson({
		status: record.toStatus,
		version: nextVersion,
	});
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
		const [rows] = await runNeonHttpTransaction<[ChangeRequestSqlRow[]]>(
			(sql) => [
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
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'master_data', 'change_request', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
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
			],
		);
		const row = rows[0];
		if (row === undefined) {
			return fail("CONFLICT", "Change request version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(mapChangeRequestSqlRow(row));
	} catch (error) {
		return failFromUnknown(error, "Failed to transition change request");
	}
}
