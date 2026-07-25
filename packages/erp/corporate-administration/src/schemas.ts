import { z } from "zod";

import {
	caCompanyIdentifierIdSchema,
	caCompanyNameIdSchema,
	caLegalCompanyIdSchema,
} from "./brands";
import {
	CA_COMPANY_IDENTIFIER_STATUS_VALUES,
	CA_COMPANY_NAME_TYPE_VALUES,
	CA_LEGAL_COMPANY_STATUS_VALUES,
} from "./types";

export type {
	CaActivationReadinessMissing,
	CaCompanyActivationReadiness,
	CaCompanyIdentifier,
	CaCompanyIdentifierStatus,
	CaCompanyName,
	CaCompanyNameType,
	CaCompanyStatusHistory,
	CaLegalCompany,
	CaLegalCompanyAsOf,
	CaLegalCompanyDetail,
	CaLegalCompanyListPage,
	CaLegalCompanyStatus,
} from "./types";

export {
	CA_ACTIVATION_READINESS_MISSING,
	CA_COMPANY_IDENTIFIER_STATUS_VALUES,
	CA_COMPANY_NAME_TYPE_VALUES,
	CA_LEGAL_COMPANY_STATUS_VALUES,
} from "./types";

const CA_TEXT_MAX_CODE = 100;
const CA_TEXT_MAX_LEGAL_FORM_CODE = 100;
const CA_TEXT_MAX_LEGAL_FORM_NAME = 300;
const CA_TEXT_MAX_DISPLAY_NAME = 500;
const CA_TEXT_MAX_IDENTIFIER_TYPE = 100;
const CA_TEXT_MAX_IDENTIFIER_VALUE = 500;
const CA_TEXT_MAX_REASON = 2_000;
const CA_TEXT_MAX_REASON_CODE = 100;
const CA_TEXT_MAX_REFERENCE = 500;
const CA_IDEMPOTENCY_KEY_MIN = 8;
const CA_IDEMPOTENCY_KEY_MAX = 200;
const CA_LIST_LIMIT_DEFAULT = 50;
const CA_LIST_LIMIT_MAX = 100;
const CA_LIST_QUERY_MAX = 300;

const nonBlankTextSchema = z.string().trim().min(1);

const isoDateSchema = z.iso.date();

const utcInstantSchema = z.iso.datetime();

const expectedVersionSchema = z.number().int().positive();

const idempotencyKeySchema = z
	.string()
	.trim()
	.min(CA_IDEMPOTENCY_KEY_MIN)
	.max(CA_IDEMPOTENCY_KEY_MAX);

const commonMutationContextSchema = z.object({
	organizationId: nonBlankTextSchema,
	actorUserId: nonBlankTextSchema,
	correlationId: nonBlankTextSchema,
	causationId: nonBlankTextSchema.nullish(),
	idempotencyKey: idempotencyKeySchema,
});

export const caLegalCompanyStatusSchema = z.enum(
	CA_LEGAL_COMPANY_STATUS_VALUES,
);

export const caCompanyNameTypeSchema = z.enum(CA_COMPANY_NAME_TYPE_VALUES);

export const caCompanyIdentifierStatusSchema = z.enum(
	CA_COMPANY_IDENTIFIER_STATUS_VALUES,
);

export const createLegalCompanyInputSchema = commonMutationContextSchema
	.extend({
		code: nonBlankTextSchema.max(CA_TEXT_MAX_CODE),
		legalEntityDimensionId: z.uuid(),
		legalPartyId: z.uuid().nullish(),
		jurisdictionCountryId: z.uuid().nullish(),
		legalFormCode: nonBlankTextSchema
			.max(CA_TEXT_MAX_LEGAL_FORM_CODE)
			.nullish(),
		legalFormNameSnapshot: nonBlankTextSchema
			.max(CA_TEXT_MAX_LEGAL_FORM_NAME)
			.nullish(),
		incorporationDate: isoDateSchema.nullish(),
		commencementDate: isoDateSchema.nullish(),
		fiscalYearEndMonth: z.number().int().min(1).max(12).nullish(),
		fiscalYearEndDay: z.number().int().min(1).max(31).nullish(),
	})
	.strict();

export type CreateLegalCompanyInput = z.infer<
	typeof createLegalCompanyInputSchema
>;

export const updateLegalCompanyInputSchema = commonMutationContextSchema
	.extend({
		legalCompanyId: caLegalCompanyIdSchema,
		expectedVersion: expectedVersionSchema,
		code: nonBlankTextSchema.max(CA_TEXT_MAX_CODE).optional(),
		legalPartyId: z.uuid().nullable().optional(),
		jurisdictionCountryId: z.uuid().nullable().optional(),
		legalFormCode: nonBlankTextSchema
			.max(CA_TEXT_MAX_LEGAL_FORM_CODE)
			.nullable()
			.optional(),
		legalFormNameSnapshot: nonBlankTextSchema
			.max(CA_TEXT_MAX_LEGAL_FORM_NAME)
			.nullable()
			.optional(),
		incorporationDate: isoDateSchema.nullable().optional(),
		commencementDate: isoDateSchema.nullable().optional(),
		fiscalYearEndMonth: z.number().int().min(1).max(12).nullable().optional(),
		fiscalYearEndDay: z.number().int().min(1).max(31).nullable().optional(),
	})
	.strict();

export type UpdateLegalCompanyInput = z.infer<
	typeof updateLegalCompanyInputSchema
>;

const lifecycleMutationSchema = commonMutationContextSchema
	.extend({
		legalCompanyId: caLegalCompanyIdSchema,
		expectedVersion: expectedVersionSchema,
		effectiveAt: utcInstantSchema,
		reasonCode: nonBlankTextSchema.max(CA_TEXT_MAX_REASON_CODE),
		reason: nonBlankTextSchema.max(CA_TEXT_MAX_REASON),
		resolutionReference: nonBlankTextSchema
			.max(CA_TEXT_MAX_REFERENCE)
			.nullish(),
		evidenceDocumentReference: nonBlankTextSchema
			.max(CA_TEXT_MAX_REFERENCE)
			.nullish(),
	})
	.strict();

export const activateLegalCompanyInputSchema = commonMutationContextSchema
	.extend({
		legalCompanyId: caLegalCompanyIdSchema,
		expectedVersion: expectedVersionSchema,
		effectiveAt: utcInstantSchema,
	})
	.strict();

export type ActivateLegalCompanyInput = z.infer<
	typeof activateLegalCompanyInputSchema
>;

export const suspendLegalCompanyInputSchema = lifecycleMutationSchema;

export type SuspendLegalCompanyInput = z.infer<
	typeof suspendLegalCompanyInputSchema
>;

export const dissolveLegalCompanyInputSchema = lifecycleMutationSchema;

export type DissolveLegalCompanyInput = z.infer<
	typeof dissolveLegalCompanyInputSchema
>;

export const archiveLegalCompanyInputSchema = lifecycleMutationSchema;

export type ArchiveLegalCompanyInput = z.infer<
	typeof archiveLegalCompanyInputSchema
>;

export const addCompanyNameInputSchema = commonMutationContextSchema
	.extend({
		legalCompanyId: caLegalCompanyIdSchema,
		nameType: caCompanyNameTypeSchema,
		displayName: nonBlankTextSchema.max(CA_TEXT_MAX_DISPLAY_NAME),
		isPrimary: z.boolean().default(false),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullish(),
		supersedesCompanyNameId: caCompanyNameIdSchema.nullish(),
		correctionReason: nonBlankTextSchema.max(CA_TEXT_MAX_REASON).nullish(),
	})
	.strict();

export type AddCompanyNameInput = z.infer<typeof addCompanyNameInputSchema>;

export const endCompanyNameInputSchema = commonMutationContextSchema
	.extend({
		companyNameId: caCompanyNameIdSchema,
		expectedVersion: expectedVersionSchema,
		effectiveTo: isoDateSchema,
		reason: nonBlankTextSchema.max(CA_TEXT_MAX_REASON),
	})
	.strict();

export type EndCompanyNameInput = z.infer<typeof endCompanyNameInputSchema>;

export const addCompanyIdentifierInputSchema = commonMutationContextSchema
	.extend({
		legalCompanyId: caLegalCompanyIdSchema,
		identifierType: nonBlankTextSchema.max(CA_TEXT_MAX_IDENTIFIER_TYPE),
		jurisdictionCountryId: z.uuid().nullish(),
		authorityPartyId: z.uuid().nullish(),
		identifierValue: nonBlankTextSchema.max(CA_TEXT_MAX_IDENTIFIER_VALUE),
		isPrimary: z.boolean().default(false),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullish(),
	})
	.strict();

export type AddCompanyIdentifierInput = z.infer<
	typeof addCompanyIdentifierInputSchema
>;

export const updateCompanyIdentifierInputSchema = commonMutationContextSchema
	.extend({
		companyIdentifierId: caCompanyIdentifierIdSchema,
		expectedVersion: expectedVersionSchema,
		jurisdictionCountryId: z.uuid().nullable().optional(),
		authorityPartyId: z.uuid().nullable().optional(),
		identifierValue: nonBlankTextSchema
			.max(CA_TEXT_MAX_IDENTIFIER_VALUE)
			.optional(),
		isPrimary: z.boolean().optional(),
		effectiveFrom: isoDateSchema.optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
	})
	.strict();

export type UpdateCompanyIdentifierInput = z.infer<
	typeof updateCompanyIdentifierInputSchema
>;

export const retireCompanyIdentifierInputSchema = commonMutationContextSchema
	.extend({
		companyIdentifierId: caCompanyIdentifierIdSchema,
		expectedVersion: expectedVersionSchema,
		effectiveTo: isoDateSchema,
		reason: nonBlankTextSchema.max(CA_TEXT_MAX_REASON),
	})
	.strict();

export type RetireCompanyIdentifierInput = z.infer<
	typeof retireCompanyIdentifierInputSchema
>;

export const getLegalCompanyInputSchema = z
	.object({
		organizationId: nonBlankTextSchema,
		actorUserId: nonBlankTextSchema,
		legalCompanyId: caLegalCompanyIdSchema,
	})
	.strict();

export type GetLegalCompanyInput = z.infer<typeof getLegalCompanyInputSchema>;

export const getLegalCompanyAsOfInputSchema = getLegalCompanyInputSchema
	.extend({
		asOf: utcInstantSchema,
	})
	.strict();

export type GetLegalCompanyAsOfInput = z.infer<
	typeof getLegalCompanyAsOfInputSchema
>;

export const listLegalCompaniesInputSchema = z
	.object({
		organizationId: nonBlankTextSchema,
		actorUserId: nonBlankTextSchema,
		status: caLegalCompanyStatusSchema.optional(),
		query: z.string().trim().max(CA_LIST_QUERY_MAX).optional(),
		cursor: z.string().trim().min(1).optional(),
		limit: z
			.number()
			.int()
			.min(1)
			.max(CA_LIST_LIMIT_MAX)
			.default(CA_LIST_LIMIT_DEFAULT),
	})
	.strict();

export type ListLegalCompaniesInput = z.infer<
	typeof listLegalCompaniesInputSchema
>;

export const listCompanyNamesInputSchema = getLegalCompanyInputSchema
	.extend({
		asOf: utcInstantSchema.optional(),
	})
	.strict();

export type ListCompanyNamesInput = z.infer<typeof listCompanyNamesInputSchema>;

export const listCompanyIdentifiersInputSchema = getLegalCompanyInputSchema
	.extend({
		asOf: utcInstantSchema.optional(),
		status: caCompanyIdentifierStatusSchema.optional(),
	})
	.strict();

export type ListCompanyIdentifiersInput = z.infer<
	typeof listCompanyIdentifiersInputSchema
>;

export const listCompanyStatusHistoryInputSchema = getLegalCompanyInputSchema;

export type ListCompanyStatusHistoryInput = z.infer<
	typeof listCompanyStatusHistoryInputSchema
>;

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
	requestFingerprint: string;
	supersedesOfficerAppointmentId: string | null;
	amendmentReason: string | null;
	endReason: string | null;
	endEvidenceReference: string | null;
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
	requestFingerprint: string;
	retiredAt: Date | null;
	retiredBy: string | null;
	retirementReason: string | null;
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
	requestFingerprint: string;
	endReason: string | null;
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
	minimumSignatories: number;
	effectiveFrom: string;
	effectiveTo: string | null;
	grantEvidenceReference: string | null;
	revocationEvidenceReference: string | null;
	status: CaMandateStatus;
	version: number;
	createIdempotencyKey: string;
	requestFingerprint: string;
	supersedesAuthorityMandateId: string | null;
	amendmentReason: string | null;
	revocationReason: string | null;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export const CA_MANDATE_HOLDER_KINDS = ["party", "officer"] as const;
export type CaMandateHolderKind = (typeof CA_MANDATE_HOLDER_KINDS)[number];

export type CaAuthorityMandateHolder = {
	id: string;
	organizationId: string;
	legalCompanyId: string;
	authorityMandateId: string;
	holderKind: CaMandateHolderKind;
	partyId: string | null;
	partyCodeSnapshot: string | null;
	partyNameSnapshot: string | null;
	officerAppointmentId: string | null;
	effectiveFrom: string;
	effectiveTo: string | null;
	createdBy: string;
	createdAt: Date;
};

export type CaAuthorityMandateDetail = CaAuthorityMandate & {
	holders: CaAuthorityMandateHolder[];
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
	requestFingerprint: string;
	supersedesCompanyPremiseId: string | null;
	amendmentReason: string | null;
	retirementReason: string | null;
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
	requestFingerprint: string;
	correctsGovernanceMeetingId: string | null;
	correctionReason: string | null;
	closedAt: Date | null;
	closedBy: string | null;
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
	approvalEvidenceReference: string | null;
	supersedesResolutionId: string | null;
	supersededById: string | null;
	supersededAt: Date | null;
	revokedDate: string | null;
	revocationReason: string | null;
	revocationEvidenceReference: string | null;
	version: number;
	createIdempotencyKey: string;
	requestFingerprint: string;
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
	asOf: z.iso.date().optional(),
});

const governanceGetContext = governanceQueryContext.extend({
	id: z.uuid(),
});

const governanceExistingCommandContext = governanceCommandContext.extend({
	id: z.uuid(),
	expectedVersion: z.number().int().positive(),
	reason: z.string().trim().min(1).max(1000),
});

const membershipSubjectSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("party"), partyId: z.uuid() }).strict(),
	z
		.object({ kind: z.literal("officer"), officerAppointmentId: z.uuid() })
		.strict(),
]);

const mandateHolderSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("party"), partyId: z.uuid() }).strict(),
	z
		.object({ kind: z.literal("officer"), officerAppointmentId: z.uuid() })
		.strict(),
]);

const premiseAddressSourceSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("master"), partyAddressId: z.uuid() }).strict(),
	z
		.object({
			kind: z.literal("manual"),
			line1: z.string().trim().min(1).max(300),
			line2: z.string().trim().min(1).max(300).optional(),
			city: z.string().trim().min(1).max(120),
			region: z.string().trim().min(1).max(120).optional(),
			postalCode: z.string().trim().min(1).max(32).optional(),
			countryCode: z.string().trim().length(2),
		})
		.strict(),
]);

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
		subject: membershipSubjectSchema,
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
		minimumSignatories: z.number().int().positive().default(1),
		holders: z.array(mandateHolderSchema).min(1).max(50),
		effectiveFrom: z.iso.date(),
		grantEvidenceReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const getAuthorityMandateInputSchema = governanceGetContext.strict();
export const listAuthorityMandatesInputSchema = governanceQueryContext.strict();

export const createCompanyPremiseInputSchema = governanceCommandContext
	.extend({
		premiseType: z.enum(CA_PREMISE_TYPES),
		addressSource: premiseAddressSourceSchema,
		isPrimary: z.boolean().default(false),
		effectiveFrom: z.iso.date(),
	})
	.strict();

export const getCompanyPremiseInputSchema = governanceGetContext.strict();
export const listCompanyPremisesInputSchema = governanceQueryContext.strict();

const standardMeetingRecordSchema = governanceCommandContext.extend({
	mode: z.literal("standard"),
	governanceBodyId: z.uuid(),
	meetingAt: z.iso.datetime(),
	quorumResult: z.enum(CA_QUORUM_RESULTS).default("pending"),
	status: z.enum(["scheduled", "held", "cancelled"]).default("scheduled"),
	minutesDocumentReference: z.string().trim().min(1).max(500).optional(),
});

const correctionMeetingRecordSchema = governanceCommandContext.extend({
	mode: z.literal("correction"),
	correctsGovernanceMeetingId: z.uuid(),
	correctionReason: z.string().trim().min(1).max(1000),
	governanceBodyId: z.uuid(),
	meetingAt: z.iso.datetime(),
	quorumResult: z.enum(["met", "not_met", "waived"]),
	minutesDocumentReference: z.string().trim().min(1).max(500),
});

export const createGovernanceMeetingInputSchema = z.discriminatedUnion("mode", [
	standardMeetingRecordSchema.strict(),
	correctionMeetingRecordSchema.strict(),
]);

export const getGovernanceMeetingInputSchema = governanceGetContext.strict();
export const listGovernanceMeetingsInputSchema =
	governanceQueryContext.strict();

const standardResolutionRecordSchema = governanceCommandContext.extend({
	mode: z.literal("standard"),
	governanceMeetingId: z.uuid().optional(),
	resolutionNumber: z.string().trim().min(1).max(64),
	resolutionYear: z.number().int().min(1900).max(9999),
	title: z.string().trim().min(1).max(300),
	description: z.string().trim().min(1).max(5000).optional(),
});

const supersedingResolutionRecordSchema = standardResolutionRecordSchema.extend(
	{
		mode: z.literal("superseding"),
		supersedesResolutionId: z.uuid(),
	},
);

export const createResolutionInputSchema = z.discriminatedUnion("mode", [
	standardResolutionRecordSchema.strict(),
	supersedingResolutionRecordSchema.strict(),
]);

export const getResolutionInputSchema = governanceGetContext.strict();
export const listResolutionsInputSchema = governanceQueryContext.strict();

export const amendOfficerInputSchema = governanceExistingCommandContext
	.extend({
		effectiveFrom: z.iso.date(),
		officerRole: z.enum(CA_OFFICER_ROLES).optional(),
		authorityLimits: z.string().trim().min(1).max(1000).nullable().optional(),
	})
	.strict();

export const endOfficerInputSchema = governanceExistingCommandContext
	.extend({
		effectiveTo: z.iso.date(),
		endKind: z.enum(["resigned", "removed"]),
		evidenceReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();

export const updateGovernanceBodyInputSchema = governanceExistingCommandContext
	.extend({
		displayName: z.string().trim().min(1).max(300).optional(),
		bodyType: z.enum(CA_GOVERNANCE_BODY_TYPES).optional(),
	})
	.strict();

export const retireGovernanceBodyInputSchema =
	governanceExistingCommandContext.strict();

export const endGovernanceMembershipInputSchema =
	governanceExistingCommandContext
		.extend({ effectiveTo: z.iso.date() })
		.strict();

export const amendAuthorityMandateInputSchema = governanceExistingCommandContext
	.extend({
		effectiveFrom: z.iso.date(),
		mandateType: z.enum(CA_MANDATE_TYPES),
		scopeDescription: z.string().trim().min(1).max(2000),
		amountLimit: z.string().trim().min(1).max(32).optional(),
		currencyCode: z.string().trim().length(3).optional(),
		signingRule: z.enum(CA_SIGNING_RULES),
		minimumSignatories: z.number().int().positive(),
		holders: z.array(mandateHolderSchema).min(1).max(50),
		grantEvidenceReference: z.string().trim().min(1).max(500),
	})
	.strict();

export const revokeAuthorityMandateInputSchema =
	governanceExistingCommandContext
		.extend({
			effectiveTo: z.iso.date(),
			evidenceReference: z.string().trim().min(1).max(500),
		})
		.strict();

export const updateCompanyPremiseInputSchema = governanceExistingCommandContext
	.extend({
		effectiveFrom: z.iso.date(),
		premiseType: z.enum(CA_PREMISE_TYPES),
		addressSource: premiseAddressSourceSchema,
		isPrimary: z.boolean(),
	})
	.strict();

export const retireCompanyPremiseInputSchema = governanceExistingCommandContext
	.extend({ effectiveTo: z.iso.date() })
	.strict();

export const closeGovernanceMeetingInputSchema =
	governanceExistingCommandContext
		.extend({
			quorumResult: z.enum(["met", "not_met", "waived"]),
			minutesDocumentReference: z.string().trim().min(1).max(500),
		})
		.strict();

export const approveResolutionInputSchema = governanceExistingCommandContext
	.extend({
		approvedDate: z.iso.date(),
		evidenceReference: z.string().trim().min(1).max(500),
	})
	.strict();

export const revokeResolutionInputSchema = governanceExistingCommandContext
	.extend({
		revokedDate: z.iso.date(),
		evidenceReference: z.string().trim().min(1).max(500).optional(),
	})
	.strict();
