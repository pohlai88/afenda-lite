import { database as afendaDatabase } from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	Establishment,
	EstablishmentStatus,
	EstablishmentStatusHistoryEntry,
	EstablishmentType,
} from "../../../kernel/contracts/domain";
import { validateEstablishmentStatusTransition } from "./establishments.rules";
import type { EstablishmentsStore } from "./establishments.store";

function failFromPersistence(error: unknown) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

interface EstablishmentSqlRow {
	created_at: Date;
	created_by: string;
	current_status: string;
	display_name: string;
	establishment_type: string;
	id: string;
	jurisdiction_code: string;
	legal_company_id: string;
	normalized_registration_identifier: string;
	organization_id: string;
	registered_from: string;
	registration_identifier: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface EstablishmentStatusHistorySqlRow {
	created_at: Date;
	effective_from: string;
	effective_to: string | null;
	id: string;
	legal_company_id: string;
	legal_establishment_id: string;
	organization_id: string;
	reason: string | null;
	recorded_at: Date;
	recorded_by: string;
	source_document_id: string;
	status: string;
	version: number;
}

function establishmentType(value: string): EstablishmentType {
	switch (value) {
		case "branch":
		case "representative_office":
		case "foreign_registration":
		case "other":
			return value;
		default:
			throw new Error(
				`Invalid ca_legal_establishment.establishment_type: ${value}`,
			);
	}
}

function establishmentStatus(value: string): EstablishmentStatus {
	switch (value) {
		case "registered":
		case "active":
		case "suspended":
		case "closed":
			return value;
		default:
			throw new Error(`Invalid establishment status: ${value}`);
	}
}

function mapEstablishmentSql(row: EstablishmentSqlRow): Establishment {
	return {
		id: row.id,
		organizationId: row.organization_id,
		legalCompanyId: row.legal_company_id,
		establishmentType: establishmentType(row.establishment_type),
		jurisdictionCode: row.jurisdiction_code,
		registrationIdentifier: row.registration_identifier,
		normalizedRegistrationIdentifier: row.normalized_registration_identifier,
		displayName: row.display_name,
		status: establishmentStatus(row.current_status),
		registeredFrom: row.registered_from,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapHistorySql(
	row: EstablishmentStatusHistorySqlRow,
): EstablishmentStatusHistoryEntry {
	return {
		id: row.id,
		organizationId: row.organization_id,
		legalCompanyId: row.legal_company_id,
		establishmentId: row.legal_establishment_id,
		status: establishmentStatus(row.status),
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		reason: row.reason,
		recordedAt: row.recorded_at,
		recordedBy: row.recorded_by,
		sourceDocumentId: row.source_document_id,
		version: row.version,
		createdAt: row.created_at,
	};
}

export const drizzleEstablishmentsMethods: EstablishmentsStore = {
	async registerEstablishment(
		record: Parameters<EstablishmentsStore["registerEstablishment"]>[0],
	): Promise<Result<Establishment>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH inserted_establishment AS (
						INSERT INTO ca_legal_establishment (
							organization_id, legal_company_id, establishment_type,
							jurisdiction_code, registration_identifier,
							normalized_registration_identifier, display_name,
							current_status, registered_from, created_by, updated_by, version
						) VALUES (
							${record.organizationId}, ${record.legalCompanyId}, ${record.establishmentType},
							${record.jurisdictionCode}, ${record.registrationIdentifier},
							${record.normalizedRegistrationIdentifier}, ${record.displayName},
							'registered', ${record.registeredFrom}, ${record.actorUserId}, ${record.actorUserId}, 1
						)
						ON CONFLICT (organization_id, jurisdiction_code, establishment_type, normalized_registration_identifier)
						DO NOTHING
						RETURNING *
					), inserted_history AS (
						INSERT INTO ca_establishment_status_history (
							organization_id, legal_company_id, legal_establishment_id, status,
							effective_from, effective_to, recorded_at, recorded_by, reason,
							source_document_id, version
						)
						SELECT
							ie.organization_id, ie.legal_company_id, ie.id, 'registered',
							ie.registered_from, NULL, now(), ${record.actorUserId}, NULL,
							${record.sourceDocumentId}, 1
						FROM inserted_establishment ie
						RETURNING legal_establishment_id
					), inserted_audit AS (
						INSERT INTO platform_audit_log (
							organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							ie.organization_id, ${record.actorUserId}, ${record.correlationId},
							'corporate-administration', 'establishment', ie.id, 'CREATE', '[]'::jsonb
						FROM inserted_establishment ie
						RETURNING id
					), inserted_outbox AS (
						INSERT INTO platform_domain_event (
							organization_id, type, source_module, correlation_id,
							actor_user_id, payload
						)
						SELECT
							ie.organization_id,
							'corporate_administration.legal_establishment.registered.v1',
							'corporate-administration', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', ie.organization_id,
								'legalCompanyId', ie.legal_company_id,
								'occurredAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
								'actorUserId', ${record.actorUserId},
								'correlationId', ${record.correlationId},
								'legalEstablishmentId', ie.id,
								'establishmentType', ie.establishment_type,
								'jurisdictionCode', ie.jurisdiction_code,
								'registeredFrom', to_char(ie.registered_from, 'YYYY-MM-DD')
							)
						FROM inserted_establishment ie
						RETURNING id
					)
					SELECT * FROM inserted_establishment
				`,
			]);
			const [row] = rows as EstablishmentSqlRow[];
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Establishment registration identifier already exists",
				});
			}
			return errorResult.ok(mapEstablishmentSql(row));
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async updateEstablishment(
		record: Parameters<EstablishmentsStore["updateEstablishment"]>[0],
	): Promise<Result<Establishment>> {
		try {
			const [existingRows] = await afendaDatabase.transaction(
				(sql) => [
					sql`SELECT id FROM ca_legal_establishment WHERE id = ${record.id} AND organization_id = ${record.organizationId}`,
				],
				{ readOnly: true },
			);
			if ((existingRows as unknown[])[0] === undefined) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Establishment not found",
				});
			}
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH updated_establishment AS (
						UPDATE ca_legal_establishment
						SET display_name = ${record.displayName}, version = version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.id} AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
						RETURNING *
					), inserted_audit AS (
						INSERT INTO platform_audit_log (
							organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							ue.organization_id, ${record.actorUserId}, ${record.correlationId},
							'corporate-administration', 'establishment', ue.id, 'UPDATE', '[]'::jsonb
						FROM updated_establishment ue
						RETURNING id
					), inserted_outbox AS (
						INSERT INTO platform_domain_event (
							organization_id, type, source_module, correlation_id,
							actor_user_id, payload
						)
						SELECT
							ue.organization_id,
							'corporate_administration.legal_establishment.updated.v1',
							'corporate-administration', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', ue.organization_id,
								'legalCompanyId', ue.legal_company_id,
								'occurredAt', to_char(ue.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
								'actorUserId', ${record.actorUserId},
								'correlationId', ${record.correlationId},
								'legalEstablishmentId', ue.id,
								'profileVersion', ue.version
							)
						FROM updated_establishment ue
						RETURNING id
					)
					SELECT * FROM updated_establishment
				`,
			]);
			const [row] = rows as EstablishmentSqlRow[];
			if (row === undefined) {
				return errorResult.fail("CONCURRENCY_CONFLICT");
			}
			return errorResult.ok(mapEstablishmentSql(row));
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async transitionEstablishment(
		record: Parameters<EstablishmentsStore["transitionEstablishment"]>[0],
	): Promise<Result<Establishment>> {
		try {
			const [existingRows] = await afendaDatabase.transaction(
				(sql) => [
					sql`SELECT current_status FROM ca_legal_establishment WHERE id = ${record.id} AND organization_id = ${record.organizationId}`,
				],
				{ readOnly: true },
			);
			const [existing] = existingRows as { current_status: string }[];
			if (existing === undefined) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Establishment not found",
				});
			}
			const transitionCheck = validateEstablishmentStatusTransition({
				from: establishmentStatus(existing.current_status),
				to: record.status,
			});
			if (!transitionCheck.ok) {
				return transitionCheck;
			}
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					WITH updated_establishment AS (
						UPDATE ca_legal_establishment
						SET current_status = ${record.status}, version = version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.id} AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
						RETURNING *
					), superseded AS (
						UPDATE ca_establishment_status_history
						SET effective_to = ${record.effectiveFrom}
						WHERE legal_establishment_id = ${record.id}
							AND organization_id = ${record.organizationId}
							AND effective_to IS NULL
							AND EXISTS (SELECT 1 FROM updated_establishment)
						RETURNING legal_establishment_id
					), inserted_history AS (
						INSERT INTO ca_establishment_status_history (
							organization_id, legal_company_id, legal_establishment_id, status,
							effective_from, effective_to, recorded_at, recorded_by, reason,
							source_document_id, version
						)
						SELECT
							ue.organization_id, ue.legal_company_id, ue.id, ${record.status},
							${record.effectiveFrom}, NULL, now(), ${record.actorUserId},
							${record.reason ?? null}, ${record.sourceDocumentId}, ue.version
						FROM updated_establishment ue
						RETURNING legal_establishment_id
					), inserted_audit AS (
						INSERT INTO platform_audit_log (
							organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							ue.organization_id, ${record.actorUserId}, ${record.correlationId},
							'corporate-administration', 'establishment', ue.id, 'UPDATE', '[]'::jsonb
						FROM updated_establishment ue
						RETURNING id
					), inserted_outbox AS (
						INSERT INTO platform_domain_event (
							organization_id, type, source_module, correlation_id,
							actor_user_id, payload
						)
						SELECT
							ue.organization_id,
							'corporate_administration.legal_establishment.status_changed.v1',
							'corporate-administration', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', ue.organization_id,
								'legalCompanyId', ue.legal_company_id,
								'occurredAt', to_char(ue.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
								'actorUserId', ${record.actorUserId},
								'correlationId', ${record.correlationId},
								'legalEstablishmentId', ue.id,
								'previousStatus', ${existing.current_status},
								'status', ${record.status},
								'effectiveFrom', ${record.effectiveFrom}
							)
						FROM updated_establishment ue
						RETURNING id
					)
					SELECT * FROM updated_establishment
				`,
			]);
			const [row] = rows as EstablishmentSqlRow[];
			if (row === undefined) {
				return errorResult.fail("CONCURRENCY_CONFLICT");
			}
			return errorResult.ok(mapEstablishmentSql(row));
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async getEstablishment(
		input: Parameters<EstablishmentsStore["getEstablishment"]>[0],
	): Promise<Result<Establishment | null>> {
		try {
			const [rows] = await afendaDatabase.transaction(
				(sql) => [
					sql`SELECT * FROM ca_legal_establishment WHERE id = ${input.id} AND organization_id = ${input.organizationId}`,
				],
				{ readOnly: true },
			);
			const [row] = rows as EstablishmentSqlRow[];
			return errorResult.ok(
				row === undefined ? null : mapEstablishmentSql(row),
			);
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async listEstablishments(
		filter: Parameters<EstablishmentsStore["listEstablishments"]>[0],
	): Promise<
		Result<{ items: Establishment[]; nextCursor?: string | undefined }>
	> {
		try {
			const [rows] = await afendaDatabase.transaction(
				(sql) => [
					sql`
						SELECT * FROM ca_legal_establishment
						WHERE organization_id = ${filter.organizationId}
							AND (${filter.legalCompanyId ?? null}::uuid IS NULL
								OR legal_company_id = ${filter.legalCompanyId ?? null}::uuid)
							AND (${filter.status ?? null}::text IS NULL
								OR current_status = ${filter.status ?? null}::text)
							AND (
								${filter.cursor ?? null}::uuid IS NULL
								OR (created_at, id) > (
									SELECT created_at, id FROM ca_legal_establishment
									WHERE id = ${filter.cursor ?? null}::uuid
										AND organization_id = ${filter.organizationId}
								)
							)
						ORDER BY created_at, id
						LIMIT ${filter.limit + 1}
					`,
				],
				{ readOnly: true },
			);
			const allRows = rows as EstablishmentSqlRow[];
			const page = allRows.slice(0, filter.limit).map(mapEstablishmentSql);
			const hasMore = allRows.length > filter.limit;
			return errorResult.ok({
				items: page,
				nextCursor: hasMore ? page.at(-1)?.id : undefined,
			});
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async listEstablishmentStatusHistory(
		input: Parameters<EstablishmentsStore["listEstablishmentStatusHistory"]>[0],
	): Promise<Result<readonly EstablishmentStatusHistoryEntry[]>> {
		try {
			const [rows] = await afendaDatabase.transaction(
				(sql) => [
					sql`
						SELECT h.* FROM ca_establishment_status_history h
						JOIN ca_legal_establishment e ON e.id = h.legal_establishment_id
						WHERE h.legal_establishment_id = ${input.establishmentId}
							AND h.organization_id = ${input.organizationId}
							AND e.organization_id = ${input.organizationId}
						ORDER BY h.version
					`,
				],
				{ readOnly: true },
			);
			return errorResult.ok(
				Object.freeze(
					(rows as EstablishmentStatusHistorySqlRow[]).map(mapHistorySql),
				),
			);
		} catch (error) {
			return failFromPersistence(error);
		}
	},
};
