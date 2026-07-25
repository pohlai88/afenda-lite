import type {
	CaCompanyIdentifierId,
	CaCompanyNameId,
	CaLegalCompanyId,
} from "../brands";

export const CA_LEGAL_COMPANY_STATUS_VALUES = [
	"draft",
	"active",
	"suspended",
	"dissolved",
	"archived",
] as const;

export type CaLegalCompanyStatus =
	(typeof CA_LEGAL_COMPANY_STATUS_VALUES)[number];

export const CA_COMPANY_NAME_TYPE_VALUES = [
	"legal",
	"former",
	"trading",
] as const;

export type CaCompanyNameType = (typeof CA_COMPANY_NAME_TYPE_VALUES)[number];

export const CA_COMPANY_IDENTIFIER_STATUS_VALUES = [
	"active",
	"retired",
] as const;

export type CaCompanyIdentifierStatus =
	(typeof CA_COMPANY_IDENTIFIER_STATUS_VALUES)[number];

export type CaLegalCompany = {
	readonly id: CaLegalCompanyId;
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
	readonly status: CaLegalCompanyStatus;
	readonly version: number;
	readonly createIdempotencyKey: string;
	readonly createRequestFingerprint: string;
	readonly createdBy: string;
	readonly updatedBy: string;
	readonly activatedAt: Date | null;
	readonly activatedBy: string | null;
	readonly suspendedAt: Date | null;
	readonly suspendedBy: string | null;
	readonly dissolvedAt: Date | null;
	readonly dissolvedBy: string | null;
	readonly archivedAt: Date | null;
	readonly archivedBy: string | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type CaCompanyName = {
	readonly id: CaCompanyNameId;
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly nameType: CaCompanyNameType;
	readonly displayName: string;
	readonly normalizedName: string;
	readonly isPrimary: boolean;
	readonly effectiveFrom: string;
	readonly effectiveTo: string | null;
	readonly supersedesCompanyNameId: CaCompanyNameId | null;
	readonly correctionReason: string | null;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly version: number;
	readonly createdBy: string;
	readonly updatedBy: string;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type CaCompanyIdentifier = {
	readonly id: CaCompanyIdentifierId;
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly identifierType: string;
	readonly jurisdictionCountryId: string | null;
	readonly authorityPartyId: string | null;
	readonly identifierValue: string;
	readonly normalizedIdentifierValue: string;
	readonly isPrimary: boolean;
	readonly status: CaCompanyIdentifierStatus;
	readonly effectiveFrom: string;
	readonly effectiveTo: string | null;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly version: number;
	readonly createdBy: string;
	readonly updatedBy: string;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type CaCompanyStatusHistory = {
	readonly id: string;
	readonly organizationId: string;
	readonly legalCompanyId: CaLegalCompanyId;
	readonly fromStatus: CaLegalCompanyStatus | null;
	readonly toStatus: CaLegalCompanyStatus;
	readonly effectiveAt: Date;
	readonly reasonCode: string | null;
	readonly reason: string | null;
	readonly resolutionReference: string | null;
	readonly evidenceDocumentReference: string | null;
	readonly correlationId: string;
	readonly causationId: string | null;
	readonly actorUserId: string;
	readonly idempotencyKey: string;
	readonly requestFingerprint: string;
	readonly createdAt: Date;
};

export type CaLegalCompanyDetail = CaLegalCompany & {
	readonly names: readonly CaCompanyName[];
	readonly identifiers: readonly CaCompanyIdentifier[];
	readonly statusHistory: readonly CaCompanyStatusHistory[];
};

export type CaLegalCompanyAsOf = {
	readonly company: CaLegalCompany;
	readonly status: CaLegalCompanyStatus;
	readonly effectiveName: CaCompanyName | null;
	readonly effectiveIdentifiers: readonly CaCompanyIdentifier[];
	readonly asOf: string;
};

export type CaLegalCompanyListPage = {
	readonly items: readonly CaLegalCompany[];
	readonly total: number;
	readonly nextCursor: string | null;
};

export const CA_ACTIVATION_READINESS_MISSING = [
	"effective_legal_entity_dimension",
	"active_organization_party",
	"primary_legal_name",
	"primary_registration_identifier",
] as const;

export type CaActivationReadinessMissing =
	(typeof CA_ACTIVATION_READINESS_MISSING)[number];

export type CaCompanyActivationReadiness = {
	readonly ready: boolean;
	readonly missing: readonly CaActivationReadinessMissing[];
};
