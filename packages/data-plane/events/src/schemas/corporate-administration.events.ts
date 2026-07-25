import { z } from "zod";

const companyPayloadBase = z.object({
	organizationId: z.string().trim().min(1),
	entityType: z.literal("legal_company"),
	entityId: z.string().uuid(),
	code: z.string().trim().min(1),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	status: z.string().trim().min(1),
});

export const caCompanyPayloadSchema = companyPayloadBase;

export type CaCompanyPayload = z.infer<typeof caCompanyPayloadSchema>;

export const caGovernancePayloadSchema = z.object({
	organizationId: z.string().trim().min(1),
	legalCompanyId: z.string().uuid(),
	entityType: z.enum([
		"officer_appointment",
		"governance_body",
		"governance_membership",
		"authority_mandate",
		"company_premise",
		"governance_meeting",
		"resolution",
	]),
	entityId: z.string().uuid(),
	version: z.number().int().positive(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	status: z.string().trim().min(1),
	effectiveFrom: z.iso.date().optional(),
	effectiveTo: z.iso.date().nullable().optional(),
	supersedesId: z.string().uuid().nullable().optional(),
});

export type CaGovernancePayload = z.infer<typeof caGovernancePayloadSchema>;

export const caShareCapitalPayloadSchema = z.object({
	organizationId: z.string().trim().min(1),
	legalCompanyId: z.string().uuid(),
	entityType: z.enum([
		"share_class",
		"share_transaction",
		"share_certificate",
		"beneficial_owner_disclosure",
	]),
	entityId: z.string().uuid(),
	version: z.number().int().positive().optional(),
	actorId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	status: z.string().trim().min(1),
	reversalOfId: z.string().uuid().nullable().optional(),
});

export type CaShareCapitalPayload = z.infer<typeof caShareCapitalPayloadSchema>;

export const caPropertyAssetsPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		legalCompanyId: z.string().uuid(),
		entityType: z.enum([
			"property",
			"asset",
			"intellectual-property",
			"insurance-policy",
			"charge",
		]),
		entityId: z.string().uuid(),
		version: z.number().int().positive(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();

export const CorporateAdministrationEventSchemas = {
	"corporate-administration.company.created.v1": caCompanyPayloadSchema,
	"corporate-administration.company.updated.v1": caCompanyPayloadSchema,
	"corporate-administration.company.activated.v1": caCompanyPayloadSchema,
	"corporate-administration.company.status-changed.v1": caCompanyPayloadSchema,
	"corporate-administration.company.suspended.v1": caCompanyPayloadSchema,
	"corporate-administration.company.dissolved.v1": caCompanyPayloadSchema,
	"corporate-administration.company.archived.v1": caCompanyPayloadSchema,
	"corporate-administration.officer.appointed.v1": caGovernancePayloadSchema,
	"corporate-administration.officer.amended.v1": caGovernancePayloadSchema,
	"corporate-administration.officer.ended.v1": caGovernancePayloadSchema,
	"corporate-administration.governance-body.created.v1":
		caGovernancePayloadSchema,
	"corporate-administration.governance-body.updated.v1":
		caGovernancePayloadSchema,
	"corporate-administration.governance-body.retired.v1":
		caGovernancePayloadSchema,
	"corporate-administration.governance-membership.appointed.v1":
		caGovernancePayloadSchema,
	"corporate-administration.governance-membership.ended.v1":
		caGovernancePayloadSchema,
	"corporate-administration.authority-mandate.granted.v1":
		caGovernancePayloadSchema,
	"corporate-administration.authority-mandate.amended.v1":
		caGovernancePayloadSchema,
	"corporate-administration.authority-mandate.revoked.v1":
		caGovernancePayloadSchema,
	"corporate-administration.premise.registered.v1": caGovernancePayloadSchema,
	"corporate-administration.premise.updated.v1": caGovernancePayloadSchema,
	"corporate-administration.premise.retired.v1": caGovernancePayloadSchema,
	"corporate-administration.meeting.recorded.v1": caGovernancePayloadSchema,
	"corporate-administration.meeting.corrected.v1": caGovernancePayloadSchema,
	"corporate-administration.meeting.closed.v1": caGovernancePayloadSchema,
	"corporate-administration.resolution.recorded.v1": caGovernancePayloadSchema,
	"corporate-administration.resolution.approved.v1": caGovernancePayloadSchema,
	"corporate-administration.resolution.revoked.v1": caGovernancePayloadSchema,
	"corporate-administration.resolution.superseded.v1":
		caGovernancePayloadSchema,
	"corporate-administration.share-transaction.posted.v1":
		caShareCapitalPayloadSchema,
	"corporate-administration.share-transaction.reversed.v1":
		caShareCapitalPayloadSchema,
	"corporate-administration.beneficial-owner.changed.v1":
		caShareCapitalPayloadSchema,
	"corporate-administration.property.registered.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.property.updated.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.property.disposed.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.asset.registered.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.asset.updated.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.asset.disposed.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.asset.written-off.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.intellectual-property.registered.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.intellectual-property.updated.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.intellectual-property.renewed.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.intellectual-property.expired.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.intellectual-property.disposed.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.insurance-policy.registered.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.insurance-policy.updated.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.insurance-policy.renewed.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.insurance-policy.cancelled.v1":
		caPropertyAssetsPayloadSchema,
	"corporate-administration.charge.registered.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.charge.amended.v1": caPropertyAssetsPayloadSchema,
	"corporate-administration.charge.released.v1": caPropertyAssetsPayloadSchema,
} as const;

export type CorporateAdministrationEventType =
	keyof typeof CorporateAdministrationEventSchemas;

export const CA_COMPANY_CREATED_EVENT =
	"corporate-administration.company.created.v1" as const;
export const CA_COMPANY_UPDATED_EVENT =
	"corporate-administration.company.updated.v1" as const;
export const CA_COMPANY_ACTIVATED_EVENT =
	"corporate-administration.company.activated.v1" as const;
export const CA_COMPANY_STATUS_CHANGED_EVENT =
	"corporate-administration.company.status-changed.v1" as const;
export const CA_COMPANY_SUSPENDED_EVENT =
	"corporate-administration.company.suspended.v1" as const;
export const CA_COMPANY_DISSOLVED_EVENT =
	"corporate-administration.company.dissolved.v1" as const;
export const CA_COMPANY_ARCHIVED_EVENT =
	"corporate-administration.company.archived.v1" as const;
export const CA_OFFICER_APPOINTED_EVENT =
	"corporate-administration.officer.appointed.v1" as const;
export const CA_OFFICER_AMENDED_EVENT =
	"corporate-administration.officer.amended.v1" as const;
export const CA_OFFICER_ENDED_EVENT =
	"corporate-administration.officer.ended.v1" as const;
export const CA_GOVERNANCE_BODY_CREATED_EVENT =
	"corporate-administration.governance-body.created.v1" as const;
export const CA_GOVERNANCE_BODY_UPDATED_EVENT =
	"corporate-administration.governance-body.updated.v1" as const;
export const CA_GOVERNANCE_BODY_RETIRED_EVENT =
	"corporate-administration.governance-body.retired.v1" as const;
export const CA_GOVERNANCE_MEMBERSHIP_APPOINTED_EVENT =
	"corporate-administration.governance-membership.appointed.v1" as const;
export const CA_GOVERNANCE_MEMBERSHIP_ENDED_EVENT =
	"corporate-administration.governance-membership.ended.v1" as const;
export const CA_AUTHORITY_MANDATE_GRANTED_EVENT =
	"corporate-administration.authority-mandate.granted.v1" as const;
export const CA_AUTHORITY_MANDATE_AMENDED_EVENT =
	"corporate-administration.authority-mandate.amended.v1" as const;
export const CA_AUTHORITY_MANDATE_REVOKED_EVENT =
	"corporate-administration.authority-mandate.revoked.v1" as const;
export const CA_PREMISE_REGISTERED_EVENT =
	"corporate-administration.premise.registered.v1" as const;
export const CA_PREMISE_UPDATED_EVENT =
	"corporate-administration.premise.updated.v1" as const;
export const CA_PREMISE_RETIRED_EVENT =
	"corporate-administration.premise.retired.v1" as const;
export const CA_MEETING_RECORDED_EVENT =
	"corporate-administration.meeting.recorded.v1" as const;
export const CA_MEETING_CORRECTED_EVENT =
	"corporate-administration.meeting.corrected.v1" as const;
export const CA_MEETING_CLOSED_EVENT =
	"corporate-administration.meeting.closed.v1" as const;
export const CA_RESOLUTION_RECORDED_EVENT =
	"corporate-administration.resolution.recorded.v1" as const;
export const CA_RESOLUTION_APPROVED_EVENT =
	"corporate-administration.resolution.approved.v1" as const;
export const CA_RESOLUTION_REVOKED_EVENT =
	"corporate-administration.resolution.revoked.v1" as const;
export const CA_RESOLUTION_SUPERSEDED_EVENT =
	"corporate-administration.resolution.superseded.v1" as const;
export const CA_SHARE_TRANSACTION_POSTED_EVENT =
	"corporate-administration.share-transaction.posted.v1" as const;
export const CA_SHARE_TRANSACTION_REVERSED_EVENT =
	"corporate-administration.share-transaction.reversed.v1" as const;
export const CA_BENEFICIAL_OWNER_CHANGED_EVENT =
	"corporate-administration.beneficial-owner.changed.v1" as const;
export const CA_PROPERTY_REGISTERED_EVENT =
	"corporate-administration.property.registered.v1" as const;
export const CA_PROPERTY_UPDATED_EVENT =
	"corporate-administration.property.updated.v1" as const;
export const CA_PROPERTY_DISPOSED_EVENT =
	"corporate-administration.property.disposed.v1" as const;
export const CA_ASSET_REGISTERED_EVENT =
	"corporate-administration.asset.registered.v1" as const;
export const CA_ASSET_UPDATED_EVENT =
	"corporate-administration.asset.updated.v1" as const;
export const CA_ASSET_DISPOSED_EVENT =
	"corporate-administration.asset.disposed.v1" as const;
export const CA_ASSET_WRITTEN_OFF_EVENT =
	"corporate-administration.asset.written-off.v1" as const;
export const CA_INTELLECTUAL_PROPERTY_REGISTERED_EVENT =
	"corporate-administration.intellectual-property.registered.v1" as const;
export const CA_INTELLECTUAL_PROPERTY_UPDATED_EVENT =
	"corporate-administration.intellectual-property.updated.v1" as const;
export const CA_INTELLECTUAL_PROPERTY_RENEWED_EVENT =
	"corporate-administration.intellectual-property.renewed.v1" as const;
export const CA_INTELLECTUAL_PROPERTY_EXPIRED_EVENT =
	"corporate-administration.intellectual-property.expired.v1" as const;
export const CA_INTELLECTUAL_PROPERTY_DISPOSED_EVENT =
	"corporate-administration.intellectual-property.disposed.v1" as const;
export const CA_INSURANCE_POLICY_REGISTERED_EVENT =
	"corporate-administration.insurance-policy.registered.v1" as const;
export const CA_INSURANCE_POLICY_UPDATED_EVENT =
	"corporate-administration.insurance-policy.updated.v1" as const;
export const CA_INSURANCE_POLICY_RENEWED_EVENT =
	"corporate-administration.insurance-policy.renewed.v1" as const;
export const CA_INSURANCE_POLICY_CANCELLED_EVENT =
	"corporate-administration.insurance-policy.cancelled.v1" as const;
export const CA_CHARGE_REGISTERED_EVENT =
	"corporate-administration.charge.registered.v1" as const;
export const CA_CHARGE_AMENDED_EVENT =
	"corporate-administration.charge.amended.v1" as const;
export const CA_CHARGE_RELEASED_EVENT =
	"corporate-administration.charge.released.v1" as const;

export const CA_EVENT_IDS = [
	CA_COMPANY_CREATED_EVENT,
	CA_COMPANY_UPDATED_EVENT,
	CA_COMPANY_ACTIVATED_EVENT,
	CA_COMPANY_STATUS_CHANGED_EVENT,
	CA_COMPANY_SUSPENDED_EVENT,
	CA_COMPANY_DISSOLVED_EVENT,
	CA_COMPANY_ARCHIVED_EVENT,
	CA_OFFICER_APPOINTED_EVENT,
	CA_OFFICER_AMENDED_EVENT,
	CA_OFFICER_ENDED_EVENT,
	CA_GOVERNANCE_BODY_CREATED_EVENT,
	CA_GOVERNANCE_BODY_UPDATED_EVENT,
	CA_GOVERNANCE_BODY_RETIRED_EVENT,
	CA_GOVERNANCE_MEMBERSHIP_APPOINTED_EVENT,
	CA_GOVERNANCE_MEMBERSHIP_ENDED_EVENT,
	CA_AUTHORITY_MANDATE_GRANTED_EVENT,
	CA_AUTHORITY_MANDATE_AMENDED_EVENT,
	CA_AUTHORITY_MANDATE_REVOKED_EVENT,
	CA_PREMISE_REGISTERED_EVENT,
	CA_PREMISE_UPDATED_EVENT,
	CA_PREMISE_RETIRED_EVENT,
	CA_MEETING_RECORDED_EVENT,
	CA_MEETING_CORRECTED_EVENT,
	CA_MEETING_CLOSED_EVENT,
	CA_RESOLUTION_RECORDED_EVENT,
	CA_RESOLUTION_APPROVED_EVENT,
	CA_RESOLUTION_REVOKED_EVENT,
	CA_RESOLUTION_SUPERSEDED_EVENT,
	CA_SHARE_TRANSACTION_POSTED_EVENT,
	CA_SHARE_TRANSACTION_REVERSED_EVENT,
	CA_BENEFICIAL_OWNER_CHANGED_EVENT,
	CA_PROPERTY_REGISTERED_EVENT,
	CA_PROPERTY_UPDATED_EVENT,
	CA_PROPERTY_DISPOSED_EVENT,
	CA_ASSET_REGISTERED_EVENT,
	CA_ASSET_UPDATED_EVENT,
	CA_ASSET_DISPOSED_EVENT,
	CA_ASSET_WRITTEN_OFF_EVENT,
	CA_INTELLECTUAL_PROPERTY_REGISTERED_EVENT,
	CA_INTELLECTUAL_PROPERTY_UPDATED_EVENT,
	CA_INTELLECTUAL_PROPERTY_RENEWED_EVENT,
	CA_INTELLECTUAL_PROPERTY_EXPIRED_EVENT,
	CA_INTELLECTUAL_PROPERTY_DISPOSED_EVENT,
	CA_INSURANCE_POLICY_REGISTERED_EVENT,
	CA_INSURANCE_POLICY_UPDATED_EVENT,
	CA_INSURANCE_POLICY_RENEWED_EVENT,
	CA_INSURANCE_POLICY_CANCELLED_EVENT,
	CA_CHARGE_REGISTERED_EVENT,
	CA_CHARGE_AMENDED_EVENT,
	CA_CHARGE_RELEASED_EVENT,
] as const satisfies readonly CorporateAdministrationEventType[];
