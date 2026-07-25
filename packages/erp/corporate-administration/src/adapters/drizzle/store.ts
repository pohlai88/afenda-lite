import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	caCompanyIdentifier,
	caCompanyName,
	caCompanyStatusHistory,
	caLegalCompany,
	db,
	eq,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok } from "@afenda/errors/result";

import {
	CA_ERROR_CODE_CONFLICT,
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_VERSION_CONFLICT,
	caErrorDetails,
} from "../../error-codes";
import type {
	CorporateAdministrationStore,
	GovernanceStore,
	SlicesStore,
} from "../../ports";
import type {
	CaCompanyIdentifier,
	CaCompanyName,
	CaCompanyStatusHistory,
	CaLegalCompany,
} from "../../schemas";

import { createDrizzleGovernanceStore } from "./governance-store";
import { createDrizzleSlicesStore } from "./slices-store";

type CompanyRow = typeof caLegalCompany.$inferSelect;

function mapCompany(row: CompanyRow): CaLegalCompany {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		legalEntityDimensionId: row.legalEntityDimensionId,
		legalEntityKeySnapshot: row.legalEntityKeySnapshot,
		legalEntityNameSnapshot: row.legalEntityNameSnapshot,
		legalPartyId: row.legalPartyId,
		legalPartyCodeSnapshot: row.legalPartyCodeSnapshot,
		legalPartyNameSnapshot: row.legalPartyNameSnapshot,
		jurisdictionCountryId: row.jurisdictionCountryId,
		legalFormCode: row.legalFormCode,
		legalFormNameSnapshot: row.legalFormNameSnapshot,
		incorporationDate: row.incorporationDate,
		commencementDate: row.commencementDate,
		fiscalYearEndMonth: row.fiscalYearEndMonth,
		fiscalYearEndDay: row.fiscalYearEndDay,
		status: row.status as CaLegalCompany["status"],
		version: row.version,
		createIdempotencyKey: row.createIdempotencyKey,
		createRequestFingerprint: row.createRequestFingerprint,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		suspendedAt: row.suspendedAt,
		suspendedBy: row.suspendedBy,
		dissolvedAt: row.dissolvedAt,
		dissolvedBy: row.dissolvedBy,
		archivedAt: row.archivedAt,
		archivedBy: row.archivedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

type NameRow = typeof caCompanyName.$inferSelect;
type IdentifierRow = typeof caCompanyIdentifier.$inferSelect;
type StatusHistoryRow = typeof caCompanyStatusHistory.$inferSelect;

function mapName(row: NameRow): CaCompanyName {
	return row as CaCompanyName;
}

function mapIdentifier(row: IdentifierRow): CaCompanyIdentifier {
	return row as CaCompanyIdentifier;
}

function mapStatusHistory(row: StatusHistoryRow): CaCompanyStatusHistory {
	return row as CaCompanyStatusHistory;
}

type CompanyStoreMethods = Omit<
	CorporateAdministrationStore,
	keyof GovernanceStore | keyof SlicesStore
>;

function createDrizzleLegalCompanyStore(): CompanyStoreMethods {
	const store: CompanyStoreMethods = {
		async getByCreateIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caLegalCompany)
					.where(
						and(
							eq(caLegalCompany.organizationId, organizationId),
							eq(caLegalCompany.createIdempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCompany(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load company by idempotency key",
				);
			}
		},
		async getById(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caLegalCompany)
					.where(
						and(
							eq(caLegalCompany.organizationId, organizationId),
							eq(caLegalCompany.id, legalCompanyId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCompany(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load legal company");
			}
		},
		async list(organizationId, filter) {
			try {
				const rows = await db
					.select()
					.from(caLegalCompany)
					.where(
						filter.status
							? and(
									eq(caLegalCompany.organizationId, organizationId),
									eq(caLegalCompany.status, filter.status),
								)
							: eq(caLegalCompany.organizationId, organizationId),
					)
					.orderBy(asc(caLegalCompany.code));
				const start = (filter.page - 1) * filter.pageSize;
				return ok({
					items: rows.slice(start, start + filter.pageSize).map(mapCompany),
					total: rows.length,
				});
			} catch (error) {
				return failFromUnknown(error, "Failed to list legal companies");
			}
		},
		async getDetail(organizationId, legalCompanyId) {
			const company = await store.getById(organizationId, legalCompanyId);
			if (!company.ok) return company;
			if (!company.data) return ok(null);
			const names = await store.listNames(organizationId, legalCompanyId);
			if (!names.ok) return names;
			const identifiers = await store.listIdentifiers(
				organizationId,
				legalCompanyId,
			);
			if (!identifiers.ok) return identifiers;
			const history = await store.listStatusHistory(
				organizationId,
				legalCompanyId,
			);
			if (!history.ok) return history;
			return ok({
				...company.data,
				names: names.data,
				identifiers: identifiers.data,
				statusHistory: history.data,
			});
		},
		async createCompany(record, _ports, meta) {
			const id = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			try {
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], CompanyRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.normalizedCode}`}, 0))`,
					sql`
							WITH inserted AS (
								INSERT INTO ca_legal_company (
									id, organization_id, code, normalized_code,
									legal_entity_dimension_id, legal_entity_key_snapshot, legal_entity_name_snapshot,
									legal_party_id, legal_party_code_snapshot, legal_party_name_snapshot,
									jurisdiction_country_id, legal_form_code, legal_form_name_snapshot,
									incorporation_date, commencement_date, fiscal_year_end_month, fiscal_year_end_day,
									status, version, create_idempotency_key, create_request_fingerprint,
									created_by, updated_by
								)
								SELECT
									${id}::uuid, ${record.organizationId}::text, ${record.code}::text, ${record.normalizedCode}::text,
									${record.legalEntityDimensionId}::uuid, ${record.legalEntityKeySnapshot}::text, ${record.legalEntityNameSnapshot}::text,
									${record.legalPartyId}::uuid, ${record.legalPartyCodeSnapshot}::text, ${record.legalPartyNameSnapshot}::text,
									${record.jurisdictionCountryId}::uuid, ${record.legalFormCode}::text, ${record.legalFormNameSnapshot}::text,
									${record.incorporationDate}::date, ${record.commencementDate}::date, ${record.fiscalYearEndMonth}::integer, ${record.fiscalYearEndDay}::integer,
									${record.status}::text, 1, ${record.createIdempotencyKey}::text, ${record.createRequestFingerprint}::text,
									${record.createdBy}::text, ${record.updatedBy}::text
								WHERE NOT EXISTS (
									SELECT 1 FROM ca_legal_company existing
									WHERE existing.organization_id = ${record.organizationId}
										AND (
											existing.normalized_code = ${record.normalizedCode}
											OR existing.legal_entity_dimension_id = ${record.legalEntityDimensionId}
											OR existing.create_idempotency_key = ${record.createIdempotencyKey}
										)
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module,
									entity, entity_id, action, changes
								)
								SELECT
									${auditId}::uuid, organization_id, ${record.createdBy}::text, ${meta.correlationId}::text,
									'corporate-administration', 'legal_company', id::text, 'CREATE', '[]'::jsonb
								FROM inserted
								RETURNING id
							),
							emitted AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id,
									actor_user_id, payload, status, attempts
								)
								SELECT
									${eventId}::uuid, organization_id, ${meta.eventType}::text, 'corporate-administration',
									${meta.correlationId}::text, ${record.createdBy}::text,
									jsonb_build_object(
										'organizationId', organization_id,
										'entityType', 'legal_company',
										'entityId', id,
										'code', code,
										'version', version,
										'actorId', ${record.createdBy}::text,
										'correlationId', ${meta.correlationId}::text,
										'status', status
									), 'pending', 0
								FROM inserted
								RETURNING id
							)
							SELECT inserted.* FROM inserted, audited, emitted
						`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await store.getByCreateIdempotencyKey(
						record.organizationId,
						record.createIdempotencyKey,
					);
					if (!replay.ok) return replay;
					if (replay.data) {
						if (
							replay.data.createRequestFingerprint !==
							record.createRequestFingerprint
						) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(replay.data);
					}
					return fail(
						"CONFLICT",
						"Company code or legal entity already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return ok(mapCompany(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to create legal company");
			}
		},
		async updateCompany(record, _ports, meta) {
			const historyId = randomUUID();
			const statusHistory = meta.statusHistory;
			try {
				const [rows] = await runNeonHttpTransaction<[CompanyRow[]]>((sql) => [
					sql`
							WITH updated AS (
								UPDATE ca_legal_company
								SET
									legal_party_id = ${record.legalPartyId}::uuid,
									legal_party_code_snapshot = ${record.legalPartyCodeSnapshot}::text,
									legal_party_name_snapshot = ${record.legalPartyNameSnapshot}::text,
									jurisdiction_country_id = ${record.jurisdictionCountryId}::uuid,
									legal_form_code = ${record.legalFormCode}::text,
									legal_form_name_snapshot = ${record.legalFormNameSnapshot}::text,
									incorporation_date = ${record.incorporationDate}::date,
									commencement_date = ${record.commencementDate}::date,
									fiscal_year_end_month = ${record.fiscalYearEndMonth}::integer,
									fiscal_year_end_day = ${record.fiscalYearEndDay}::integer,
									status = ${record.status}::text,
									version = ${record.version + 1},
									updated_by = ${record.updatedBy}::text,
									updated_at = now(),
									activated_at = ${record.activatedAt}::timestamptz,
									activated_by = ${record.activatedBy}::text,
									suspended_at = ${record.suspendedAt}::timestamptz,
									suspended_by = ${record.suspendedBy}::text,
									dissolved_at = ${record.dissolvedAt}::timestamptz,
									dissolved_by = ${record.dissolvedBy}::text,
									archived_at = ${record.archivedAt}::timestamptz,
									archived_by = ${record.archivedBy}::text
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.id}
									AND version = ${record.version}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module,
									entity, entity_id, action, changes
								)
								SELECT
									gen_random_uuid(), organization_id, ${record.updatedBy}::text, ${meta.correlationId}::text,
									'corporate-administration', 'legal_company', id::text, 'UPDATE', '[]'::jsonb
								FROM updated
								RETURNING id
							),
							emitted AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id,
									actor_user_id, payload, status, attempts
								)
								SELECT
									gen_random_uuid(), organization_id, ${meta.eventType}::text,
									'corporate-administration', ${meta.correlationId}::text, ${record.updatedBy}::text,
									jsonb_build_object(
										'organizationId', organization_id,
										'entityType', 'legal_company',
										'entityId', id,
										'code', code,
										'version', version,
										'actorId', ${record.updatedBy}::text,
										'correlationId', ${meta.correlationId}::text,
										'status', status
									), 'pending', 0
								FROM updated
								RETURNING id
							),
							historied AS (
								INSERT INTO ca_company_status_history (
									id, organization_id, legal_company_id, from_status, to_status,
									effective_date, reason, evidence_reference, correlation_id, actor_user_id,
									idempotency_key, request_fingerprint
								)
								SELECT
									${historyId}::uuid, organization_id, id, ${statusHistory?.fromStatus ?? null}::text,
									${statusHistory?.toStatus ?? null}::text, ${statusHistory?.effectiveDate ?? null}::date,
									${statusHistory?.reason ?? null}::text, ${statusHistory?.evidenceReference ?? null}::text,
									${statusHistory?.correlationId ?? null}::text, ${statusHistory?.actorUserId ?? null}::text,
									${statusHistory?.idempotencyKey ?? null}::text, ${statusHistory?.requestFingerprint ?? null}::text
								FROM updated
								WHERE ${statusHistory !== undefined ? 1 : 0}::int = 1
								RETURNING id
							)
							SELECT updated.* FROM updated, audited, emitted
						`,
				]);
				const row = rows[0];
				if (!row) {
					return fail(
						"CONFLICT",
						"Legal company version conflict",
						caErrorDetails(CA_ERROR_VERSION_CONFLICT),
					);
				}
				return ok(mapCompany(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to update legal company");
			}
		},
		async appendStatusHistory(record) {
			try {
				const id = randomUUID();
				const rows = await db
					.insert(caCompanyStatusHistory)
					.values({
						id,
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						fromStatus: record.fromStatus,
						toStatus: record.toStatus,
						effectiveDate: record.effectiveDate,
						reason: record.reason,
						evidenceReference: record.evidenceReference,
						correlationId: record.correlationId,
						actorUserId: record.actorUserId,
						idempotencyKey: record.idempotencyKey,
						requestFingerprint: record.requestFingerprint,
					})
					.returning();
				const row = rows[0];
				if (!row) {
					return fail("INTERNAL_ERROR", "Failed to append status history");
				}
				return ok(mapStatusHistory(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to append status history");
			}
		},
		async getStatusHistoryByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caCompanyStatusHistory)
					.where(
						and(
							eq(caCompanyStatusHistory.organizationId, organizationId),
							eq(caCompanyStatusHistory.idempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapStatusHistory(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load status history by idempotency key",
				);
			}
		},
		async getNameByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caCompanyName)
					.where(
						and(
							eq(caCompanyName.organizationId, organizationId),
							eq(caCompanyName.idempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapName(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to load name by idempotency key");
			}
		},
		async getIdentifierByIdempotencyKey(organizationId, idempotencyKey) {
			try {
				const rows = await db
					.select()
					.from(caCompanyIdentifier)
					.where(
						and(
							eq(caCompanyIdentifier.organizationId, organizationId),
							eq(caCompanyIdentifier.idempotencyKey, idempotencyKey),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapIdentifier(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load identifier by idempotency key",
				);
			}
		},
		async addName(record, _ports, meta) {
			const id = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			try {
				const [rows] = await runNeonHttpTransaction<[NameRow[]]>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.legalCompanyId}:name`}, 0))`,
					sql`
							WITH inserted AS (
								INSERT INTO ca_company_name (
									id, organization_id, legal_company_id, name_type, display_name,
									normalized_name, effective_from, effective_to, supersedes_id,
									idempotency_key, request_fingerprint, version, created_by, updated_by
								)
								SELECT
									${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid, ${record.nameType}::text,
									${record.displayName}::text, ${record.normalizedName}::text, ${record.effectiveFrom}::date,
									${record.effectiveTo}::date, ${record.supersedesId}::uuid, ${record.idempotencyKey}::text,
									${record.requestFingerprint}::text, 1, ${record.createdBy}::text, ${record.updatedBy}::text
								WHERE NOT EXISTS (
									SELECT 1 FROM ca_company_name existing
									WHERE existing.organization_id = ${record.organizationId}
										AND existing.idempotency_key = ${record.idempotencyKey}
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module,
									entity, entity_id, action, changes
								)
								SELECT
									${auditId}::uuid, organization_id, ${record.createdBy}::text, ${meta.correlationId}::text,
									'corporate-administration', 'company_name', id::text, 'CREATE', '[]'::jsonb
								FROM inserted
								RETURNING id
							),
							emitted AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id,
									actor_user_id, payload, status, attempts
								)
								SELECT
									${eventId}::uuid, organization_id, ${meta.eventType}::text, 'corporate-administration',
									${meta.correlationId}::text, ${record.createdBy}::text,
									jsonb_build_object(
										'organizationId', organization_id,
										'entityType', 'legal_company',
										'entityId', legal_company_id,
										'code', ${meta.legalCompanyCode}::text,
										'version', version,
										'actorId', ${record.createdBy}::text,
										'correlationId', ${meta.correlationId}::text,
										'status', 'draft'
									), 'pending', 0
								FROM inserted
								RETURNING id
							)
							SELECT inserted.* FROM inserted, audited, emitted
						`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await store.getNameByIdempotencyKey(
						record.organizationId,
						record.idempotencyKey,
					);
					if (!replay.ok) return replay;
					if (replay.data) {
						if (replay.data.requestFingerprint !== record.requestFingerprint) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(replay.data);
					}
					return fail(
						"CONFLICT",
						"Failed to add company name",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return ok(mapName(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to add company name");
			}
		},
		async listNames(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caCompanyName)
					.where(
						and(
							eq(caCompanyName.organizationId, organizationId),
							eq(caCompanyName.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows as CaCompanyName[]);
			} catch (error) {
				return failFromUnknown(error, "Failed to list company names");
			}
		},
		async addIdentifier(record, _ports, meta) {
			const id = randomUUID();
			const auditId = randomUUID();
			const eventId = randomUUID();
			try {
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], IdentifierRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.identifierType}:${record.normalizedValue}`}, 0))`,
					sql`
							WITH inserted AS (
								INSERT INTO ca_company_identifier (
									id, organization_id, legal_company_id, identifier_type,
									jurisdiction_code, issuing_authority, identifier_value, normalized_value,
									status, effective_from, effective_to, idempotency_key, request_fingerprint,
									version, created_by, updated_by
								)
								SELECT
									${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid, ${record.identifierType}::text,
									${record.jurisdictionCode}::text, ${record.issuingAuthority}::text, ${record.identifierValue}::text,
									${record.normalizedValue}::text, ${record.status}::text, ${record.effectiveFrom}::date,
									${record.effectiveTo}::date, ${record.idempotencyKey}::text, ${record.requestFingerprint}::text,
									1, ${record.createdBy}::text, ${record.updatedBy}::text
								WHERE NOT EXISTS (
									SELECT 1 FROM ca_company_identifier existing
									WHERE existing.organization_id = ${record.organizationId}
										AND (
											existing.idempotency_key = ${record.idempotencyKey}
											OR (
												existing.identifier_type = ${record.identifierType}
												AND existing.normalized_value = ${record.normalizedValue}
											)
										)
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module,
									entity, entity_id, action, changes
								)
								SELECT
									${auditId}::uuid, organization_id, ${record.createdBy}::text, ${meta.correlationId}::text,
									'corporate-administration', 'company_identifier', id::text, 'CREATE', '[]'::jsonb
								FROM inserted
								RETURNING id
							),
							emitted AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id,
									actor_user_id, payload, status, attempts
								)
								SELECT
									${eventId}::uuid, organization_id, ${meta.eventType}::text, 'corporate-administration',
									${meta.correlationId}::text, ${record.createdBy}::text,
									jsonb_build_object(
										'organizationId', organization_id,
										'entityType', 'legal_company',
										'entityId', legal_company_id,
										'code', ${meta.legalCompanyCode}::text,
										'version', version,
										'actorId', ${record.createdBy}::text,
										'correlationId', ${meta.correlationId}::text,
										'status', 'draft'
									), 'pending', 0
								FROM inserted
								RETURNING id
							)
							SELECT inserted.* FROM inserted, audited, emitted
						`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await store.getIdentifierByIdempotencyKey(
						record.organizationId,
						record.idempotencyKey,
					);
					if (!replay.ok) return replay;
					if (replay.data) {
						if (replay.data.requestFingerprint !== record.requestFingerprint) {
							return fail(
								"CONFLICT",
								"Idempotency key was already used for a different request",
								caErrorDetails(CA_ERROR_IDEMPOTENCY_CONFLICT),
							);
						}
						return ok(replay.data);
					}
					return fail(
						"CONFLICT",
						"Identifier already exists",
						caErrorDetails(CA_ERROR_CODE_CONFLICT),
					);
				}
				return ok(mapIdentifier(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to add identifier");
			}
		},
		async listIdentifiers(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caCompanyIdentifier)
					.where(
						and(
							eq(caCompanyIdentifier.organizationId, organizationId),
							eq(caCompanyIdentifier.legalCompanyId, legalCompanyId),
						),
					);
				return ok(rows as CaCompanyIdentifier[]);
			} catch (error) {
				return failFromUnknown(error, "Failed to list identifiers");
			}
		},
		async listStatusHistory(organizationId, legalCompanyId) {
			try {
				const rows = await db
					.select()
					.from(caCompanyStatusHistory)
					.where(
						and(
							eq(caCompanyStatusHistory.organizationId, organizationId),
							eq(caCompanyStatusHistory.legalCompanyId, legalCompanyId),
						),
					)
					.orderBy(asc(caCompanyStatusHistory.effectiveDate));
				return ok(rows as CaCompanyStatusHistory[]);
			} catch (error) {
				return failFromUnknown(error, "Failed to list status history");
			}
		},
		async getNameById(organizationId, companyNameId) {
			try {
				const rows = await db
					.select()
					.from(caCompanyName)
					.where(
						and(
							eq(caCompanyName.organizationId, organizationId),
							eq(caCompanyName.id, companyNameId),
						),
					)
					.limit(1);
				return ok((rows[0] as CaCompanyName | undefined) ?? null);
			} catch (error) {
				return failFromUnknown(error, "Failed to get company name");
			}
		},
		async getIdentifierById(organizationId, companyIdentifierId) {
			try {
				const rows = await db
					.select()
					.from(caCompanyIdentifier)
					.where(
						and(
							eq(caCompanyIdentifier.organizationId, organizationId),
							eq(caCompanyIdentifier.id, companyIdentifierId),
						),
					)
					.limit(1);
				return ok((rows[0] as CaCompanyIdentifier | undefined) ?? null);
			} catch (error) {
				return failFromUnknown(error, "Failed to get company identifier");
			}
		},
		async endName(record, _ports, meta) {
			const auditId = randomUUID();
			const eventId = randomUUID();
			try {
				const [rows] = await runNeonHttpTransaction<[NameRow[]]>((sql) => [
					sql`
							WITH updated AS (
								UPDATE ca_company_name
								SET
									effective_to = ${record.effectiveTo}::date,
									version = ${record.version + 1},
									updated_by = ${record.updatedBy}::text,
									updated_at = now()
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.id}
									AND version = ${record.version}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module,
									entity, entity_id, action, changes
								)
								SELECT
									${auditId}::uuid, organization_id, ${record.updatedBy}::text, ${meta.correlationId}::text,
									'corporate-administration', 'company_name', id::text, 'UPDATE', '[]'::jsonb
								FROM updated
								RETURNING id
							),
							emitted AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id,
									actor_user_id, payload, status, attempts
								)
								SELECT
									${eventId}::uuid, organization_id, ${meta.eventType}::text, 'corporate-administration',
									${meta.correlationId}::text, ${record.updatedBy}::text,
									jsonb_build_object(
										'organizationId', organization_id,
										'entityType', 'legal_company',
										'entityId', legal_company_id,
										'code', ${meta.legalCompanyCode}::text,
										'version', version,
										'actorId', ${record.updatedBy}::text,
										'correlationId', ${meta.correlationId}::text,
										'status', 'draft'
									), 'pending', 0
								FROM updated
								RETURNING id
							)
							SELECT updated.* FROM updated, audited, emitted
						`,
				]);
				const row = rows[0];
				if (!row) {
					return fail(
						"CONFLICT",
						"Company name version conflict",
						caErrorDetails(CA_ERROR_VERSION_CONFLICT),
					);
				}
				return ok(mapName(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to end company name");
			}
		},
		async updateIdentifier(record, _ports, meta) {
			const auditId = randomUUID();
			const eventId = randomUUID();
			try {
				const [rows] = await runNeonHttpTransaction<[IdentifierRow[]]>(
					(sql) => [
						sql`
							WITH updated AS (
								UPDATE ca_company_identifier
								SET
									jurisdiction_code = ${record.jurisdictionCode}::text,
									issuing_authority = ${record.issuingAuthority}::text,
									identifier_value = ${record.identifierValue}::text,
									normalized_value = ${record.normalizedValue}::text,
									status = ${record.status}::text,
									effective_to = ${record.effectiveTo}::date,
									version = ${record.version + 1},
									updated_by = ${record.updatedBy}::text,
									updated_at = now()
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.id}
									AND version = ${record.version}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module,
									entity, entity_id, action, changes
								)
								SELECT
									${auditId}::uuid, organization_id, ${record.updatedBy}::text, ${meta.correlationId}::text,
									'corporate-administration', 'company_identifier', id::text, 'UPDATE', '[]'::jsonb
								FROM updated
								RETURNING id
							),
							emitted AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id,
									actor_user_id, payload, status, attempts
								)
								SELECT
									${eventId}::uuid, organization_id, ${meta.eventType}::text, 'corporate-administration',
									${meta.correlationId}::text, ${record.updatedBy}::text,
									jsonb_build_object(
										'organizationId', organization_id,
										'entityType', 'legal_company',
										'entityId', legal_company_id,
										'code', ${meta.legalCompanyCode}::text,
										'version', version,
										'actorId', ${record.updatedBy}::text,
										'correlationId', ${meta.correlationId}::text,
										'status', 'draft'
									), 'pending', 0
								FROM updated
								RETURNING id
							)
							SELECT updated.* FROM updated, audited, emitted
						`,
					],
				);
				const row = rows[0];
				if (!row) {
					return fail(
						"CONFLICT",
						"Company identifier version conflict",
						caErrorDetails(CA_ERROR_VERSION_CONFLICT),
					);
				}
				return ok(mapIdentifier(row));
			} catch (error) {
				return failFromUnknown(error, "Failed to update company identifier");
			}
		},
	};
	return store;
}

export function createDrizzleCorporateAdministrationStore(): CorporateAdministrationStore {
	return {
		...createDrizzleLegalCompanyStore(),
		...createDrizzleGovernanceStore(),
		...createDrizzleSlicesStore(),
	};
}
