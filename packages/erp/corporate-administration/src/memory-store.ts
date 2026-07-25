import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import {
	caCompanyIdentifierIdSchema,
	caCompanyNameIdSchema,
	caLegalCompanyIdSchema,
} from "./brands";
import type {
	CaCompanyIdentifier,
	CaCompanyName,
	CaCompanyStatusHistory,
	CaLegalCompany,
	CaLegalCompanyStatus,
} from "./company/types";
import type { CorporateAdministrationStore } from "./ports";
import {
	appendCompanyRegistryFacts,
	type CompanyRegistryFactsInput,
} from "./shared/company-mutation-facts";
import type { CorporateAdministrationUnitOfWorkContext } from "./unit-of-work";
import { CorporateAdministrationUnitOfWorkError } from "./unit-of-work";
import { isEffectivePrimaryLegalName } from "./shared/activation-readiness";
import { resolveStatusAsOf } from "./shared/as-of";
import {
	filterEffectiveAsOf,
	hasOverlappingRange,
} from "./shared/effective-range";
import { idempotencyFingerprintConflict } from "./shared/idempotency-replay";
import {
	toCompanyIdentifierMutationReceipt,
	toCompanyNameMutationReceipt,
	toLegalCompanyMutationReceipt,
} from "./shared/mutation-receipts";
import { paginateLegalCompanies } from "./shared/paginate-companies";
import {
	CORPORATE_ADMINISTRATION_STORE_ERROR_CODES,
	CorporateAdministrationStoreError,
	CorporateAdministrationVersionConflictError,
	isCorporateAdministrationStoreError,
	mapCorporateAdministrationStoreError,
} from "./store/store-errors";
import { MemorySlicesStore } from "./slices-memory-store";
import type {
	CompanyIdentifierCreateRecord,
	CompanyIdentifierListFilter,
	CompanyIdentifierUpdatePatch,
	CompanyNameCreateRecord,
	CompanyNameListFilter,
	CompanyStatusHistoryListFilter,
	CorporateAdministrationMutationMeta,
	CorporateAdministrationMutationReceipt,
	LegalCompanyActivationFacts,
	LegalCompanyCreateRecord,
	LegalCompanyListFilter,
	LegalCompanyStatusTransitionRecord,
	LegalCompanyTransitionPatch,
	LegalCompanyUpdatePatch,
} from "./store/company-store";

function mapStoreError<T>(error: unknown): Result<T> {
	if (isCorporateAdministrationStoreError(error)) {
		return mapCorporateAdministrationStoreError(error);
	}
	throw error;
}

async function recordRegistryFactsOrFail(
	context: CorporateAdministrationUnitOfWorkContext,
	meta: CorporateAdministrationMutationMeta,
	input: CompanyRegistryFactsInput,
): Promise<Result<void>> {
	try {
		await appendCompanyRegistryFacts(context, meta, input);
		return ok(undefined);
	} catch (error) {
		if (error instanceof CorporateAdministrationUnitOfWorkError) {
			throw error;
		}
		if (isCorporateAdministrationStoreError(error)) {
			return mapCorporateAdministrationStoreError(error);
		}
		throw error;
	}
}

function cloneCompany(company: CaLegalCompany): CaLegalCompany {
	return structuredClone(company);
}

function cloneName(name: CaCompanyName): CaCompanyName {
	return structuredClone(name);
}

function cloneIdentifier(identifier: CaCompanyIdentifier): CaCompanyIdentifier {
	return structuredClone(identifier);
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

export class MemoryCorporateAdministrationStore
	extends MemorySlicesStore
	implements CorporateAdministrationStore
{
	private readonly companies = new Map<string, CaLegalCompany>();
	private readonly names = new Map<string, CaCompanyName>();
	private readonly identifiers = new Map<string, CaCompanyIdentifier>();
	private readonly statusHistory = new Map<string, CaCompanyStatusHistory>();

	async findLegalCompanyById(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompany | null>> {
		return this.getLegalCompany(organizationId, legalCompanyId);
	}

	async getLegalCompany(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompany | null>> {
		const company = this.companies.get(legalCompanyId);
		if (!company || company.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneCompany(company));
	}

	async findLegalCompanyByNormalizedCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<CaLegalCompany | null>> {
		for (const company of this.companies.values()) {
			if (
				company.organizationId === organizationId &&
				company.normalizedCode === normalizedCode
			) {
				return ok(cloneCompany(company));
			}
		}
		return ok(null);
	}

	async findLegalCompanyByDimensionId(
		organizationId: string,
		legalEntityDimensionId: string,
	): Promise<Result<CaLegalCompany | null>> {
		for (const company of this.companies.values()) {
			if (
				company.organizationId === organizationId &&
				company.legalEntityDimensionId === legalEntityDimensionId
			) {
				return ok(cloneCompany(company));
			}
		}
		return ok(null);
	}

	async findCreateLegalCompanyReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<
		Result<CorporateAdministrationMutationReceipt<CaLegalCompany> | null>
	> {
		for (const company of this.companies.values()) {
			if (
				company.organizationId === organizationId &&
				company.createIdempotencyKey === idempotencyKey
			) {
				return ok(toLegalCompanyMutationReceipt(cloneCompany(company)));
			}
		}
		return ok(null);
	}

	async listLegalCompanies(
		filter: LegalCompanyListFilter,
	): Promise<Result<import("./company/types").CaLegalCompanyListPage>> {
		const items = [...this.companies.values()].filter(
			(company) => company.organizationId === filter.organizationId,
		);
		const page = paginateLegalCompanies(items, {
			status: filter.status,
			normalizedQuery: filter.normalizedQuery,
			cursor: filter.cursor,
			limit: filter.limit,
		});
		return ok({
			...page,
			items: page.items.map(cloneCompany),
		});
	}

	async getLegalCompanyStatusAsOf(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
	): Promise<Result<CaLegalCompanyStatus | null>> {
		const companyResult = await this.getLegalCompany(
			organizationId,
			legalCompanyId,
		);
		if (!companyResult.ok) return companyResult;
		if (!companyResult.data) return ok(null);
		const historyResult = await this.listCompanyStatusHistory({
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
	}

	async loadLegalCompanyActivationFacts(
		organizationId: string,
		legalCompanyId: string,
		asOfDate: string,
	): Promise<Result<LegalCompanyActivationFacts | null>> {
		const companyResult = await this.getLegalCompany(
			organizationId,
			legalCompanyId,
		);
		if (!companyResult.ok) return companyResult;
		if (!companyResult.data) return ok(null);
		const asOf = asOfDate.slice(0, 10);
		const namesResult = await this.listCompanyNames({
			organizationId,
			legalCompanyId: companyResult.data.id,
			asOf,
		});
		if (!namesResult.ok) return namesResult;
		const identifiersResult = await this.listCompanyIdentifiers({
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
		});
	}

	async createLegalCompany(
		record: LegalCompanyCreateRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaLegalCompany>> {
		try {
			for (const existing of this.companies.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.createIdempotencyKey === record.createIdempotencyKey
				) {
					if (
						existing.createRequestFingerprint !==
						record.createRequestFingerprint
					) {
						return idempotencyFingerprintConflict({
							organizationId: record.organizationId,
							idempotencyKey: record.createIdempotencyKey,
						});
					}
					return ok(cloneCompany(existing));
				}
				if (
					existing.organizationId === record.organizationId &&
					existing.normalizedCode === record.normalizedCode
				) {
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.codeConflict,
						message: "Company code already exists",
					});
				}
				if (
					existing.organizationId === record.organizationId &&
					existing.legalEntityDimensionId === record.legalEntityDimensionId
				) {
					throw new CorporateAdministrationStoreError({
						code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.dimensionConflict,
						message: "Legal entity dimension already bound",
					});
				}
			}
			const now = record.createdAt ?? new Date();
			const company: CaLegalCompany = {
				id: caLegalCompanyIdSchema.parse(record.id ?? randomUUID()),
				organizationId: record.organizationId,
				code: record.code,
				normalizedCode: record.normalizedCode,
				legalEntityDimensionId: record.legalEntityDimensionId,
				legalEntityKeySnapshot: record.legalEntityKeySnapshot,
				legalEntityNameSnapshot: record.legalEntityNameSnapshot,
				legalPartyId: record.legalPartyId,
				legalPartyCodeSnapshot: record.legalPartyCodeSnapshot,
				legalPartyNameSnapshot: record.legalPartyNameSnapshot,
				jurisdictionCountryId: record.jurisdictionCountryId,
				legalFormCode: record.legalFormCode,
				legalFormNameSnapshot: record.legalFormNameSnapshot,
				incorporationDate: record.incorporationDate,
				commencementDate: record.commencementDate,
				fiscalYearEndMonth: record.fiscalYearEndMonth,
				fiscalYearEndDay: record.fiscalYearEndDay,
				status: record.status,
				version: record.version,
				createIdempotencyKey: record.createIdempotencyKey,
				createRequestFingerprint: record.createRequestFingerprint,
				createdBy: record.createdBy,
				updatedBy: record.updatedBy,
				activatedAt: null,
				activatedBy: null,
				suspendedAt: null,
				suspendedBy: null,
				dissolvedAt: null,
				dissolvedBy: null,
				archivedAt: null,
				archivedBy: null,
				createdAt: now,
				updatedAt: record.updatedAt ?? now,
			};
			const recorded = await recordRegistryFactsOrFail(context, meta, {
				aggregateType: "legal_company",
				aggregateId: company.id,
				legalCompanyId: company.id,
				action: "CREATE",
				beforeVersion: null,
				afterVersion: company.version,
				code: company.code,
				status: company.status,
			});
			if (!recorded.ok) return recorded;
			this.companies.set(company.id, company);
			return ok(cloneCompany(company));
		} catch (error) {
			return mapStoreError(error);
		}
	}

	async updateLegalCompany(
		organizationId: string,
		legalCompanyId: string,
		expectedVersion: number,
		patch: LegalCompanyUpdatePatch,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaLegalCompany | null>> {
		try {
			const existing = this.companies.get(legalCompanyId);
			if (!existing || existing.organizationId !== organizationId) {
				throw new CorporateAdministrationStoreError({
					code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
					message: "Legal company not found",
				});
			}
			if (existing.version !== expectedVersion) {
				throw new CorporateAdministrationVersionConflictError({
					organizationId,
					aggregateId: legalCompanyId,
					expectedVersion,
				});
			}
			const updated: CaLegalCompany = {
				...existing,
				...patch,
				version: existing.version + 1,
				updatedAt: patch.updatedAt ?? new Date(),
			};
			const recorded = await recordRegistryFactsOrFail(context, meta, {
				aggregateType: "legal_company",
				aggregateId: updated.id,
				legalCompanyId: updated.id,
				action: "UPDATE",
				beforeVersion: existing.version,
				afterVersion: updated.version,
				code: updated.code,
				status: updated.status,
			});
			if (!recorded.ok) return recorded;
			this.companies.set(updated.id, updated);
			return ok(cloneCompany(updated));
		} catch (error) {
			return mapStoreError(error);
		}
	}

	async transitionLegalCompany(
		organizationId: string,
		legalCompanyId: string,
		expectedVersion: number,
		patch: LegalCompanyTransitionPatch,
		history: LegalCompanyStatusTransitionRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaLegalCompany | null>> {
		try {
			const existing = this.companies.get(legalCompanyId);
			if (!existing || existing.organizationId !== organizationId) {
				throw new CorporateAdministrationStoreError({
					code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
					message: "Legal company not found",
				});
			}
			if (existing.version !== expectedVersion) {
				throw new CorporateAdministrationVersionConflictError({
					organizationId,
					aggregateId: legalCompanyId,
					expectedVersion,
				});
			}
			const updated: CaLegalCompany = {
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
			const recorded = await recordRegistryFactsOrFail(context, meta, {
				aggregateType: "legal_company",
				aggregateId: updated.id,
				legalCompanyId: updated.id,
				action: "UPDATE",
				beforeVersion: existing.version,
				afterVersion: updated.version,
				code: updated.code,
				status: updated.status,
			});
			if (!recorded.ok) return recorded;
			this.companies.set(updated.id, updated);
			const historyRow: CaCompanyStatusHistory = {
				id: history.id ?? randomUUID(),
				organizationId: history.organizationId,
				legalCompanyId: history.legalCompanyId,
				fromStatus: history.fromStatus,
				toStatus: history.toStatus,
				effectiveAt: history.effectiveAt,
				reasonCode: history.reasonCode,
				reason: history.reason,
				resolutionReference: history.resolutionReference,
				evidenceDocumentReference: history.evidenceDocumentReference,
				correlationId: history.correlationId,
				causationId: history.causationId,
				actorUserId: history.actorUserId,
				idempotencyKey: history.idempotencyKey,
				requestFingerprint: history.requestFingerprint,
				createdAt: history.createdAt ?? new Date(),
			};
			this.statusHistory.set(historyRow.id, historyRow);
			return ok(cloneCompany(updated));
		} catch (error) {
			return mapStoreError(error);
		}
	}

	async findCompanyNameById(
		organizationId: string,
		companyNameId: string,
	): Promise<Result<CaCompanyName | null>> {
		const row = this.names.get(companyNameId);
		if (!row || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneName(row));
	}

	async findCompanyNameReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<
		Result<CorporateAdministrationMutationReceipt<CaCompanyName> | null>
	> {
		for (const row of this.names.values()) {
			if (
				row.organizationId === organizationId &&
				row.idempotencyKey === idempotencyKey
			) {
				return ok(toCompanyNameMutationReceipt(cloneName(row)));
			}
		}
		return ok(null);
	}

	async createCompanyName(
		record: CompanyNameCreateRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyName>> {
		for (const existing of this.names.values()) {
			if (
				existing.organizationId === record.organizationId &&
				existing.idempotencyKey === record.idempotencyKey
			) {
				if (existing.requestFingerprint !== record.requestFingerprint) {
					return idempotencyFingerprintConflict({
						organizationId: record.organizationId,
						idempotencyKey: record.idempotencyKey,
					});
				}
				return ok(cloneName(existing));
			}
		}
		const now = record.createdAt ?? new Date();
		const row: CaCompanyName = {
			id: caCompanyNameIdSchema.parse(record.id ?? randomUUID()),
			organizationId: record.organizationId,
			legalCompanyId: record.legalCompanyId,
			nameType: record.nameType,
			displayName: record.displayName,
			normalizedName: record.normalizedName,
			isPrimary: record.isPrimary,
			effectiveFrom: record.effectiveFrom,
			effectiveTo: record.effectiveTo,
			supersedesCompanyNameId: record.supersedesCompanyNameId,
			correctionReason: record.correctionReason,
			idempotencyKey: record.idempotencyKey,
			requestFingerprint: record.requestFingerprint,
			version: record.version,
			createdBy: record.createdBy,
			updatedBy: record.updatedBy,
			createdAt: now,
			updatedAt: record.updatedAt ?? now,
		};
		const recorded = await recordRegistryFactsOrFail(context, meta, {
				aggregateType: "company_name",
				aggregateId: row.id,
				legalCompanyId: row.legalCompanyId,
				action: "CREATE",
				beforeVersion: null,
				afterVersion: row.version,
				code: meta.legalCompanyCode ?? "",
				status: "draft",
		});
		if (!recorded.ok) return recorded;
		this.names.set(row.id, row);
		return ok(cloneName(row));
	}

	async endCompanyName(
		organizationId: string,
		companyNameId: string,
		expectedVersion: number,
		effectiveTo: string,
		_reason: string | null,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyName | null>> {
		try {
			const existing = this.names.get(companyNameId);
			if (!existing || existing.organizationId !== organizationId) {
				throw new CorporateAdministrationStoreError({
					code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
					message: "Company name not found",
				});
			}
			if (existing.version !== expectedVersion) {
				throw new CorporateAdministrationVersionConflictError({
					organizationId,
					aggregateId: companyNameId,
					expectedVersion,
				});
			}
			const updated: CaCompanyName = {
				...existing,
				effectiveTo,
				version: existing.version + 1,
				updatedBy: meta.actorUserId,
				updatedAt: new Date(),
			};
			const recorded = await recordRegistryFactsOrFail(context, meta, {
				aggregateType: "company_name",
				aggregateId: updated.id,
				legalCompanyId: updated.legalCompanyId,
				action: "UPDATE",
				beforeVersion: existing.version,
				afterVersion: updated.version,
				code: meta.legalCompanyCode ?? "",
				status: "draft",
			});
			if (!recorded.ok) return recorded;
			this.names.set(updated.id, updated);
			return ok(cloneName(updated));
		} catch (error) {
			return mapStoreError(error);
		}
	}

	async hasOverlappingCompanyName(
		organizationId: string,
		legalCompanyId: string,
		nameType: CaCompanyName["nameType"],
		effectiveFrom: string,
		effectiveTo: string | null,
		excludeCompanyNameId?: string,
	): Promise<Result<boolean>> {
		const names = [...this.names.values()].filter(
			(row) =>
				row.organizationId === organizationId &&
				row.legalCompanyId === legalCompanyId &&
				row.nameType === nameType &&
				(excludeCompanyNameId === undefined || row.id !== excludeCompanyNameId),
		);
		return ok(hasOverlappingRange(names, { effectiveFrom, effectiveTo }));
	}

	async countEffectivePrimaryLegalNames(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
	): Promise<Result<number>> {
		const asOfDate = asOf.slice(0, 10);
		const count = [...this.names.values()].filter(
			(row) =>
				row.organizationId === organizationId &&
				row.legalCompanyId === legalCompanyId &&
				isEffectivePrimaryLegalName(row, asOfDate),
		).length;
		return ok(count);
	}

	async listCompanyNames(
		filter: CompanyNameListFilter,
	): Promise<Result<readonly CaCompanyName[]>> {
		return ok(
			applyCompanyNameListFilter([...this.names.values()], filter).map(
				cloneName,
			),
		);
	}

	async findCompanyIdentifierById(
		organizationId: string,
		companyIdentifierId: string,
	): Promise<Result<CaCompanyIdentifier | null>> {
		const row = this.identifiers.get(companyIdentifierId);
		if (!row || row.organizationId !== organizationId) {
			return ok(null);
		}
		return ok(cloneIdentifier(row));
	}

	async findCompanyIdentifierReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<
		Result<CorporateAdministrationMutationReceipt<CaCompanyIdentifier> | null>
	> {
		for (const row of this.identifiers.values()) {
			if (
				row.organizationId === organizationId &&
				row.idempotencyKey === idempotencyKey
			) {
				return ok(toCompanyIdentifierMutationReceipt(cloneIdentifier(row)));
			}
		}
		return ok(null);
	}

	async findActiveIdentifierConflict(
		organizationId: string,
		identifierType: string,
		normalizedIdentifierValue: string,
		excludeCompanyIdentifierId?: string,
	): Promise<Result<CaCompanyIdentifier | null>> {
		for (const existing of this.identifiers.values()) {
			if (
				existing.organizationId === organizationId &&
				existing.identifierType === identifierType &&
				existing.normalizedIdentifierValue === normalizedIdentifierValue &&
				existing.status === "active" &&
				(excludeCompanyIdentifierId === undefined ||
					existing.id !== excludeCompanyIdentifierId)
			) {
				return ok(cloneIdentifier(existing));
			}
		}
		return ok(null);
	}

	async createCompanyIdentifier(
		record: CompanyIdentifierCreateRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyIdentifier>> {
		try {
			for (const existing of this.identifiers.values()) {
				if (
					existing.organizationId === record.organizationId &&
					existing.idempotencyKey === record.idempotencyKey
				) {
					if (existing.requestFingerprint !== record.requestFingerprint) {
						return idempotencyFingerprintConflict({
							organizationId: record.organizationId,
							idempotencyKey: record.idempotencyKey,
						});
					}
					return ok(cloneIdentifier(existing));
				}
			}
			const conflict = await this.findActiveIdentifierConflict(
				record.organizationId,
				record.identifierType,
				record.normalizedIdentifierValue,
			);
			if (!conflict.ok) return conflict;
			if (conflict.data) {
				throw new CorporateAdministrationStoreError({
					code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.identifierConflict,
					message: "Identifier already exists",
				});
			}
			const now = record.createdAt ?? new Date();
			const row: CaCompanyIdentifier = {
				id: caCompanyIdentifierIdSchema.parse(record.id ?? randomUUID()),
				organizationId: record.organizationId,
				legalCompanyId: record.legalCompanyId,
				identifierType: record.identifierType,
				jurisdictionCountryId: record.jurisdictionCountryId,
				authorityPartyId: record.authorityPartyId,
				identifierValue: record.identifierValue,
				normalizedIdentifierValue: record.normalizedIdentifierValue,
				isPrimary: record.isPrimary,
				status: record.status,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				idempotencyKey: record.idempotencyKey,
				requestFingerprint: record.requestFingerprint,
				version: record.version,
				createdBy: record.createdBy,
				updatedBy: record.updatedBy,
				createdAt: now,
				updatedAt: record.updatedAt ?? now,
			};
			const recorded = await recordRegistryFactsOrFail(context, meta, {
				aggregateType: "company_identifier",
				aggregateId: row.id,
				legalCompanyId: row.legalCompanyId,
				action: "CREATE",
				beforeVersion: null,
				afterVersion: row.version,
				code: meta.legalCompanyCode ?? "",
				status: "draft",
			});
			if (!recorded.ok) return recorded;
			this.identifiers.set(row.id, row);
			return ok(cloneIdentifier(row));
		} catch (error) {
			return mapStoreError(error);
		}
	}

	async updateCompanyIdentifier(
		organizationId: string,
		companyIdentifierId: string,
		expectedVersion: number,
		patch: CompanyIdentifierUpdatePatch,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyIdentifier | null>> {
		try {
			const existing = this.identifiers.get(companyIdentifierId);
			if (!existing || existing.organizationId !== organizationId) {
				throw new CorporateAdministrationStoreError({
					code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound,
					message: "Company identifier not found",
				});
			}
			if (existing.version !== expectedVersion) {
				throw new CorporateAdministrationVersionConflictError({
					organizationId,
					aggregateId: companyIdentifierId,
					expectedVersion,
				});
			}
			const updated: CaCompanyIdentifier = {
				...existing,
				...patch,
				version: existing.version + 1,
				updatedAt: patch.updatedAt ?? new Date(),
			};
			const recorded = await recordRegistryFactsOrFail(context, meta, {
				aggregateType: "company_identifier",
				aggregateId: updated.id,
				legalCompanyId: updated.legalCompanyId,
				action: "UPDATE",
				beforeVersion: existing.version,
				afterVersion: updated.version,
				code: meta.legalCompanyCode ?? "",
				status: updated.status,
			});
			if (!recorded.ok) return recorded;
			this.identifiers.set(updated.id, updated);
			return ok(cloneIdentifier(updated));
		} catch (error) {
			return mapStoreError(error);
		}
	}

	async listCompanyIdentifiers(
		filter: CompanyIdentifierListFilter,
	): Promise<Result<readonly CaCompanyIdentifier[]>> {
		return ok(
			applyCompanyIdentifierListFilter(
				[...this.identifiers.values()],
				filter,
			).map(cloneIdentifier),
		);
	}

	async findStatusHistoryByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyStatusHistory | null>> {
		for (const row of this.statusHistory.values()) {
			if (
				row.organizationId === organizationId &&
				row.idempotencyKey === idempotencyKey
			) {
				return ok(structuredClone(row));
			}
		}
		return ok(null);
	}

	async listCompanyStatusHistory(
		filter: CompanyStatusHistoryListFilter,
	): Promise<Result<readonly CaCompanyStatusHistory[]>> {
		return ok(
			[...this.statusHistory.values()]
				.filter(
					(row) =>
						row.organizationId === filter.organizationId &&
						row.legalCompanyId === filter.legalCompanyId,
				)
				.sort((a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()),
		);
	}
}

export function createMemoryCorporateAdministrationStore(): MemoryCorporateAdministrationStore {
	return new MemoryCorporateAdministrationStore();
}
