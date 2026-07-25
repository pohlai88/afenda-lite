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
import { failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	caCompanyIdentifierIdSchema,
	caCompanyNameIdSchema,
	caLegalCompanyIdSchema,
} from "../../brands";
import type {
	CaCompanyIdentifier,
	CaCompanyName,
	CaCompanyStatusHistory,
	CaLegalCompany,
} from "../../company/types";
import { isEffectivePrimaryLegalName } from "../../shared/activation-readiness";
import { resolveStatusAsOf } from "../../shared/as-of";
import {
	filterEffectiveAsOf,
	hasOverlappingRange,
} from "../../shared/effective-range";
import { idempotencyFingerprintConflict } from "../../shared/idempotency-replay";
import { bufferCompanyRegistryFacts } from "./unit-of-work";
import {
	toCompanyIdentifierMutationReceipt,
	toCompanyNameMutationReceipt,
	toLegalCompanyMutationReceipt,
} from "../../shared/mutation-receipts";
import { paginateLegalCompanies } from "../../shared/paginate-companies";
import type {
	CompanyIdentifierListFilter,
	CompanyIdentifierUpdatePatch,
	CompanyNameListFilter,
	CorporateAdministrationCompanyStore,
	LegalCompanyActivationFacts,
	LegalCompanyTransitionPatch,
	LegalCompanyUpdatePatch,
} from "../../store/company-store";
import type { CorporateAdministrationMutationMeta } from "../../store/company-store";
import {
	CORPORATE_ADMINISTRATION_STORE_ERROR_CODES,
	CorporateAdministrationStoreError,
	CorporateAdministrationVersionConflictError,
	isCorporateAdministrationStoreError,
	mapCorporateAdministrationStoreError,
} from "../../store/store-errors";
import { companyRegistryFactsCtes } from "./mutation-facts-sql";

type CompanyRow = typeof caLegalCompany.$inferSelect;
type NameRow = typeof caCompanyName.$inferSelect;
type IdentifierRow = typeof caCompanyIdentifier.$inferSelect;
type StatusHistoryRow = typeof caCompanyStatusHistory.$inferSelect;

function mapStoreError<T>(error: unknown, fallbackMessage: string): Result<T> {
	if (isCorporateAdministrationStoreError(error)) {
		return mapCorporateAdministrationStoreError(error);
	}
	return failFromUnknown(error, fallbackMessage);
}

function mapCompany(row: CompanyRow): CaLegalCompany {
	return {
		id: caLegalCompanyIdSchema.parse(row.id),
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
		status: row.status,
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

function mapName(row: NameRow): CaCompanyName {
	return {
		id: caCompanyNameIdSchema.parse(row.id),
		organizationId: row.organizationId,
		legalCompanyId: caLegalCompanyIdSchema.parse(row.legalCompanyId),
		nameType: row.nameType,
		displayName: row.displayName,
		normalizedName: row.normalizedName,
		isPrimary: row.isPrimary === 1,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesCompanyNameId: row.supersedesCompanyNameId
			? caCompanyNameIdSchema.parse(row.supersedesCompanyNameId)
			: null,
		correctionReason: row.correctionReason,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapIdentifier(row: IdentifierRow): CaCompanyIdentifier {
	return {
		id: caCompanyIdentifierIdSchema.parse(row.id),
		organizationId: row.organizationId,
		legalCompanyId: caLegalCompanyIdSchema.parse(row.legalCompanyId),
		identifierType: row.identifierType,
		jurisdictionCountryId: row.jurisdictionCountryId,
		authorityPartyId: row.authorityPartyId,
		identifierValue: row.identifierValue,
		normalizedIdentifierValue: row.normalizedIdentifierValue,
		isPrimary: row.isPrimary === 1,
		status: row.status,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapStatusHistory(row: StatusHistoryRow): CaCompanyStatusHistory {
	return {
		id: row.id,
		organizationId: row.organizationId,
		legalCompanyId: caLegalCompanyIdSchema.parse(row.legalCompanyId),
		fromStatus: row.fromStatus,
		toStatus: row.toStatus,
		effectiveAt: row.effectiveAt,
		reasonCode: row.reasonCode,
		reason: row.reason,
		resolutionReference: row.resolutionReference,
		evidenceDocumentReference: row.evidenceDocumentReference,
		correlationId: row.correlationId,
		causationId: row.causationId,
		actorUserId: row.actorUserId,
		idempotencyKey: row.idempotencyKey,
		requestFingerprint: row.requestFingerprint,
		createdAt: row.createdAt,
	};
}

function applyCompanyNameListFilter(
	names: readonly CaCompanyName[],
	filter: CompanyNameListFilter,
): CaCompanyName[] {
	let rows = names.filter(
		(row) =>
			row.organizationId === filter.organizationId &&
			row.legalCompanyId === filter.legalCompanyId,
	);
	if (filter.nameType !== undefined) {
		rows = rows.filter((row) => row.nameType === filter.nameType);
	}
	if (filter.asOf !== undefined) {
		const asOfDate = filter.asOf.slice(0, 10);
		rows = filterEffectiveAsOf(rows, asOfDate);
	}
	return rows;
}

function applyCompanyIdentifierListFilter(
	identifiers: readonly CaCompanyIdentifier[],
	filter: CompanyIdentifierListFilter,
): CaCompanyIdentifier[] {
	let rows = identifiers.filter(
		(row) =>
			row.organizationId === filter.organizationId &&
			row.legalCompanyId === filter.legalCompanyId,
	);
	if (filter.identifierType !== undefined) {
		rows = rows.filter((row) => row.identifierType === filter.identifierType);
	}
	if (filter.status !== undefined) {
		rows = rows.filter((row) => row.status === filter.status);
	}
	if (filter.asOf !== undefined) {
		const asOfDate = filter.asOf.slice(0, 10);
		rows = filterEffectiveAsOf(rows, asOfDate);
	}
	return rows;
}

function mergeLegalCompanyUpdatePatch(
	existing: CaLegalCompany,
	patch: LegalCompanyUpdatePatch,
): CaLegalCompany {
	return {
		...existing,
		...(patch.code !== undefined ? { code: patch.code } : {}),
		...(patch.normalizedCode !== undefined
			? { normalizedCode: patch.normalizedCode }
			: {}),
		...(patch.legalPartyId !== undefined
			? { legalPartyId: patch.legalPartyId }
			: {}),
		...(patch.legalPartyCodeSnapshot !== undefined
			? { legalPartyCodeSnapshot: patch.legalPartyCodeSnapshot }
			: {}),
		...(patch.legalPartyNameSnapshot !== undefined
			? { legalPartyNameSnapshot: patch.legalPartyNameSnapshot }
			: {}),
		...(patch.jurisdictionCountryId !== undefined
			? { jurisdictionCountryId: patch.jurisdictionCountryId }
			: {}),
		...(patch.legalFormCode !== undefined
			? { legalFormCode: patch.legalFormCode }
			: {}),
		...(patch.legalFormNameSnapshot !== undefined
			? { legalFormNameSnapshot: patch.legalFormNameSnapshot }
			: {}),
		...(patch.incorporationDate !== undefined
			? { incorporationDate: patch.incorporationDate }
			: {}),
		...(patch.commencementDate !== undefined
			? { commencementDate: patch.commencementDate }
			: {}),
		...(patch.fiscalYearEndMonth !== undefined
			? { fiscalYearEndMonth: patch.fiscalYearEndMonth }
			: {}),
		...(patch.fiscalYearEndDay !== undefined
			? { fiscalYearEndDay: patch.fiscalYearEndDay }
			: {}),
		updatedBy: patch.updatedBy,
		version: existing.version + 1,
		updatedAt: patch.updatedAt ?? new Date(),
	};
}

function mergeLegalCompanyTransitionPatch(
	existing: CaLegalCompany,
	patch: LegalCompanyTransitionPatch,
): CaLegalCompany {
	return {
		...existing,
		status: patch.status,
		activatedAt:
			patch.activatedAt === undefined
				? existing.activatedAt
				: patch.activatedAt,
		activatedBy:
			patch.activatedBy === undefined
				? existing.activatedBy
				: patch.activatedBy,
		suspendedAt:
			patch.suspendedAt === undefined
				? existing.suspendedAt
				: patch.suspendedAt,
		suspendedBy:
			patch.suspendedBy === undefined
				? existing.suspendedBy
				: patch.suspendedBy,
		dissolvedAt:
			patch.dissolvedAt === undefined
				? existing.dissolvedAt
				: patch.dissolvedAt,
		dissolvedBy:
			patch.dissolvedBy === undefined
				? existing.dissolvedBy
				: patch.dissolvedBy,
		archivedAt:
			patch.archivedAt === undefined ? existing.archivedAt : patch.archivedAt,
		archivedBy:
			patch.archivedBy === undefined ? existing.archivedBy : patch.archivedBy,
		version: existing.version + 1,
		updatedBy: patch.updatedBy,
		updatedAt: patch.updatedAt ?? new Date(),
	};
}

function mergeCompanyIdentifierUpdatePatch(
	existing: CaCompanyIdentifier,
	patch: CompanyIdentifierUpdatePatch,
): CaCompanyIdentifier {
	return {
		...existing,
		...(patch.jurisdictionCountryId !== undefined
			? { jurisdictionCountryId: patch.jurisdictionCountryId }
			: {}),
		...(patch.authorityPartyId !== undefined
			? { authorityPartyId: patch.authorityPartyId }
			: {}),
		...(patch.identifierValue !== undefined
			? { identifierValue: patch.identifierValue }
			: {}),
		...(patch.normalizedIdentifierValue !== undefined
			? { normalizedIdentifierValue: patch.normalizedIdentifierValue }
			: {}),
		...(patch.isPrimary !== undefined ? { isPrimary: patch.isPrimary } : {}),
		...(patch.effectiveFrom !== undefined
			? { effectiveFrom: patch.effectiveFrom }
			: {}),
		...(patch.effectiveTo !== undefined
			? { effectiveTo: patch.effectiveTo }
			: {}),
		...(patch.status !== undefined ? { status: patch.status } : {}),
		updatedBy: patch.updatedBy,
		version: existing.version + 1,
		updatedAt: patch.updatedAt ?? new Date(),
	};
}

export function createDrizzleLegalCompanyStore(): CorporateAdministrationCompanyStore {
	const store: CorporateAdministrationCompanyStore = {
		async findLegalCompanyById(organizationId, legalCompanyId) {
			return store.getLegalCompany(organizationId, legalCompanyId);
		},

		async getLegalCompany(organizationId, legalCompanyId) {
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

		async findLegalCompanyByNormalizedCode(organizationId, normalizedCode) {
			try {
				const rows = await db
					.select()
					.from(caLegalCompany)
					.where(
						and(
							eq(caLegalCompany.organizationId, organizationId),
							eq(caLegalCompany.normalizedCode, normalizedCode),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCompany(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load legal company by normalized code",
				);
			}
		},

		async findLegalCompanyByDimensionId(
			organizationId,
			legalEntityDimensionId,
		) {
			try {
				const rows = await db
					.select()
					.from(caLegalCompany)
					.where(
						and(
							eq(caLegalCompany.organizationId, organizationId),
							eq(caLegalCompany.legalEntityDimensionId, legalEntityDimensionId),
						),
					)
					.limit(1);
				return ok(rows[0] ? mapCompany(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load legal company by dimension id",
				);
			}
		},

		async findCreateLegalCompanyReceipt(organizationId, idempotencyKey) {
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
				return ok(
					rows[0] ? toLegalCompanyMutationReceipt(mapCompany(rows[0])) : null,
				);
			} catch (error) {
				return failFromUnknown(error, "Failed to load company create receipt");
			}
		},

		async listLegalCompanies(filter) {
			try {
				const rows = await db
					.select()
					.from(caLegalCompany)
					.where(eq(caLegalCompany.organizationId, filter.organizationId));
				return ok(
					paginateLegalCompanies(rows.map(mapCompany), {
						status: filter.status,
						normalizedQuery: filter.normalizedQuery,
						cursor: filter.cursor,
						limit: filter.limit,
					}),
				);
			} catch (error) {
				return failFromUnknown(error, "Failed to list legal companies");
			}
		},

		async getLegalCompanyStatusAsOf(organizationId, legalCompanyId, asOf) {
			const companyResult = await store.getLegalCompany(
				organizationId,
				legalCompanyId,
			);
			if (!companyResult.ok) return companyResult;
			if (!companyResult.data) return ok(null);
			const historyResult = await store.listCompanyStatusHistory({
				organizationId,
				legalCompanyId: companyResult.data.id,
			});
			if (!historyResult.ok) return historyResult;
			return ok(
				resolveStatusAsOf(
					historyResult.data,
					asOf.slice(0, 10),
					companyResult.data.status,
				),
			);
		},

		async loadLegalCompanyActivationFacts(
			organizationId,
			legalCompanyId,
			asOfDate,
		) {
			const companyResult = await store.getLegalCompany(
				organizationId,
				legalCompanyId,
			);
			if (!companyResult.ok) return companyResult;
			if (!companyResult.data) return ok(null);
			const asOf = asOfDate.slice(0, 10);
			const namesResult = await store.listCompanyNames({
				organizationId,
				legalCompanyId: companyResult.data.id,
				asOf,
			});
			if (!namesResult.ok) return namesResult;
			const identifiersResult = await store.listCompanyIdentifiers({
				organizationId,
				legalCompanyId: companyResult.data.id,
				asOf,
				status: "active",
			});
			if (!identifiersResult.ok) return identifiersResult;
			return ok({
				company: companyResult.data,
				effectiveNames: namesResult.data,
				effectiveIdentifiers: identifiersResult.data,
			} satisfies LegalCompanyActivationFacts);
		},

		async createLegalCompany(record, context, meta) {
			const id = record.id ?? randomUUID();
			const { audit, outbox } = await bufferCompanyRegistryFacts(context, meta, {
					aggregateType: "legal_company",
					aggregateId: id,
					legalCompanyId: id,
					action: "CREATE",
					beforeVersion: null,
					afterVersion: 1,
					code: record.code,
					status: record.status,
			});
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
						${companyRegistryFactsCtes(sql, "inserted", audit, outbox)}
						SELECT inserted.* FROM inserted, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await store.findCreateLegalCompanyReceipt(
						record.organizationId,
						record.createIdempotencyKey,
					);
					if (!replay.ok) return replay;
					if (replay.data) {
						if (
							replay.data.requestFingerprint !== record.createRequestFingerprint
						) {
							return idempotencyFingerprintConflict({
								organizationId: record.organizationId,
								idempotencyKey: record.createIdempotencyKey,
							});
						}
						return ok(replay.data.result);
					}
					const codeConflict = await store.findLegalCompanyByNormalizedCode(
						record.organizationId,
						record.normalizedCode,
					);
					if (!codeConflict.ok) return codeConflict;
					if (codeConflict.data) {
						throw new CorporateAdministrationStoreError({
							code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.codeConflict,
							message: "Company code already exists",
						});
					}
					const dimensionConflict = await store.findLegalCompanyByDimensionId(
						record.organizationId,
						record.legalEntityDimensionId,
					);
					if (!dimensionConflict.ok) return dimensionConflict;
					if (dimensionConflict.data) {
						throw new CorporateAdministrationStoreError({
							code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.dimensionConflict,
							message: "Legal entity dimension already bound",
						});
					}
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.codeConflict,
						message: "Company code or legal entity already exists",
					});
				}
				return ok(mapCompany(row));
			} catch (error) {
				return mapStoreError(error, "Failed to create legal company");
			}
		},

		async updateLegalCompany(
			organizationId,
			legalCompanyId,
			expectedVersion,
			patch,
			context,
			meta,
		) {
			try {
				const existingResult = await store.getLegalCompany(
					organizationId,
					legalCompanyId,
				);
				if (!existingResult.ok) return existingResult;
				if (!existingResult.data) {
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
						message: "Legal company not found",
					});
				}
				if (existingResult.data.version !== expectedVersion) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: legalCompanyId,
						expectedVersion,
					});
				}
				const merged = mergeLegalCompanyUpdatePatch(existingResult.data, patch);
				const { audit, outbox } = await bufferCompanyRegistryFacts(context, meta, {
					aggregateType: "legal_company",
					aggregateId: merged.id,
					legalCompanyId: merged.id,
					action: "UPDATE",
					beforeVersion: existingResult.data.version,
					afterVersion: merged.version,
					changedFields: Object.keys(patch),
					code: merged.code,
					status: merged.status,
				});
				const [rows] = await runNeonHttpTransaction<[CompanyRow[]]>((sql) => [
					sql`
						WITH updated AS (
							UPDATE ca_legal_company
							SET
								code = ${merged.code}::text,
								normalized_code = ${merged.normalizedCode}::text,
								legal_party_id = ${merged.legalPartyId}::uuid,
								legal_party_code_snapshot = ${merged.legalPartyCodeSnapshot}::text,
								legal_party_name_snapshot = ${merged.legalPartyNameSnapshot}::text,
								jurisdiction_country_id = ${merged.jurisdictionCountryId}::uuid,
								legal_form_code = ${merged.legalFormCode}::text,
								legal_form_name_snapshot = ${merged.legalFormNameSnapshot}::text,
								incorporation_date = ${merged.incorporationDate}::date,
								commencement_date = ${merged.commencementDate}::date,
								fiscal_year_end_month = ${merged.fiscalYearEndMonth}::integer,
								fiscal_year_end_day = ${merged.fiscalYearEndDay}::integer,
								version = ${merged.version},
								updated_by = ${merged.updatedBy}::text,
								updated_at = ${merged.updatedAt}::timestamptz
							WHERE organization_id = ${organizationId}
								AND id = ${legalCompanyId}
								AND version = ${expectedVersion}
							RETURNING *
						),
						${companyRegistryFactsCtes(sql, "updated", audit, outbox)}
						SELECT updated.* FROM updated, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: legalCompanyId,
						expectedVersion,
					});
				}
				return ok(mapCompany(row));
			} catch (error) {
				return mapStoreError(error, "Failed to update legal company");
			}
		},

		async transitionLegalCompany(
			organizationId,
			legalCompanyId,
			expectedVersion,
			patch,
			history,
			context,
			meta,
		) {
			try {
				const existingResult = await store.getLegalCompany(
					organizationId,
					legalCompanyId,
				);
				if (!existingResult.ok) return existingResult;
				if (!existingResult.data) {
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
						message: "Legal company not found",
					});
				}
				if (existingResult.data.version !== expectedVersion) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: legalCompanyId,
						expectedVersion,
					});
				}
				const merged = mergeLegalCompanyTransitionPatch(
					existingResult.data,
					patch,
				);
				const historyId = history.id ?? randomUUID();
				const { audit, outbox } = await bufferCompanyRegistryFacts(context, meta, {
					aggregateType: "legal_company",
					aggregateId: merged.id,
					legalCompanyId: merged.id,
					action: "UPDATE",
					beforeVersion: existingResult.data.version,
					afterVersion: merged.version,
					changedFields: ["status"],
					code: merged.code,
					status: merged.status,
				});
				const [rows] = await runNeonHttpTransaction<[CompanyRow[]]>((sql) => [
					sql`
						WITH updated AS (
							UPDATE ca_legal_company
							SET
								status = ${merged.status}::text,
								version = ${merged.version},
								updated_by = ${merged.updatedBy}::text,
								updated_at = ${merged.updatedAt}::timestamptz,
								activated_at = ${merged.activatedAt}::timestamptz,
								activated_by = ${merged.activatedBy}::text,
								suspended_at = ${merged.suspendedAt}::timestamptz,
								suspended_by = ${merged.suspendedBy}::text,
								dissolved_at = ${merged.dissolvedAt}::timestamptz,
								dissolved_by = ${merged.dissolvedBy}::text,
								archived_at = ${merged.archivedAt}::timestamptz,
								archived_by = ${merged.archivedBy}::text
							WHERE organization_id = ${organizationId}
								AND id = ${legalCompanyId}
								AND version = ${expectedVersion}
							RETURNING *
						),
						${companyRegistryFactsCtes(sql, "updated", audit, outbox)},
						historied AS (
							INSERT INTO ca_company_status_history (
								id, organization_id, legal_company_id, from_status, to_status,
								effective_at, reason_code, reason, resolution_reference,
								evidence_document_reference, correlation_id, causation_id, actor_user_id,
								idempotency_key, request_fingerprint
							)
							SELECT
								${historyId}::uuid, organization_id, id, ${history.fromStatus}::text,
								${history.toStatus}::text, ${history.effectiveAt}::timestamptz,
								${history.reasonCode}::text, ${history.reason}::text,
								${history.resolutionReference}::text,
								${history.evidenceDocumentReference}::text,
								${history.correlationId}::text, ${history.causationId}::text,
								${history.actorUserId}::text,
								${history.idempotencyKey}::text, ${history.requestFingerprint}::text
							FROM updated
							RETURNING id
						)
						SELECT updated.* FROM updated, audited, emitted, historied
					`,
				]);
				const row = rows[0];
				if (!row) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: legalCompanyId,
						expectedVersion,
					});
				}
				return ok(mapCompany(row));
			} catch (error) {
				return mapStoreError(error, "Failed to transition legal company");
			}
		},

		async findStatusHistoryByIdempotencyKey(organizationId, idempotencyKey) {
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

		async listCompanyStatusHistory(filter) {
			try {
				const rows = await db
					.select()
					.from(caCompanyStatusHistory)
					.where(
						and(
							eq(caCompanyStatusHistory.organizationId, filter.organizationId),
							eq(caCompanyStatusHistory.legalCompanyId, filter.legalCompanyId),
						),
					)
					.orderBy(asc(caCompanyStatusHistory.effectiveAt));
				return ok(rows.map(mapStatusHistory));
			} catch (error) {
				return failFromUnknown(error, "Failed to list status history");
			}
		},

		async findCompanyNameById(organizationId, companyNameId) {
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
				return ok(rows[0] ? mapName(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to get company name");
			}
		},

		async findCompanyNameReceipt(organizationId, idempotencyKey) {
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
				return ok(
					rows[0] ? toCompanyNameMutationReceipt(mapName(rows[0])) : null,
				);
			} catch (error) {
				return failFromUnknown(error, "Failed to load company name receipt");
			}
		},

		async createCompanyName(record, context, meta) {
			const id = record.id ?? randomUUID();
			const { audit, outbox } = await bufferCompanyRegistryFacts(context, meta, {
				aggregateType: "company_name",
				aggregateId: id,
				legalCompanyId: record.legalCompanyId,
				action: "CREATE",
				beforeVersion: null,
				afterVersion: 1,
				code: meta.legalCompanyCode ?? "",
				status: "draft",
			});
			try {
				const [rows] = await runNeonHttpTransaction<[NameRow[]]>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.legalCompanyId}:name`}, 0))`,
					sql`
						WITH inserted AS (
							INSERT INTO ca_company_name (
								id, organization_id, legal_company_id, name_type, display_name,
								normalized_name, is_primary, effective_from, effective_to,
								supersedes_company_name_id, correction_reason,
								idempotency_key, request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid, ${record.nameType}::text,
								${record.displayName}::text, ${record.normalizedName}::text, ${record.isPrimary ? 1 : 0}::int,
								${record.effectiveFrom}::date, ${record.effectiveTo}::date,
								${record.supersedesCompanyNameId}::uuid, ${record.correctionReason}::text,
								${record.idempotencyKey}::text, ${record.requestFingerprint}::text, 1,
								${record.createdBy}::text, ${record.updatedBy}::text
							WHERE NOT EXISTS (
								SELECT 1 FROM ca_company_name existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.idempotency_key = ${record.idempotencyKey}
							)
							RETURNING *
						),
						${companyRegistryFactsCtes(sql, "inserted", audit, outbox)}
						SELECT inserted.* FROM inserted, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await store.findCompanyNameReceipt(
						record.organizationId,
						record.idempotencyKey,
					);
					if (!replay.ok) return replay;
					if (replay.data) {
						if (replay.data.requestFingerprint !== record.requestFingerprint) {
							return idempotencyFingerprintConflict({
								organizationId: record.organizationId,
								idempotencyKey: record.idempotencyKey,
							});
						}
						return ok(replay.data.result);
					}
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.codeConflict,
						message: "Failed to add company name",
					});
				}
				return ok(mapName(row));
			} catch (error) {
				return mapStoreError(error, "Failed to add company name");
			}
		},

		async endCompanyName(
			organizationId,
			companyNameId,
			expectedVersion,
			effectiveTo,
			_reason,
			context,
			meta,
		) {
			try {
				const existingResult = await store.findCompanyNameById(
					organizationId,
					companyNameId,
				);
				if (!existingResult.ok) return existingResult;
				if (!existingResult.data) {
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
						message: "Company name not found",
					});
				}
				if (existingResult.data.version !== expectedVersion) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: companyNameId,
						expectedVersion,
					});
				}
				const updatedBy = meta.actorUserId;
				const nextVersion = expectedVersion + 1;
				const { audit, outbox } = await bufferCompanyRegistryFacts(context, meta, {
					aggregateType: "company_name",
					aggregateId: existingResult.data.id,
					legalCompanyId: existingResult.data.legalCompanyId,
					action: "UPDATE",
					beforeVersion: existingResult.data.version,
					afterVersion: nextVersion,
					changedFields: ["effectiveTo"],
					code: meta.legalCompanyCode ?? "",
					status: "draft",
				});
				const [rows] = await runNeonHttpTransaction<[NameRow[]]>((sql) => [
					sql`
						WITH updated AS (
							UPDATE ca_company_name
							SET
								effective_to = ${effectiveTo}::date,
								version = ${nextVersion},
								updated_by = ${updatedBy}::text,
								updated_at = now()
							WHERE organization_id = ${organizationId}
								AND id = ${companyNameId}
								AND version = ${expectedVersion}
							RETURNING *
						),
						${companyRegistryFactsCtes(sql, "updated", audit, outbox)}
						SELECT updated.* FROM updated, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: companyNameId,
						expectedVersion,
					});
				}
				return ok(mapName(row));
			} catch (error) {
				return mapStoreError(error, "Failed to end company name");
			}
		},

		async hasOverlappingCompanyName(
			organizationId,
			legalCompanyId,
			nameType,
			effectiveFrom,
			effectiveTo,
			excludeCompanyNameId,
		) {
			try {
				const rows = await db
					.select()
					.from(caCompanyName)
					.where(
						and(
							eq(caCompanyName.organizationId, organizationId),
							eq(caCompanyName.legalCompanyId, legalCompanyId),
							eq(caCompanyName.nameType, nameType),
						),
					);
				const names = rows
					.map(mapName)
					.filter(
						(row) =>
							excludeCompanyNameId === undefined ||
							row.id !== excludeCompanyNameId,
					);
				return ok(hasOverlappingRange(names, { effectiveFrom, effectiveTo }));
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to check overlapping company name",
				);
			}
		},

		async countEffectivePrimaryLegalNames(
			organizationId,
			legalCompanyId,
			asOf,
		) {
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
				const asOfDate = asOf.slice(0, 10);
				const count = rows
					.map(mapName)
					.filter((row) => isEffectivePrimaryLegalName(row, asOfDate)).length;
				return ok(count);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to count effective primary legal names",
				);
			}
		},

		async listCompanyNames(filter) {
			try {
				const rows = await db
					.select()
					.from(caCompanyName)
					.where(
						and(
							eq(caCompanyName.organizationId, filter.organizationId),
							eq(caCompanyName.legalCompanyId, filter.legalCompanyId),
						),
					);
				return ok(applyCompanyNameListFilter(rows.map(mapName), filter));
			} catch (error) {
				return failFromUnknown(error, "Failed to list company names");
			}
		},

		async findCompanyIdentifierById(organizationId, companyIdentifierId) {
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
				return ok(rows[0] ? mapIdentifier(rows[0]) : null);
			} catch (error) {
				return failFromUnknown(error, "Failed to get company identifier");
			}
		},

		async findCompanyIdentifierReceipt(organizationId, idempotencyKey) {
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
				return ok(
					rows[0]
						? toCompanyIdentifierMutationReceipt(mapIdentifier(rows[0]))
						: null,
				);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to load company identifier receipt",
				);
			}
		},

		async findActiveIdentifierConflict(
			organizationId,
			identifierType,
			normalizedIdentifierValue,
			excludeCompanyIdentifierId,
		) {
			try {
				const rows = await db
					.select()
					.from(caCompanyIdentifier)
					.where(
						and(
							eq(caCompanyIdentifier.organizationId, organizationId),
							eq(caCompanyIdentifier.identifierType, identifierType),
							eq(
								caCompanyIdentifier.normalizedIdentifierValue,
								normalizedIdentifierValue,
							),
							eq(caCompanyIdentifier.status, "active"),
						),
					);
				const conflict = rows
					.map(mapIdentifier)
					.find(
						(row) =>
							excludeCompanyIdentifierId === undefined ||
							row.id !== excludeCompanyIdentifierId,
					);
				return ok(conflict ?? null);
			} catch (error) {
				return failFromUnknown(
					error,
					"Failed to find active identifier conflict",
				);
			}
		},

		async createCompanyIdentifier(record, context, meta) {
			const id = record.id ?? randomUUID();
			const { audit, outbox } = await bufferCompanyRegistryFacts(context, meta, {
				aggregateType: "company_identifier",
				aggregateId: id,
				legalCompanyId: record.legalCompanyId,
				action: "CREATE",
				beforeVersion: null,
				afterVersion: 1,
				code: meta.legalCompanyCode ?? "",
				status: "draft",
			});
			try {
				const [, rows] = await runNeonHttpTransaction<
					[unknown[], IdentifierRow[]]
				>((sql) => [
					sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${record.organizationId}:${record.identifierType}:${record.normalizedIdentifierValue}`}, 0))`,
					sql`
						WITH inserted AS (
							INSERT INTO ca_company_identifier (
								id, organization_id, legal_company_id, identifier_type,
								jurisdiction_country_id, authority_party_id, identifier_value,
								normalized_identifier_value, is_primary, status, effective_from,
								effective_to, idempotency_key, request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${id}::uuid, ${record.organizationId}::text, ${record.legalCompanyId}::uuid, ${record.identifierType}::text,
								${record.jurisdictionCountryId}::uuid, ${record.authorityPartyId}::uuid, ${record.identifierValue}::text,
								${record.normalizedIdentifierValue}::text, ${record.isPrimary ? 1 : 0}::int, ${record.status}::text,
								${record.effectiveFrom}::date, ${record.effectiveTo}::date, ${record.idempotencyKey}::text,
								${record.requestFingerprint}::text, 1, ${record.createdBy}::text, ${record.updatedBy}::text
							WHERE NOT EXISTS (
								SELECT 1 FROM ca_company_identifier existing
								WHERE existing.organization_id = ${record.organizationId}
									AND (
										existing.idempotency_key = ${record.idempotencyKey}
										OR (
											existing.identifier_type = ${record.identifierType}
											AND existing.normalized_identifier_value = ${record.normalizedIdentifierValue}
										)
									)
							)
							RETURNING *
						),
						${companyRegistryFactsCtes(sql, "inserted", audit, outbox)}
						SELECT inserted.* FROM inserted, audited, emitted
					`,
				]);
				const row = rows[0];
				if (!row) {
					const replay = await store.findCompanyIdentifierReceipt(
						record.organizationId,
						record.idempotencyKey,
					);
					if (!replay.ok) return replay;
					if (replay.data) {
						if (replay.data.requestFingerprint !== record.requestFingerprint) {
							return idempotencyFingerprintConflict({
								organizationId: record.organizationId,
								idempotencyKey: record.idempotencyKey,
							});
						}
						return ok(replay.data.result);
					}
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.identifierConflict,
						message: "Identifier already exists",
					});
				}
				return ok(mapIdentifier(row));
			} catch (error) {
				return mapStoreError(error, "Failed to add identifier");
			}
		},

		async updateCompanyIdentifier(
			organizationId,
			companyIdentifierId,
			expectedVersion,
			patch,
			context,
			meta,
		) {
			try {
				const existingResult = await store.findCompanyIdentifierById(
					organizationId,
					companyIdentifierId,
				);
				if (!existingResult.ok) return existingResult;
				if (!existingResult.data) {
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
						message: "Company identifier not found",
					});
				}
				if (existingResult.data.version !== expectedVersion) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: companyIdentifierId,
						expectedVersion,
					});
				}
				const merged = mergeCompanyIdentifierUpdatePatch(
					existingResult.data,
					patch,
				);
				const { audit, outbox } = await bufferCompanyRegistryFacts(context, meta, {
					aggregateType: "company_identifier",
					aggregateId: merged.id,
					legalCompanyId: merged.legalCompanyId,
					action: "UPDATE",
					beforeVersion: existingResult.data.version,
					afterVersion: merged.version,
					changedFields: Object.keys(patch),
					code: meta.legalCompanyCode ?? "",
					status: "draft",
				});
				const [rows] = await runNeonHttpTransaction<[IdentifierRow[]]>(
					(sql) => [
						sql`
							WITH updated AS (
								UPDATE ca_company_identifier
								SET
									jurisdiction_country_id = ${merged.jurisdictionCountryId}::uuid,
									authority_party_id = ${merged.authorityPartyId}::uuid,
									identifier_value = ${merged.identifierValue}::text,
									normalized_identifier_value = ${merged.normalizedIdentifierValue}::text,
									is_primary = ${merged.isPrimary ? 1 : 0}::int,
									status = ${merged.status}::text,
									effective_from = ${merged.effectiveFrom}::date,
									effective_to = ${merged.effectiveTo}::date,
									version = ${merged.version},
									updated_by = ${merged.updatedBy}::text,
									updated_at = ${merged.updatedAt}::timestamptz
								WHERE organization_id = ${organizationId}
									AND id = ${companyIdentifierId}
									AND version = ${expectedVersion}
								RETURNING *
							),
							${companyRegistryFactsCtes(sql, "updated", audit, outbox)}
							SELECT updated.* FROM updated, audited, emitted
						`,
					],
				);
				const row = rows[0];
				if (!row) {
					throw new CorporateAdministrationVersionConflictError({
						organizationId,
						aggregateId: companyIdentifierId,
						expectedVersion,
					});
				}
				return ok(mapIdentifier(row));
			} catch (error) {
				return mapStoreError(error, "Failed to update company identifier");
			}
		},

		async listCompanyIdentifiers(filter) {
			try {
				const rows = await db
					.select()
					.from(caCompanyIdentifier)
					.where(
						and(
							eq(caCompanyIdentifier.organizationId, filter.organizationId),
							eq(caCompanyIdentifier.legalCompanyId, filter.legalCompanyId),
						),
					);
				return ok(
					applyCompanyIdentifierListFilter(rows.map(mapIdentifier), filter),
				);
			} catch (error) {
				return failFromUnknown(error, "Failed to list identifiers");
			}
		},
	};
	return store;
}
