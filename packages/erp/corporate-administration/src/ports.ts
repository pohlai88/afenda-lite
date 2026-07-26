import type { Result } from "@afenda/errors/result";
import type {
	MasterStatus,
	PartyId,
	PartyKind,
	PartyRoleCode,
	TaxRegistrationId,
	TaxRegistrationType,
} from "@afenda/master-data";

import type {
	ApprovalDecisionId,
	ApprovalRequestId,
	CommandFingerprint,
	DocumentObjectRef,
	LegalCompanyId,
	OrganizationId,
	UserId,
} from "./kernel/brands";
import type { CanonicalDate } from "./kernel/dates";
import type { EffectiveRange } from "./kernel/effective-range";

export type PartyRoleReference = {
	roleCode: PartyRoleCode;
	status: MasterStatus;
	effectiveRange: EffectiveRange;
	version: number;
};

export type PartyReference = {
	organizationId: OrganizationId;
	partyId: PartyId;
	canonicalPartyId: PartyId;
	mergeHops: number;
	partyKind: PartyKind;
	code: string;
	legalName: string | null;
	tradingName: string | null;
	status: MasterStatus;
	version: number;
	roles: readonly PartyRoleReference[];
};

export type PartyReferencePort = {
	resolveParty(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		partyId: PartyId;
		asOf: CanonicalDate;
	}): Promise<Result<PartyReference | null>>;
};

export type TaxRegistrationReference = {
	taxRegistrationId: TaxRegistrationId;
	partyId: PartyId;
	jurisdictionCountryId: string;
	registrationType: TaxRegistrationType;
	registrationNumber: string;
	normalizedRegistrationNumber: string;
	name: string | null;
	status: MasterStatus;
	version: number;
	validity: EffectiveRange;
};

export type TaxRegistrationReadPort = {
	listEffectiveForParty(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		partyId: PartyId;
		asOf: CanonicalDate;
	}): Promise<Result<readonly TaxRegistrationReference[]>>;
};

export type CountryReference = {
	code: string;
	alpha3: string;
	name: string;
	active: boolean;
};

export type CurrencyReference = {
	code: string;
	name: string;
	minorUnits: number;
	active: boolean;
};

export type LanguageReference = {
	code: string;
	name: string;
	active: boolean;
};

export type TimeZoneReference = {
	ianaName: string;
	name: string;
	active: boolean;
};

type ReferenceLookupContext = {
	organizationId: OrganizationId;
	actorUserId: UserId;
};

export type ReferenceDataPort = {
	getCountryByCode(
		input: ReferenceLookupContext & { code: string },
	): Promise<Result<CountryReference | null>>;
	getCurrencyByCode(
		input: ReferenceLookupContext & { code: string },
	): Promise<Result<CurrencyReference | null>>;
	getLanguageByCode(
		input: ReferenceLookupContext & { code: string },
	): Promise<Result<LanguageReference | null>>;
	getTimeZoneByIana(
		input: ReferenceLookupContext & { ianaName: string },
	): Promise<Result<TimeZoneReference | null>>;
};

export const PROTECTED_IDENTITY_FIELDS = [
	"government_identifier",
	"birth_date",
	"residential_address",
] as const;
export type ProtectedIdentityField = (typeof PROTECTED_IDENTITY_FIELDS)[number];

export type FilingSafeIdentityValue = {
	field: ProtectedIdentityField;
	value: string;
	representation: "filing_safe" | "masked";
};

export type ProtectedIdentityPort = {
	resolveFilingSafeIdentity(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		partyId: PartyId;
		fields: readonly ProtectedIdentityField[];
		purpose: string;
	}): Promise<Result<readonly FilingSafeIdentityValue[]>>;
};

export type ApprovalDecisionReference = {
	requestId: ApprovalRequestId;
	decisionId: ApprovalDecisionId;
	status: "approved" | "rejected" | "withdrawn" | "expired";
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	requesterUserId: UserId;
	decidedByUserId: UserId;
	commandType: string;
	targetType: string;
	targetReference: string;
	fingerprint: CommandFingerprint;
	decidedAt: Date;
	validUntil: Date | null;
};

export type ApprovalDecisionPort = {
	verifyDecision(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		legalCompanyId: LegalCompanyId;
		decisionId: ApprovalDecisionId;
		commandType: string;
		targetType: string;
		targetReference: string;
		fingerprint: CommandFingerprint;
		requestInstant: Date;
	}): Promise<Result<ApprovalDecisionReference | null>>;
};

export type DocumentObjectReference = {
	objectRef: DocumentObjectRef;
	checksumAlgorithm: "sha256";
	checksum: string;
	mediaType: string;
	sizeBytes: number;
	availability: "available" | "quarantined" | "unavailable";
	malwareStatus: "pending" | "clean" | "infected" | "scan_failed";
};

export type DocumentObjectPort = {
	resolveObject(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		objectRef: DocumentObjectRef;
	}): Promise<Result<DocumentObjectReference | null>>;
};

export type ClockPort = {
	now(): Date;
	today(timeZoneIana: string): CanonicalDate;
};

export type SearchProjectionDocument = {
	id: string;
	organizationId: OrganizationId;
	entityType: string;
	entityId: string;
	title: string;
	summary: string;
	version: number;
};

export type SearchProjectionPort = {
	upsert(document: SearchProjectionDocument): Promise<Result<void>>;
	delete(input: {
		organizationId: OrganizationId;
		entityType: string;
		entityId: string;
	}): Promise<Result<void>>;
};

export type ReminderDispatchPort = {
	dispatch(input: {
		organizationId: OrganizationId;
		legalCompanyId: LegalCompanyId;
		reminderType: string;
		dueDate: CanonicalDate;
		dedupeKey: string;
		summary: string;
	}): Promise<Result<{ dispatchId: string }>>;
};

export type AccountingReferencePort = {
	validateJournalReference(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		journalId: string;
	}): Promise<Result<boolean>>;
	validateAssetLedgerReference(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		assetLedgerId: string;
	}): Promise<Result<boolean>>;
};

export type PaymentsReferencePort = {
	validatePaymentAccountReference(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		paymentAccountId: string;
	}): Promise<Result<boolean>>;
	validatePaymentReference(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		paymentId: string;
	}): Promise<Result<boolean>>;
};

export type SignatureEnvelopeReference = {
	envelopeId: string;
	status: "draft" | "sent" | "completed" | "declined" | "voided";
	completedAt: Date | null;
};

export type SignatureEnvelopePort = {
	getEnvelope(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		envelopeId: string;
	}): Promise<Result<SignatureEnvelopeReference | null>>;
};

export type ComplianceRulePackReference = {
	rulePackId: string;
	jurisdictionCode: string;
	version: string;
	effectiveFrom: CanonicalDate;
	effectiveTo: CanonicalDate | null;
	checksum: string;
	signatureVerified: boolean;
};

export type ComplianceRuleSourcePort = {
	getRulePack(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		jurisdictionCode: string;
		asOf: CanonicalDate;
	}): Promise<Result<ComplianceRulePackReference | null>>;
};
