import { z } from "zod";

export const CA_COMPANY_STATUSES = [
	"draft",
	"active",
	"suspended",
	"dissolved",
	"archived",
] as const;

export type CaCompanyStatus = (typeof CA_COMPANY_STATUSES)[number];

export const CA_NAME_TYPES = ["legal", "former", "trading"] as const;

export type CaNameType = (typeof CA_NAME_TYPES)[number];

export type CaLegalCompany = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	legalEntityDimensionId: string;
	legalEntityKeySnapshot: string;
	legalEntityNameSnapshot: string;
	legalPartyId: string | null;
	legalPartyCodeSnapshot: string | null;
	legalPartyNameSnapshot: string | null;
	jurisdictionCountryId: string | null;
	legalFormCode: string | null;
	legalFormNameSnapshot: string | null;
	incorporationDate: string | null;
	commencementDate: string | null;
	fiscalYearEndMonth: number | null;
	fiscalYearEndDay: number | null;
	status: CaCompanyStatus;
	version: number;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
	updatedBy: string;
	activatedAt: Date | null;
	activatedBy: string | null;
	suspendedAt: Date | null;
	suspendedBy: string | null;
	dissolvedAt: Date | null;
	dissolvedBy: string | null;
	archivedAt: Date | null;
	archivedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type CaCompanyName = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	nameType: CaNameType;
	displayName: string;
	normalizedName: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	supersedesId: string | null;
	idempotencyKey: string;
	requestFingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaCompanyIdentifier = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	identifierType: string;
	jurisdictionCode: string | null;
	issuingAuthority: string | null;
	identifierValue: string;
	normalizedValue: string;
	status: "active" | "retired";
	effectiveFrom: string;
	effectiveTo: string | null;
	idempotencyKey: string;
	requestFingerprint: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaCompanyStatusHistory = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	fromStatus: CaCompanyStatus | null;
	toStatus: CaCompanyStatus;
	effectiveDate: string;
	reason: string | null;
	evidenceReference: string | null;
	correlationId: string;
	actorUserId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	createdAt: Date;
};

export type CaLegalCompanyDetail = CaLegalCompany & {
	names: CaCompanyName[];
	identifiers: CaCompanyIdentifier[];
	statusHistory: CaCompanyStatusHistory[];
};

const commandContext = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	idempotencyKey: z.string().trim().min(1),
});

export const createLegalCompanyInputSchema = commandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		legalEntityDimensionId: z.uuid(),
		legalPartyId: z.uuid().optional(),
		jurisdictionCountryId: z.uuid().optional(),
		legalFormCode: z.string().trim().min(1).max(64).optional(),
		incorporationDate: z.iso.date().optional(),
		commencementDate: z.iso.date().optional(),
		fiscalYearEndMonth: z.number().int().min(1).max(12).optional(),
		fiscalYearEndDay: z.number().int().min(1).max(31).optional(),
		requestFingerprint: z.string().trim().min(1),
	})
	.strict();

export const updateLegalCompanyInputSchema = commandContext
	.extend({
		legalCompanyId: z.uuid(),
		expectedVersion: z.number().int().positive(),
		legalPartyId: z.uuid().optional(),
		jurisdictionCountryId: z.uuid().nullable().optional(),
		legalFormCode: z.string().trim().min(1).max(64).nullable().optional(),
		incorporationDate: z.iso.date().nullable().optional(),
		commencementDate: z.iso.date().nullable().optional(),
		fiscalYearEndMonth: z.number().int().min(1).max(12).nullable().optional(),
		fiscalYearEndDay: z.number().int().min(1).max(31).nullable().optional(),
	})
	.strict();

export const lifecycleLegalCompanyInputSchema = commandContext
	.extend({
		legalCompanyId: z.uuid(),
		expectedVersion: z.number().int().positive(),
		effectiveDate: z.iso.date(),
		reason: z.string().trim().min(1).max(500).optional(),
		evidenceReference: z.string().trim().min(1).max(500).optional(),
		requestFingerprint: z.string().trim().min(1),
	})
	.strict();

export const getLegalCompanyInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		legalCompanyId: z.uuid(),
	})
	.strict();

export const listLegalCompaniesInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		status: z.enum(CA_COMPANY_STATUSES).optional(),
		page: z.number().int().positive().default(1),
		pageSize: z.number().int().positive().max(100).default(20),
	})
	.strict();

export const addCompanyNameInputSchema = commandContext
	.extend({
		legalCompanyId: z.uuid(),
		nameType: z.enum(CA_NAME_TYPES),
		displayName: z.string().trim().min(1).max(300),
		effectiveFrom: z.iso.date(),
		requestFingerprint: z.string().trim().min(1),
	})
	.strict();

export const addCompanyIdentifierInputSchema = commandContext
	.extend({
		legalCompanyId: z.uuid(),
		identifierType: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(1).max(16).optional(),
		issuingAuthority: z.string().trim().min(1).max(200).optional(),
		identifierValue: z.string().trim().min(1).max(200),
		effectiveFrom: z.iso.date(),
		requestFingerprint: z.string().trim().min(1),
	})
	.strict();

export const endCompanyNameInputSchema = commandContext
	.extend({
		legalCompanyId: z.uuid(),
		companyNameId: z.uuid(),
		expectedVersion: z.number().int().positive(),
		effectiveTo: z.iso.date(),
	})
	.strict();

export const updateCompanyIdentifierInputSchema = commandContext
	.extend({
		legalCompanyId: z.uuid(),
		companyIdentifierId: z.uuid(),
		expectedVersion: z.number().int().positive(),
		jurisdictionCode: z.string().trim().min(1).max(16).nullable().optional(),
		issuingAuthority: z.string().trim().min(1).max(200).nullable().optional(),
		identifierValue: z.string().trim().min(1).max(200).optional(),
	})
	.strict();

export const retireCompanyIdentifierInputSchema = commandContext
	.extend({
		legalCompanyId: z.uuid(),
		companyIdentifierId: z.uuid(),
		expectedVersion: z.number().int().positive(),
		effectiveTo: z.iso.date(),
	})
	.strict();

export const getLegalCompanyAsOfInputSchema = getLegalCompanyInputSchema
	.extend({
		asOf: z.iso.date(),
	})
	.strict();

export const listCompanyNamesInputSchema = getLegalCompanyInputSchema;

export const listCompanyIdentifiersInputSchema = getLegalCompanyInputSchema;

export const listCompanyStatusHistoryInputSchema = getLegalCompanyInputSchema;

export const CA_OFFICER_ROLES = [
	"director",
	"secretary",
	"auditor",
	"other",
] as const;
export type CaOfficerRole = (typeof CA_OFFICER_ROLES)[number];

export const CA_OFFICER_STATUSES = [
	"proposed",
	"active",
	"resigned",
	"removed",
] as const;
export type CaOfficerStatus = (typeof CA_OFFICER_STATUSES)[number];

export type CaOfficerAppointment = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	officerRole: CaOfficerRole;
	partyId: string | null;
	partyCodeSnapshot: string | null;
	partyNameSnapshot: string | null;
	appointedDate: string;
	resignedDate: string | null;
	authorityLimits: string | null;
	status: CaOfficerStatus;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_GOVERNANCE_BODY_TYPES = [
	"board",
	"committee",
	"other",
] as const;
export type CaGovernanceBodyType = (typeof CA_GOVERNANCE_BODY_TYPES)[number];

export const CA_GOVERNANCE_BODY_STATUSES = ["active", "retired"] as const;
export type CaGovernanceBodyStatus =
	(typeof CA_GOVERNANCE_BODY_STATUSES)[number];

export type CaGovernanceBody = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	code: string;
	normalizedCode: string;
	bodyType: CaGovernanceBodyType;
	displayName: string;
	status: CaGovernanceBodyStatus;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type CaGovernanceMembership = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	governanceBodyId: string;
	memberPartyId: string | null;
	memberPartyCodeSnapshot: string | null;
	memberPartyNameSnapshot: string | null;
	officerAppointmentId: string | null;
	roleTitle: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_MANDATE_TYPES = [
	"signing_authority",
	"power_of_attorney",
	"other",
] as const;
export type CaMandateType = (typeof CA_MANDATE_TYPES)[number];

export const CA_SIGNING_RULES = ["single", "joint"] as const;
export type CaSigningRule = (typeof CA_SIGNING_RULES)[number];

export const CA_MANDATE_STATUSES = ["active", "revoked"] as const;
export type CaMandateStatus = (typeof CA_MANDATE_STATUSES)[number];

export type CaAuthorityMandate = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	mandateType: CaMandateType;
	scopeDescription: string;
	amountLimit: string | null;
	currencyCode: string | null;
	signingRule: CaSigningRule;
	effectiveFrom: string;
	effectiveTo: string | null;
	grantEvidenceReference: string | null;
	revocationEvidenceReference: string | null;
	status: CaMandateStatus;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_PREMISE_TYPES = [
	"registered_office",
	"branch",
	"records_location",
	"other",
] as const;
export type CaPremiseType = (typeof CA_PREMISE_TYPES)[number];

export const CA_PREMISE_STATUSES = ["active", "retired"] as const;
export type CaPremiseStatus = (typeof CA_PREMISE_STATUSES)[number];

export type CaCompanyPremise = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	premiseType: CaPremiseType;
	partyAddressId: string | null;
	addressLine1Snapshot: string;
	addressLine2Snapshot: string | null;
	citySnapshot: string | null;
	regionSnapshot: string | null;
	postalCodeSnapshot: string | null;
	countryCodeSnapshot: string | null;
	isPrimary: boolean;
	effectiveFrom: string;
	effectiveTo: string | null;
	status: CaPremiseStatus;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_QUORUM_RESULTS = [
	"met",
	"not_met",
	"waived",
	"pending",
] as const;
export type CaQuorumResult = (typeof CA_QUORUM_RESULTS)[number];

export const CA_MEETING_STATUSES = [
	"scheduled",
	"held",
	"closed",
	"cancelled",
] as const;
export type CaMeetingStatus = (typeof CA_MEETING_STATUSES)[number];

export type CaGovernanceMeeting = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	governanceBodyId: string;
	meetingAt: Date;
	quorumResult: CaQuorumResult;
	status: CaMeetingStatus;
	minutesDocumentReference: string | null;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_RESOLUTION_STATUSES = [
	"draft",
	"approved",
	"revoked",
	"superseded",
] as const;
export type CaResolutionStatus = (typeof CA_RESOLUTION_STATUSES)[number];

export type CaResolution = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	governanceMeetingId: string | null;
	resolutionNumber: string;
	resolutionYear: number;
	title: string;
	description: string | null;
	status: CaResolutionStatus;
	approvedDate: string | null;
	supersededById: string | null;
	version: number;
	createIdempotencyKey: string;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

const governanceCommandContext = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	idempotencyKey: z.string().trim().min(1),
	legalCompanyId: z.uuid(),
});

const governanceQueryContext = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	legalCompanyId: z.uuid(),
});

const governanceGetContext = governanceQueryContext.extend({
	id: z.uuid(),
});

export const createOfficerAppointmentInputSchema = governanceCommandContext
	.extend({
		officerRole: z.enum(CA_OFFICER_ROLES),
		partyId: z.uuid(),
		appointedDate: z.iso.date(),
		authorityLimits: z.string().trim().min(1).max(1000).optional(),
	})
	.strict();

export const getOfficerAppointmentInputSchema = governanceGetContext.strict();
export const listOfficerAppointmentsInputSchema =
	governanceQueryContext.strict();

export const createGovernanceBodyInputSchema = governanceCommandContext
	.extend({
		code: z.string().trim().min(1).max(64),
		bodyType: z.enum(CA_GOVERNANCE_BODY_TYPES),
		displayName: z.string().trim().min(1).max(300),
	})
	.strict();

export const getGovernanceBodyInputSchema = governanceGetContext.strict();
export const listGovernanceBodiesInputSchema = governanceQueryContext.strict();

export const createGovernanceMembershipInputSchema = governanceCommandContext
	.extend({
		governanceBodyId: z.uuid(),
		memberPartyId: z.uuid().optional(),
		officerAppointmentId: z.uuid().optional(),
		roleTitle: z.string().trim().min(1).max(200),
		effectiveFrom: z.iso.date(),
	})
	.strict();

export const getGovernanceMembershipInputSchema = governanceGetContext.strict();
export const listGovernanceMembershipsInputSchema =
	governanceQueryContext.strict();

export const createAuthorityMandateInputSchema = governanceCommandContext
	.extend({
		mandateType: z.enum(CA_MANDATE_TYPES),
		scopeDescription: z.string().trim().min(1).max(2000),
		amountLimit: z.string().trim().min(1).max(32).optional(),
		currencyCode: z.string().trim().length(3).optional(),
		signingRule: z.enum(CA_SIGNING_RULES).default("single"),
		effectiveFrom: z.iso.date(),
		grantEvidenceReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const getAuthorityMandateInputSchema = governanceGetContext.strict();
export const listAuthorityMandatesInputSchema = governanceQueryContext.strict();

export const createCompanyPremiseInputSchema = governanceCommandContext
	.extend({
		premiseType: z.enum(CA_PREMISE_TYPES),
		partyAddressId: z.uuid().optional(),
		addressLine1Snapshot: z.string().trim().min(1).max(300),
		addressLine2Snapshot: z.string().trim().min(1).max(300).optional(),
		citySnapshot: z.string().trim().min(1).max(120).optional(),
		regionSnapshot: z.string().trim().min(1).max(120).optional(),
		postalCodeSnapshot: z.string().trim().min(1).max(32).optional(),
		countryCodeSnapshot: z.string().trim().min(2).max(3).optional(),
		isPrimary: z.boolean().default(false),
		effectiveFrom: z.iso.date(),
	})
	.strict();

export const getCompanyPremiseInputSchema = governanceGetContext.strict();
export const listCompanyPremisesInputSchema = governanceQueryContext.strict();

export const createGovernanceMeetingInputSchema = governanceCommandContext
	.extend({
		governanceBodyId: z.uuid(),
		meetingAt: z.iso.datetime(),
		quorumResult: z.enum(CA_QUORUM_RESULTS).default("pending"),
		status: z.enum(CA_MEETING_STATUSES).default("scheduled"),
		minutesDocumentReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const getGovernanceMeetingInputSchema = governanceGetContext.strict();
export const listGovernanceMeetingsInputSchema =
	governanceQueryContext.strict();

export const createResolutionInputSchema = governanceCommandContext
	.extend({
		governanceMeetingId: z.uuid().optional(),
		resolutionNumber: z.string().trim().min(1).max(64),
		resolutionYear: z.number().int().min(1900).max(9999),
		title: z.string().trim().min(1).max(300),
		description: z.string().trim().min(1).max(5000).optional(),
		status: z.enum(CA_RESOLUTION_STATUSES).default("draft"),
		approvedDate: z.iso.date().optional(),
	})
	.strict();

export const getResolutionInputSchema = governanceGetContext.strict();
export const listResolutionsInputSchema = governanceQueryContext.strict();
