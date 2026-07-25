import type { Result } from "@afenda/errors/result";
import type { CorporateAdministrationEventType } from "@afenda/events/schemas";
import type { CaLegalCompanyId } from "../brands";
import type {
	CaCompanyIdentifier,
	CaCompanyIdentifierStatus,
	CaCompanyName,
	CaCompanyNameType,
	CaCompanyStatusHistory,
	CaLegalCompany,
	CaLegalCompanyListPage,
	CaLegalCompanyStatus,
} from "../company/types";
import type { CorporateAdministrationUnitOfWorkContext } from "../unit-of-work";

export type CorporateAdministrationMutationMeta = {
	readonly organizationId: string;
	readonly actorUserId: string;
	readonly correlationId: string;
	readonly causationId: string | null;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly occurredAt: string;
	readonly eventType: CorporateAdministrationEventType;
	readonly legalCompanyCode?: string;
};

export type CorporateAdministrationMutationReceipt<TResult> = {
	readonly organizationId: string;
	readonly operationId: string;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly result: TResult;
	readonly createdAt: Date;
};

export type LegalCompanyCreateRecord = {
	readonly id?: CaLegalCompanyId;
	readonly organizationId: string;
	readonly code: string;
	readonly normalizedCode: string;
	readonly legalEntityDimensionId: string;
	readonly legalEntityKeySnapshot: string;
	readonly legalEntityNameSnapshot: string;
	readonly legalPartyId: string | null;
	readonly legalPartyCodeSnapshot: string | null;
	readonly legalPartyNameSnapshot: string | null;
	readonly jurisdictionCountryId: string | null;
	readonly legalFormCode: string | null;
	readonly legalFormNameSnapshot: string | null;
	readonly incorporationDate: string | null;
	readonly commencementDate: string | null;
	readonly fiscalYearEndMonth: number | null;
	readonly fiscalYearEndDay: number | null;
	readonly status: "draft";
	readonly version: 1;
	readonly createIdempotencyKey: string;
	readonly createRequestFingerprint: string;
	readonly createdBy: string;
	readonly updatedBy: string;
	readonly createdAt?: Date;
	readonly updatedAt?: Date;
};

export type LegalCompanyUpdatePatch = {
	readonly code?: string;
	readonly normalizedCode?: string;
	readonly legalPartyId?: string | null;
	readonly legalPartyCodeSnapshot?: string | null;
	readonly legalPartyNameSnapshot?: string | null;
	readonly jurisdictionCountryId?: string | null;
	readonly legalFormCode?: string | null;
	readonly legalFormNameSnapshot?: string | null;
	readonly incorporationDate?: string | null;
	readonly commencementDate?: string | null;
	readonly fiscalYearEndMonth?: number | null;
	readonly fiscalYearEndDay?: number | null;
	readonly updatedBy: string;
	readonly updatedAt?: Date;
};

export type LegalCompanyStatusTransitionRecord = {
	readonly id?: string;
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly fromStatus: CaLegalCompanyStatus | null;
	readonly toStatus: CaLegalCompanyStatus;
	readonly effectiveAt: Date;
	readonly reasonCode: string | null;
	readonly reason: string | null;
	readonly resolutionReference: string | null;
	readonly evidenceDocumentReference: string | null;
	readonly actorUserId: string;
	readonly correlationId: string;
	readonly causationId: string | null;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly createdAt?: Date;
};

export type LegalCompanyTransitionPatch = {
	readonly status: CaLegalCompanyStatus;
	readonly activatedAt?: Date | null;
	readonly activatedBy?: string | null;
	readonly suspendedAt?: Date | null;
	readonly suspendedBy?: string | null;
	readonly dissolvedAt?: Date | null;
	readonly dissolvedBy?: string | null;
	readonly archivedAt?: Date | null;
	readonly archivedBy?: string | null;
	readonly updatedBy: string;
	readonly updatedAt?: Date;
};

export type CompanyNameCreateRecord = {
	readonly id?: CaCompanyName["id"];
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly nameType: CaCompanyNameType;
	readonly displayName: string;
	readonly normalizedName: string;
	readonly isPrimary: boolean;
	readonly effectiveFrom: string;
	readonly effectiveTo: string | null;
	readonly supersedesCompanyNameId: CaCompanyName["id"] | null;
	readonly correctionReason: string | null;
	readonly version: 1;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly createdBy: string;
	readonly updatedBy: string;
	readonly createdAt?: Date;
	readonly updatedAt?: Date;
};

export type CompanyIdentifierCreateRecord = {
	readonly id?: CaCompanyIdentifier["id"];
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly identifierType: string;
	readonly jurisdictionCountryId: string | null;
	readonly authorityPartyId: string | null;
	readonly identifierValue: string;
	readonly normalizedIdentifierValue: string;
	readonly isPrimary: boolean;
	readonly status: "active";
	readonly effectiveFrom: string;
	readonly effectiveTo: string | null;
	readonly version: 1;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly createdBy: string;
	readonly updatedBy: string;
	readonly createdAt?: Date;
	readonly updatedAt?: Date;
};

export type CompanyIdentifierUpdatePatch = {
	readonly jurisdictionCountryId?: string | null;
	readonly authorityPartyId?: string | null;
	readonly identifierValue?: string;
	readonly normalizedIdentifierValue?: string;
	readonly isPrimary?: boolean;
	readonly effectiveFrom?: string;
	readonly effectiveTo?: string | null;
	readonly status?: CaCompanyIdentifierStatus;
	readonly updatedBy: string;
	readonly updatedAt?: Date;
};

export type LegalCompanyListFilter = {
	readonly organizationId: string;
	readonly status?: CaLegalCompanyStatus;
	readonly normalizedQuery?: string;
	readonly cursor?: string;
	readonly limit: number;
};

export type CompanyNameListFilter = {
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly nameType?: CaCompanyNameType;
	readonly asOf?: string;
};

export type CompanyIdentifierListFilter = {
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly identifierType?: string;
	readonly status?: CaCompanyIdentifierStatus;
	readonly asOf?: string;
};

export type CompanyStatusHistoryListFilter = {
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
};

export type LegalCompanyActivationFacts = {
	readonly company: CaLegalCompany;
	readonly effectiveNames: readonly CaCompanyName[];
	readonly effectiveIdentifiers: readonly CaCompanyIdentifier[];
};

export type LegalCompanyMutationStore = {
	findLegalCompanyById(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompany | null>>;

	findLegalCompanyByNormalizedCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<CaLegalCompany | null>>;

	findLegalCompanyByDimensionId(
		organizationId: string,
		legalEntityDimensionId: string,
	): Promise<Result<CaLegalCompany | null>>;

	findCreateLegalCompanyReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<
		Result<CorporateAdministrationMutationReceipt<CaLegalCompany> | null>
	>;

	createLegalCompany(
		record: LegalCompanyCreateRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaLegalCompany>>;

	updateLegalCompany(
		organizationId: string,
		legalCompanyId: string,
		expectedVersion: number,
		patch: LegalCompanyUpdatePatch,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaLegalCompany | null>>;

	transitionLegalCompany(
		organizationId: string,
		legalCompanyId: string,
		expectedVersion: number,
		patch: LegalCompanyTransitionPatch,
		history: LegalCompanyStatusTransitionRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaLegalCompany | null>>;

	loadLegalCompanyActivationFacts(
		organizationId: string,
		legalCompanyId: string,
		asOfDate: string,
	): Promise<Result<LegalCompanyActivationFacts | null>>;
};

export type LegalCompanyQueryStore = {
	getLegalCompany(
		organizationId: string,
		legalCompanyId: string,
	): Promise<Result<CaLegalCompany | null>>;

	listLegalCompanies(
		filter: LegalCompanyListFilter,
	): Promise<Result<CaLegalCompanyListPage>>;

	getLegalCompanyStatusAsOf(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
	): Promise<Result<CaLegalCompanyStatus | null>>;
};

export type CompanyNameStore = {
	findCompanyNameById(
		organizationId: string,
		companyNameId: string,
	): Promise<Result<CaCompanyName | null>>;

	findCompanyNameReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<
		Result<CorporateAdministrationMutationReceipt<CaCompanyName> | null>
	>;

	createCompanyName(
		record: CompanyNameCreateRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyName>>;

	endCompanyName(
		organizationId: string,
		companyNameId: string,
		expectedVersion: number,
		effectiveTo: string,
		reason: string | null,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyName | null>>;

	hasOverlappingCompanyName(
		organizationId: string,
		legalCompanyId: string,
		nameType: CaCompanyNameType,
		effectiveFrom: string,
		effectiveTo: string | null,
		excludeCompanyNameId?: string,
	): Promise<Result<boolean>>;

	countEffectivePrimaryLegalNames(
		organizationId: string,
		legalCompanyId: string,
		asOf: string,
	): Promise<Result<number>>;

	listCompanyNames(
		filter: CompanyNameListFilter,
	): Promise<Result<readonly CaCompanyName[]>>;
};

export type CompanyIdentifierStore = {
	findCompanyIdentifierById(
		organizationId: string,
		companyIdentifierId: string,
	): Promise<Result<CaCompanyIdentifier | null>>;

	findCompanyIdentifierReceipt(
		organizationId: string,
		idempotencyKey: string,
	): Promise<
		Result<CorporateAdministrationMutationReceipt<CaCompanyIdentifier> | null>
	>;

	findActiveIdentifierConflict(
		organizationId: string,
		identifierType: string,
		normalizedIdentifierValue: string,
		excludeCompanyIdentifierId?: string,
	): Promise<Result<CaCompanyIdentifier | null>>;

	createCompanyIdentifier(
		record: CompanyIdentifierCreateRecord,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyIdentifier>>;

	updateCompanyIdentifier(
		organizationId: string,
		companyIdentifierId: string,
		expectedVersion: number,
		patch: CompanyIdentifierUpdatePatch,
		context: CorporateAdministrationUnitOfWorkContext,
		meta: CorporateAdministrationMutationMeta,
	): Promise<Result<CaCompanyIdentifier | null>>;

	listCompanyIdentifiers(
		filter: CompanyIdentifierListFilter,
	): Promise<Result<readonly CaCompanyIdentifier[]>>;
};

export type CompanyStatusHistoryStore = {
	findStatusHistoryByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<CaCompanyStatusHistory | null>>;

	listCompanyStatusHistory(
		filter: CompanyStatusHistoryListFilter,
	): Promise<Result<readonly CaCompanyStatusHistory[]>>;
};

export type CorporateAdministrationCompanyStore = LegalCompanyMutationStore &
	LegalCompanyQueryStore &
	CompanyNameStore &
	CompanyIdentifierStore &
	CompanyStatusHistoryStore;
