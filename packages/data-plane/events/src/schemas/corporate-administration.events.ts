import { z } from "zod";

const corporateAdministrationBasePayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		legalCompanyId: z.string().trim().min(1),
		occurredAt: z.string().datetime(),
		actorUserId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		causationId: z.string().trim().min(1).optional(),
	})
	.strict();

const corporateAdministrationChangePayloadSchema =
	corporateAdministrationBasePayloadSchema.omit({ causationId: true });

const corporateAdministrationGovernancePayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyStatusHistoryId: z.string().trim().min(1).optional(),
			governanceBodyId: z.string().trim().min(1).optional(),
			governanceMembershipId: z.string().trim().min(1).optional(),
			statutoryOfficeId: z.string().trim().min(1).optional(),
			officerAppointmentId: z.string().trim().min(1).optional(),
			officerQualificationId: z.string().trim().min(1).optional(),
			officerDeclarationId: z.string().trim().min(1).optional(),
			officerDisqualificationId: z.string().trim().min(1).optional(),
			conflictDisclosureId: z.string().trim().min(1).optional(),
			governanceMeetingId: z.string().trim().min(1).optional(),
			meetingParticipantId: z.string().trim().min(1).optional(),
			meetingQuorumResultId: z.string().trim().min(1).optional(),
			resolutionId: z.string().trim().min(1).optional(),
			resolutionActionId: z.string().trim().min(1).optional(),
			authorityMandateId: z.string().trim().min(1).optional(),
			mandateType: z.string().trim().min(1).optional(),
			bodyType: z.string().trim().min(1).optional(),
			officeTypeCode: z.string().trim().min(1).optional(),
			qualificationTypeCode: z.string().trim().min(1).optional(),
			declarationType: z.string().trim().min(1).optional(),
			reasonCode: z.string().trim().min(1).optional(),
			matterType: z.string().trim().min(1).optional(),
			matterId: z.string().trim().min(1).optional(),
			conflictTypeCode: z.string().trim().min(1).optional(),
			procedureType: z.string().trim().min(1).optional(),
			title: z.string().trim().min(1).optional(),
			status: z.string().trim().min(1).optional(),
			effectiveFrom: z.string().date().optional(),
			effectiveTo: z.string().date().nullable().optional(),
			endedOn: z.string().date().optional(),
			scheduledStartAt: z.string().datetime().optional(),
			scheduledEndAt: z.string().datetime().optional(),
			issuedAt: z.string().datetime().optional(),
			recordedAt: z.string().datetime().optional(),
			deliveryMethod: z.string().trim().min(1).optional(),
			attendanceStatus: z.string().trim().min(1).optional(),
			hasQuorum: z.boolean().optional(),
			eligibleMemberCount: z.number().int().nonnegative().optional(),
			presentMemberCount: z.number().int().nonnegative().optional(),
			requiredPresentCount: z.number().int().nonnegative().optional(),
			motionCode: z.string().trim().min(1).optional(),
			thresholdType: z.string().trim().min(1).optional(),
			eligibleVotes: z.number().int().nonnegative().optional(),
			votesFor: z.number().int().nonnegative().optional(),
			votesAgainst: z.number().int().nonnegative().optional(),
			abstentions: z.number().int().nonnegative().optional(),
			outcome: z.string().trim().min(1).optional(),
			outcomeBasis: z.string().trim().min(1).optional(),
			approvalBasis: z.string().trim().min(1).optional(),
			required: z.boolean().optional(),
			verificationStatus: z.string().trim().min(1).optional(),
		})
		.strict();

export const corporateAdministrationLegalCompanyDraftRegisteredPayloadSchema =
	corporateAdministrationBasePayloadSchema
		.extend({
			companyCode: z.string().trim().min(1),
			homeJurisdictionCountryCode: z
				.string()
				.trim()
				.regex(/^[A-Z]{2}$/),
			profileVersion: z.number().int().nonnegative(),
			state: z.literal("draft"),
		})
		.strict();

export const corporateAdministrationLegalCompanyProfileUpdatedPayloadSchema =
	corporateAdministrationBasePayloadSchema
		.extend({
			profileVersion: z.number().int().nonnegative(),
			changedPaths: z.array(z.literal("profile")).nonempty(),
		})
		.strict();

export const corporateAdministrationLegalCompanyJurisdictionProfileSetPayloadSchema =
	corporateAdministrationBasePayloadSchema
		.extend({
			profileVersion: z.number().int().nonnegative(),
			jurisdictionProfileId: z.string().trim().min(1),
			jurisdictionCode: z
				.string()
				.trim()
				.regex(/^[A-Z]{2}$/),
			entityTypeCode: z
				.string()
				.trim()
				.min(1)
				.max(64)
				.regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/),
			effectiveFrom: z.string().date(),
			effectiveTo: z.string().date().nullable(),
			supersedesId: z.string().trim().min(1).nullable(),
		})
		.strict();

export const corporateAdministrationLegalCompanyNameAddedPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyNameId: z.string().trim().min(1),
			nameType: z.enum(["legal", "former", "translated", "trading"]),
			languageCode: z.string().trim().min(1).max(16),
			effectiveFrom: z.string().date(),
			effectiveTo: z.string().date().nullable(),
		})
		.strict();

export const corporateAdministrationLegalCompanyNameSupersededPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			predecessorCompanyNameId: z.string().trim().min(1),
			successorCompanyNameId: z.string().trim().min(1),
			nameType: z.enum(["legal", "former", "translated", "trading"]),
			languageCode: z.string().trim().min(1).max(16),
			effectiveFrom: z.string().date(),
		})
		.strict();

export const corporateAdministrationLegalCompanyNameRetiredPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyNameId: z.string().trim().min(1),
			nameType: z.enum(["legal", "former", "translated", "trading"]),
			retiredAt: z.string().datetime(),
		})
		.strict();

export const corporateAdministrationLegalCompanyLegalFormChangedPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			legalFormHistoryId: z.string().trim().min(1),
			previousLegalFormCode: z
				.string()
				.trim()
				.min(1)
				.max(64)
				.regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)
				.nullable(),
			jurisdictionCode: z
				.string()
				.trim()
				.min(1)
				.max(64)
				.regex(/^[A-Z]{2}(?:-[A-Z0-9]{1,8})?$/),
			legalFormCode: z
				.string()
				.trim()
				.min(1)
				.max(64)
				.regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/),
			effectiveFrom: z.string().date(),
			effectiveTo: z.string().date().nullable(),
		})
		.strict();

export const corporateAdministrationLegalCompanyIdentifierRegisteredPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyIdentifierId: z.string().trim().min(1),
			identifierType: z.enum([
				"company_registration",
				"registry_number",
				"business_registration",
				"foreign_registration",
				"legal_entity_identifier",
				"statistical_identifier",
				"industry_identifier",
				"other_non_tax_identifier",
			]),
			jurisdictionCode: z
				.string()
				.trim()
				.regex(/^[A-Z]{2}$/),
			authorityCode: z.string().trim().min(1).max(64),
			maskedIdentifier: z.string().trim().min(1).max(128).optional(),
			identifierDigest: z
				.string()
				.trim()
				.regex(/^[0-9a-f]{64}$/)
				.optional(),
			lastFour: z
				.string()
				.trim()
				.regex(/^[A-Za-z0-9]{1,4}$/)
				.optional(),
			effectiveFrom: z.string().date(),
			effectiveTo: z.string().date().nullable(),
		})
		.strict();

export const corporateAdministrationLegalCompanyIdentifierRetiredPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyIdentifierId: z.string().trim().min(1),
			identifierType: z.enum([
				"company_registration",
				"registry_number",
				"business_registration",
				"foreign_registration",
				"legal_entity_identifier",
				"statistical_identifier",
				"industry_identifier",
				"other_non_tax_identifier",
			]),
			jurisdictionCode: z
				.string()
				.trim()
				.regex(/^[A-Z]{2}$/),
			retiredAt: z.string().datetime(),
		})
		.strict();

export const corporateAdministrationLegalCompanyFinancialYearSetPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyFinancialYearId: z.string().trim().min(1),
			yearEndMonth: z.number().int().min(1).max(12),
			yearEndDay: z.number().int().min(1).max(31),
			functionalCurrencyCode: z
				.string()
				.trim()
				.regex(/^[A-Z]{3}$/),
			effectiveFrom: z.string().date(),
		})
		.strict();

export const corporateAdministrationLegalCompanyActivityRegisteredPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyActivityId: z.string().trim().min(1),
			activityType: z.enum(["registered_object", "regulated", "operational"]),
			classificationSystem: z.string().trim().min(1).max(64),
			activityCode: z.string().trim().min(1).max(64),
			jurisdictionCode: z
				.string()
				.trim()
				.regex(/^[A-Z]{2}$/),
			effectiveFrom: z.string().date(),
		})
		.strict();

export const corporateAdministrationLegalCompanyActivityEndedPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			companyActivityId: z.string().trim().min(1),
			activityType: z.enum(["registered_object", "regulated", "operational"]),
			activityCode: z.string().trim().min(1).max(64),
			jurisdictionCode: z
				.string()
				.trim()
				.regex(/^[A-Z]{2}$/),
			endedAt: z.string().date(),
		})
		.strict();

const legalEstablishmentBasePayloadSchema =
	corporateAdministrationChangePayloadSchema.extend({
		legalEstablishmentId: z.string().uuid(),
	});

export const corporateAdministrationLegalEstablishmentRegisteredPayloadSchema =
	legalEstablishmentBasePayloadSchema
		.extend({
			establishmentType: z.enum([
				"branch",
				"representative_office",
				"foreign_registration",
				"other",
			]),
			jurisdictionCode: z.string().regex(/^[A-Z]{2}$/),
			registeredFrom: z.string().date(),
		})
		.strict();

export const corporateAdministrationLegalEstablishmentUpdatedPayloadSchema =
	legalEstablishmentBasePayloadSchema
		.extend({ profileVersion: z.number().int().positive() })
		.strict();

export const corporateAdministrationLegalEstablishmentStatusChangedPayloadSchema =
	legalEstablishmentBasePayloadSchema
		.extend({
			previousStatus: z.enum(["registered", "active", "suspended", "closed"]),
			status: z.enum(["active", "suspended", "closed"]),
			effectiveFrom: z.string().date(),
		})
		.strict();

export const corporateAdministrationRegisteredAddressSetPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			legalEstablishmentId: z.string().uuid().nullable(),
			registeredAddressId: z.string().uuid(),
			addressType: z.enum([
				"registered_office",
				"service_address",
				"place_of_business",
			]),
			countryCode: z.string().regex(/^[A-Z]{2}$/),
			effectiveFrom: z.string().date(),
			effectiveTo: z.string().date().nullable(),
		})
		.strict();

export const corporateAdministrationPremiseRegisteredPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			legalEstablishmentId: z.string().uuid().nullable(),
			premiseId: z.string().uuid(),
			premiseType: z.enum(["office", "warehouse", "operational_site", "other"]),
			countryCode: z.string().regex(/^[A-Z]{2}$/),
			effectiveFrom: z.string().date(),
		})
		.strict();

export const corporateAdministrationPremiseEndedPayloadSchema =
	corporateAdministrationChangePayloadSchema
		.extend({
			premiseId: z.string().uuid(),
			endedOn: z.string().date(),
		})
		.strict();

export const corporateAdministrationLegalCompanyPayloadSchema = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.literal("legal_company"),
	entityId: z.string().trim().min(1),
	companyCode: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	causationId: z.string().trim().min(1).optional(),
	changedPaths: z.array(z.string().trim().min(1)).optional(),
});

export type CorporateAdministrationLegalCompanyPayload = z.infer<
	typeof corporateAdministrationLegalCompanyPayloadSchema
>;
export type CorporateAdministrationLegalCompanyDraftRegisteredPayload = z.infer<
	typeof corporateAdministrationLegalCompanyDraftRegisteredPayloadSchema
>;
export type CorporateAdministrationLegalCompanyProfileUpdatedPayload = z.infer<
	typeof corporateAdministrationLegalCompanyProfileUpdatedPayloadSchema
>;
export type CorporateAdministrationLegalCompanyJurisdictionProfileSetPayload =
	z.infer<
		typeof corporateAdministrationLegalCompanyJurisdictionProfileSetPayloadSchema
	>;
export type CorporateAdministrationLegalCompanyNameAddedPayload = z.infer<
	typeof corporateAdministrationLegalCompanyNameAddedPayloadSchema
>;
export type CorporateAdministrationLegalCompanyNameSupersededPayload = z.infer<
	typeof corporateAdministrationLegalCompanyNameSupersededPayloadSchema
>;
export type CorporateAdministrationLegalCompanyLegalFormChangedPayload =
	z.infer<
		typeof corporateAdministrationLegalCompanyLegalFormChangedPayloadSchema
	>;
export type CorporateAdministrationLegalCompanyIdentifierRegisteredPayload =
	z.infer<
		typeof corporateAdministrationLegalCompanyIdentifierRegisteredPayloadSchema
	>;
export type CorporateAdministrationLegalCompanyIdentifierRetiredPayload =
	z.infer<
		typeof corporateAdministrationLegalCompanyIdentifierRetiredPayloadSchema
	>;
export type CorporateAdministrationLegalCompanyFinancialYearSetPayload =
	z.infer<
		typeof corporateAdministrationLegalCompanyFinancialYearSetPayloadSchema
	>;
export type CorporateAdministrationLegalCompanyActivityRegisteredPayload =
	z.infer<
		typeof corporateAdministrationLegalCompanyActivityRegisteredPayloadSchema
	>;
export type CorporateAdministrationLegalCompanyActivityEndedPayload = z.infer<
	typeof corporateAdministrationLegalCompanyActivityEndedPayloadSchema
>;
export type CorporateAdministrationLegalCompanyNameRetiredPayload = z.infer<
	typeof corporateAdministrationLegalCompanyNameRetiredPayloadSchema
>;
export type CorporateAdministrationLegalEstablishmentRegisteredPayload =
	z.infer<
		typeof corporateAdministrationLegalEstablishmentRegisteredPayloadSchema
	>;
export type CorporateAdministrationLegalEstablishmentUpdatedPayload = z.infer<
	typeof corporateAdministrationLegalEstablishmentUpdatedPayloadSchema
>;
export type CorporateAdministrationLegalEstablishmentStatusChangedPayload =
	z.infer<
		typeof corporateAdministrationLegalEstablishmentStatusChangedPayloadSchema
	>;
export type CorporateAdministrationRegisteredAddressSetPayload = z.infer<
	typeof corporateAdministrationRegisteredAddressSetPayloadSchema
>;
export type CorporateAdministrationPremiseRegisteredPayload = z.infer<
	typeof corporateAdministrationPremiseRegisteredPayloadSchema
>;
export type CorporateAdministrationPremiseEndedPayload = z.infer<
	typeof corporateAdministrationPremiseEndedPayloadSchema
>;

export const CorporateAdministrationEventSchemas = {
	"corporate_administration.legal_company.draft_registered.v1":
		corporateAdministrationLegalCompanyDraftRegisteredPayloadSchema,
	"corporate_administration.legal_company.profile_updated.v1":
		corporateAdministrationLegalCompanyProfileUpdatedPayloadSchema,
	"corporate_administration.legal_company.jurisdiction_profile_set.v1":
		corporateAdministrationLegalCompanyJurisdictionProfileSetPayloadSchema,
	"corporate_administration.legal_company.name_added.v1":
		corporateAdministrationLegalCompanyNameAddedPayloadSchema,
	"corporate_administration.legal_company.name_superseded.v1":
		corporateAdministrationLegalCompanyNameSupersededPayloadSchema,
	"corporate_administration.legal_company.name_retired.v1":
		corporateAdministrationLegalCompanyNameRetiredPayloadSchema,
	"corporate_administration.legal_company.legal_form_changed.v1":
		corporateAdministrationLegalCompanyLegalFormChangedPayloadSchema,
	"corporate_administration.legal_company.identifier_registered.v1":
		corporateAdministrationLegalCompanyIdentifierRegisteredPayloadSchema,
	"corporate_administration.legal_company.identifier_retired.v1":
		corporateAdministrationLegalCompanyIdentifierRetiredPayloadSchema,
	"corporate_administration.legal_company.financial_year_set.v1":
		corporateAdministrationLegalCompanyFinancialYearSetPayloadSchema,
	"corporate_administration.legal_company.activity_registered.v1":
		corporateAdministrationLegalCompanyActivityRegisteredPayloadSchema,
	"corporate_administration.legal_company.activity_ended.v1":
		corporateAdministrationLegalCompanyActivityEndedPayloadSchema,
	"corporate_administration.legal_establishment.registered.v1":
		corporateAdministrationLegalEstablishmentRegisteredPayloadSchema,
	"corporate_administration.legal_establishment.updated.v1":
		corporateAdministrationLegalEstablishmentUpdatedPayloadSchema,
	"corporate_administration.legal_establishment.status_changed.v1":
		corporateAdministrationLegalEstablishmentStatusChangedPayloadSchema,
	"corporate_administration.registered_address.set.v1":
		corporateAdministrationRegisteredAddressSetPayloadSchema,
	"corporate_administration.premise.registered.v1":
		corporateAdministrationPremiseRegisteredPayloadSchema,
	"corporate_administration.premise.ended.v1":
		corporateAdministrationPremiseEndedPayloadSchema,
	"corporate_administration.legal_company.activated.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.legal_company.suspended.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.legal_company.struck_off_marked.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.legal_company.liquidation_entered.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.legal_company.dissolved.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.legal_company.restored.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.legal_company.archived.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_body.created.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_body.amended.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_body.retired.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_membership.appointed.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_membership.changed.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_membership.ended.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.statutory_office.defined.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.appointed.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.appointment_amended.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.qualification_recorded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.resigned.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.removed.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.declaration_recorded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.declaration_superseded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.disqualified.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.officer.disqualification_ended.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.conflict.disclosed.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.conflict.recusal_recorded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_meeting.scheduled.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.meeting_notice.issued.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.meeting_notice.delivered.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.meeting_notice.waived.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.meeting_participant.recorded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_meeting.opened.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_meeting.quorum_recorded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_meeting.adjourned.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.governance_meeting.closed.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.meeting_vote.recorded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.resolution.adopted.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.resolution.rejected.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.resolution.superseded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.resolution.minutes_recorded.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.resolution.action_assigned.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.resolution.action_completed.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.authority_mandate.granted.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.authority_mandate.amended.v1":
		corporateAdministrationGovernancePayloadSchema,
	"corporate_administration.authority_mandate.revoked.v1":
		corporateAdministrationGovernancePayloadSchema,
} as const;

export type CorporateAdministrationEventType =
	keyof typeof CorporateAdministrationEventSchemas;

export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_DRAFT_REGISTERED_EVENT =
	"corporate_administration.legal_company.draft_registered.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_PROFILE_UPDATED_EVENT =
	"corporate_administration.legal_company.profile_updated.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_JURISDICTION_PROFILE_SET_EVENT =
	"corporate_administration.legal_company.jurisdiction_profile_set.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_ADDED_EVENT =
	"corporate_administration.legal_company.name_added.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_SUPERSEDED_EVENT =
	"corporate_administration.legal_company.name_superseded.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_RETIRED_EVENT =
	"corporate_administration.legal_company.name_retired.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_LEGAL_FORM_CHANGED_EVENT =
	"corporate_administration.legal_company.legal_form_changed.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_IDENTIFIER_REGISTERED_EVENT =
	"corporate_administration.legal_company.identifier_registered.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_IDENTIFIER_RETIRED_EVENT =
	"corporate_administration.legal_company.identifier_retired.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_FINANCIAL_YEAR_SET_EVENT =
	"corporate_administration.legal_company.financial_year_set.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_ACTIVITY_REGISTERED_EVENT =
	"corporate_administration.legal_company.activity_registered.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_COMPANY_ACTIVITY_ENDED_EVENT =
	"corporate_administration.legal_company.activity_ended.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_REGISTERED_EVENT =
	"corporate_administration.legal_establishment.registered.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_UPDATED_EVENT =
	"corporate_administration.legal_establishment.updated.v1" as const;
export const CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_STATUS_CHANGED_EVENT =
	"corporate_administration.legal_establishment.status_changed.v1" as const;
export const CORPORATE_ADMINISTRATION_REGISTERED_ADDRESS_SET_EVENT =
	"corporate_administration.registered_address.set.v1" as const;
export const CORPORATE_ADMINISTRATION_PREMISE_REGISTERED_EVENT =
	"corporate_administration.premise.registered.v1" as const;
export const CORPORATE_ADMINISTRATION_PREMISE_ENDED_EVENT =
	"corporate_administration.premise.ended.v1" as const;

export const CORPORATE_ADMINISTRATION_EVENT_IDS = [
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_DRAFT_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_PROFILE_UPDATED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_JURISDICTION_PROFILE_SET_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_ADDED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_SUPERSEDED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_RETIRED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_LEGAL_FORM_CHANGED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_IDENTIFIER_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_IDENTIFIER_RETIRED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_FINANCIAL_YEAR_SET_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_ACTIVITY_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_ACTIVITY_ENDED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_UPDATED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_STATUS_CHANGED_EVENT,
	CORPORATE_ADMINISTRATION_REGISTERED_ADDRESS_SET_EVENT,
	CORPORATE_ADMINISTRATION_PREMISE_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_PREMISE_ENDED_EVENT,
] as const satisfies readonly CorporateAdministrationEventType[];
