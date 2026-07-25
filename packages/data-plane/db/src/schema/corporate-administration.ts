import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { mdOrganizationDimension, mdParty } from "./master-data";

/** draft | active | suspended | dissolved | archived */
export const caLegalCompany = pgTable(
	"ca_legal_company",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		legalEntityDimensionId: uuid("legal_entity_dimension_id")
			.notNull()
			.references(() => mdOrganizationDimension.id),
		legalEntityKeySnapshot: text("legal_entity_key_snapshot").notNull(),
		legalEntityNameSnapshot: text("legal_entity_name_snapshot").notNull(),
		legalPartyId: uuid("legal_party_id").references(() => mdParty.id),
		legalPartyCodeSnapshot: text("legal_party_code_snapshot"),
		legalPartyNameSnapshot: text("legal_party_name_snapshot"),
		jurisdictionCountryId: uuid("jurisdiction_country_id"),
		legalFormCode: text("legal_form_code"),
		legalFormNameSnapshot: text("legal_form_name_snapshot"),
		incorporationDate: date("incorporation_date"),
		commencementDate: date("commencement_date"),
		fiscalYearEndMonth: integer("fiscal_year_end_month"),
		fiscalYearEndDay: integer("fiscal_year_end_day"),
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		suspendedAt: timestamp("suspended_at", { withTimezone: true }),
		suspendedBy: text("suspended_by"),
		dissolvedAt: timestamp("dissolved_at", { withTimezone: true }),
		dissolvedBy: text("dissolved_by"),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		archivedBy: text("archived_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_legal_company_org_id_idx").on(t.organizationId, t.id),
		index("ca_legal_company_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("ca_legal_company_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		uniqueIndex("ca_legal_company_org_create_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
		uniqueIndex("ca_legal_company_org_legal_entity_uidx").on(
			t.organizationId,
			t.legalEntityDimensionId,
		),
	],
);

/** legal | former | trading */
export const caCompanyName = pgTable(
	"ca_company_name",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		nameType: text("name_type").notNull(),
		displayName: text("display_name").notNull(),
		normalizedName: text("normalized_name").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		supersedesId: uuid("supersedes_id"),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_name_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_company_name_org_company_type_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.nameType,
		),
		uniqueIndex("ca_company_name_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
	],
);

export const caCompanyIdentifier = pgTable(
	"ca_company_identifier",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		identifierType: text("identifier_type").notNull(),
		jurisdictionCode: text("jurisdiction_code"),
		issuingAuthority: text("issuing_authority"),
		identifierValue: text("identifier_value").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		status: text("status").notNull().default("active"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_identifier_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_company_identifier_org_type_value_uidx").on(
			t.organizationId,
			t.identifierType,
			t.normalizedValue,
		),
		uniqueIndex("ca_company_identifier_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
	],
);

export const caCompanyStatusHistory = pgTable(
	"ca_company_status_history",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		fromStatus: text("from_status"),
		toStatus: text("to_status").notNull(),
		effectiveDate: date("effective_date").notNull(),
		reason: text("reason"),
		evidenceReference: text("evidence_reference"),
		correlationId: text("correlation_id").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_status_history_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_company_status_history_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
	],
);

/** CA-2 — governance and premises */

/** director | secretary | auditor | other */
export const caOfficerAppointment = pgTable(
	"ca_officer_appointment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		officerRole: text("officer_role").notNull(),
		partyId: uuid("party_id"),
		partyCodeSnapshot: text("party_code_snapshot"),
		partyNameSnapshot: text("party_name_snapshot"),
		appointedDate: date("appointed_date").notNull(),
		resignedDate: date("resigned_date"),
		authorityLimits: text("authority_limits"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_officer_appointment_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_officer_appointment_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** board | committee | other */
export const caGovernanceBody = pgTable(
	"ca_governance_body",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		bodyType: text("body_type").notNull(),
		displayName: text("display_name").notNull(),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_governance_body_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_governance_body_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedCode,
		),
		uniqueIndex("ca_governance_body_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caGovernanceMembership = pgTable(
	"ca_governance_membership",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		governanceBodyId: uuid("governance_body_id")
			.notNull()
			.references(() => caGovernanceBody.id),
		memberPartyId: uuid("member_party_id"),
		memberPartyCodeSnapshot: text("member_party_code_snapshot"),
		memberPartyNameSnapshot: text("member_party_name_snapshot"),
		officerAppointmentId: uuid("officer_appointment_id").references(
			() => caOfficerAppointment.id,
		),
		roleTitle: text("role_title").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_governance_membership_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_governance_membership_org_body_idx").on(
			t.organizationId,
			t.governanceBodyId,
		),
		uniqueIndex("ca_governance_membership_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** signing_authority | power_of_attorney | other */
export const caAuthorityMandate = pgTable(
	"ca_authority_mandate",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		mandateType: text("mandate_type").notNull(),
		scopeDescription: text("scope_description").notNull(),
		amountLimit: numeric("amount_limit"),
		currencyCode: text("currency_code"),
		signingRule: text("signing_rule").notNull().default("single"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		grantEvidenceReference: text("grant_evidence_reference"),
		revocationEvidenceReference: text("revocation_evidence_reference"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_authority_mandate_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_authority_mandate_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** registered_office | branch | records_location | other */
export const caCompanyPremise = pgTable(
	"ca_company_premise",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		premiseType: text("premise_type").notNull(),
		partyAddressId: uuid("party_address_id"),
		addressLine1Snapshot: text("address_line1_snapshot").notNull(),
		addressLine2Snapshot: text("address_line2_snapshot"),
		citySnapshot: text("city_snapshot"),
		regionSnapshot: text("region_snapshot"),
		postalCodeSnapshot: text("postal_code_snapshot"),
		countryCodeSnapshot: text("country_code_snapshot"),
		isPrimary: boolean("is_primary").notNull().default(false),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_premise_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_company_premise_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caGovernanceMeeting = pgTable(
	"ca_governance_meeting",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		governanceBodyId: uuid("governance_body_id")
			.notNull()
			.references(() => caGovernanceBody.id),
		meetingAt: timestamp("meeting_at", { withTimezone: true }).notNull(),
		quorumResult: text("quorum_result").notNull().default("pending"),
		status: text("status").notNull().default("scheduled"),
		minutesDocumentReference: text("minutes_document_reference"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_governance_meeting_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_governance_meeting_org_body_idx").on(
			t.organizationId,
			t.governanceBodyId,
		),
		uniqueIndex("ca_governance_meeting_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caResolution = pgTable(
	"ca_resolution",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		governanceMeetingId: uuid("governance_meeting_id").references(
			() => caGovernanceMeeting.id,
		),
		resolutionNumber: text("resolution_number").notNull(),
		resolutionYear: integer("resolution_year").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		status: text("status").notNull().default("draft"),
		approvedDate: date("approved_date"),
		supersededById: uuid("superseded_by_id"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_resolution_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_resolution_org_company_year_number_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.resolutionYear,
			t.resolutionNumber,
		),
		uniqueIndex("ca_resolution_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** CA-3 — share capital */

export const caShareClass = pgTable(
	"ca_share_class",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		classType: text("class_type").notNull(),
		parValue: numeric("par_value", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		authorizedQuantity: numeric("authorized_quantity", {
			precision: 24,
			scale: 12,
		}),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_share_class_org_company_idx").on(t.organizationId, t.legalCompanyId),
		uniqueIndex("ca_share_class_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedCode,
		),
		uniqueIndex("ca_share_class_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caShareTransaction = pgTable(
	"ca_share_transaction",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		shareClassId: uuid("share_class_id")
			.notNull()
			.references(() => caShareClass.id),
		transactionReference: text("transaction_reference").notNull(),
		normalizedReference: text("normalized_reference").notNull(),
		transactionType: text("transaction_type").notNull(),
		status: text("status").notNull().default("posted"),
		transactionDate: date("transaction_date").notNull(),
		reversalOfId: uuid("reversal_of_id"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		correlationId: text("correlation_id").notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_share_transaction_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_share_transaction_org_class_idx").on(
			t.organizationId,
			t.shareClassId,
		),
		uniqueIndex("ca_share_transaction_org_reference_uidx").on(
			t.organizationId,
			t.normalizedReference,
		),
		uniqueIndex("ca_share_transaction_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caShareTransactionLeg = pgTable(
	"ca_share_transaction_leg",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		shareTransactionId: uuid("share_transaction_id")
			.notNull()
			.references(() => caShareTransaction.id),
		shareClassId: uuid("share_class_id")
			.notNull()
			.references(() => caShareClass.id),
		holderPartyId: uuid("holder_party_id").notNull(),
		holderPartyCodeSnapshot: text("holder_party_code_snapshot"),
		holderPartyNameSnapshot: text("holder_party_name_snapshot"),
		quantityDelta: numeric("quantity_delta", { precision: 24, scale: 12 }).notNull(),
		legSequence: integer("leg_sequence").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_share_transaction_leg_org_tx_idx").on(
			t.organizationId,
			t.shareTransactionId,
		),
		index("ca_share_transaction_leg_org_holder_idx").on(
			t.organizationId,
			t.holderPartyId,
			t.shareClassId,
		),
	],
);

export const caShareCertificate = pgTable(
	"ca_share_certificate",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		shareClassId: uuid("share_class_id")
			.notNull()
			.references(() => caShareClass.id),
		shareTransactionId: uuid("share_transaction_id").references(
			() => caShareTransaction.id,
		),
		certificateNumber: text("certificate_number").notNull(),
		normalizedCertificateNumber: text("normalized_certificate_number").notNull(),
		holderPartyId: uuid("holder_party_id").notNull(),
		holderPartyCodeSnapshot: text("holder_party_code_snapshot"),
		holderPartyNameSnapshot: text("holder_party_name_snapshot"),
		status: text("status").notNull().default("active"),
		issuedDate: date("issued_date").notNull(),
		cancelledDate: date("cancelled_date"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_share_certificate_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_share_certificate_org_number_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedCertificateNumber,
		),
		uniqueIndex("ca_share_certificate_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caBeneficialOwnerDisclosure = pgTable(
	"ca_beneficial_owner_disclosure",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		partyId: uuid("party_id").notNull(),
		partyCodeSnapshot: text("party_code_snapshot"),
		partyNameSnapshot: text("party_name_snapshot"),
		natureOfControlCodes: text("nature_of_control_codes").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		verificationStatus: text("verification_status").notNull().default("pending"),
		evidenceReference: text("evidence_reference"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_beneficial_owner_disclosure_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_beneficial_owner_disclosure_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** CA-4 — property and assets */

export const caPropertyHolding = pgTable(
	"ca_property_holding",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		propertyType: text("property_type").notNull(),
		titleReference: text("title_reference").notNull(),
		ownershipPercentage: numeric("ownership_percentage", {
			precision: 24,
			scale: 12,
		}).notNull(),
		acquiredDate: date("acquired_date"),
		disposedDate: date("disposed_date"),
		tenureType: text("tenure_type"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_property_holding_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_property_holding_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedCode,
		),
		uniqueIndex("ca_property_holding_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caCorporateAsset = pgTable(
	"ca_corporate_asset",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		assetCategory: text("asset_category").notNull(),
		identifier: text("identifier"),
		description: text("description").notNull(),
		acquiredDate: date("acquired_date"),
		disposedDate: date("disposed_date"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_corporate_asset_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_corporate_asset_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedCode,
		),
		uniqueIndex("ca_corporate_asset_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caIntellectualPropertyRight = pgTable(
	"ca_intellectual_property_right",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		rightType: text("right_type").notNull(),
		jurisdictionCode: text("jurisdiction_code"),
		registrationNumber: text("registration_number"),
		ownerPartyId: uuid("owner_party_id"),
		filingDate: date("filing_date"),
		grantDate: date("grant_date"),
		expiryDate: date("expiry_date"),
		status: text("status").notNull().default("pending"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_intellectual_property_right_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_intellectual_property_right_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedCode,
		),
		uniqueIndex("ca_intellectual_property_right_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caInsurancePolicy = pgTable(
	"ca_insurance_policy",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		policyNumber: text("policy_number").notNull(),
		normalizedPolicyNumber: text("normalized_policy_number").notNull(),
		insurerPartyId: uuid("insurer_party_id"),
		insurerPartyNameSnapshot: text("insurer_party_name_snapshot"),
		coveredSubject: text("covered_subject").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		limitAmount: numeric("limit_amount", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_insurance_policy_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_insurance_policy_org_number_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedPolicyNumber,
		),
		uniqueIndex("ca_insurance_policy_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caCharge = pgTable(
	"ca_charge",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		chargeType: text("charge_type").notNull(),
		securedPartyId: uuid("secured_party_id"),
		securedPartyNameSnapshot: text("secured_party_name_snapshot"),
		affectedSubjectReference: text("affected_subject_reference").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		createdDate: date("created_date").notNull(),
		releasedDate: date("released_date"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_charge_org_company_idx").on(t.organizationId, t.legalCompanyId),
		uniqueIndex("ca_charge_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedCode,
		),
		uniqueIndex("ca_charge_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** CA-5 — licences and banking */

export const caLicencePermit = pgTable(
	"ca_licence_permit",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		licenceNumber: text("licence_number").notNull(),
		normalizedLicenceNumber: text("normalized_licence_number").notNull(),
		licenceType: text("licence_type").notNull(),
		authorityPartyId: uuid("authority_party_id"),
		authorityNameSnapshot: text("authority_name_snapshot"),
		jurisdictionCode: text("jurisdiction_code"),
		scopeDescription: text("scope_description"),
		validFrom: date("valid_from").notNull(),
		validTo: date("valid_to"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_licence_permit_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_licence_permit_org_number_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedLicenceNumber,
		),
		uniqueIndex("ca_licence_permit_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caBankAccountRegistration = pgTable(
	"ca_bank_account_registration",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		bankPartyId: uuid("bank_party_id"),
		bankPartyNameSnapshot: text("bank_party_name_snapshot"),
		accountIdentityToken: text("account_identity_token").notNull(),
		displayMaskedAccount: text("display_masked_account").notNull(),
		countryCode: text("country_code").notNull(),
		currencyCode: text("currency_code").notNull(),
		accountPurpose: text("account_purpose").notNull(),
		openedDate: date("opened_date").notNull(),
		closedDate: date("closed_date"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_bank_account_registration_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_bank_account_registration_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caBankMandate = pgTable(
	"ca_bank_mandate",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		bankAccountRegistrationId: uuid("bank_account_registration_id")
			.notNull()
			.references(() => caBankAccountRegistration.id),
		mandateDescription: text("mandate_description").notNull(),
		signingRule: text("signing_rule").notNull().default("single"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_bank_mandate_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_bank_mandate_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caGroupControlRelationship = pgTable(
	"ca_group_control_relationship",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		relationshipType: text("relationship_type").notNull(),
		counterpartyLegalCompanyId: uuid("counterparty_legal_company_id").references(
			() => caLegalCompany.id,
		),
		counterpartyPartyId: uuid("counterparty_party_id"),
		counterpartyNameSnapshot: text("counterparty_name_snapshot"),
		controlPercentage: numeric("control_percentage", {
			precision: 24,
			scale: 12,
		}),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_group_control_relationship_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_group_control_relationship_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caMaterialAgreement = pgTable(
	"ca_material_agreement",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		agreementCode: text("agreement_code").notNull(),
		normalizedAgreementCode: text("normalized_agreement_code").notNull(),
		agreementType: text("agreement_type").notNull(),
		title: text("title").notNull(),
		counterpartyPartyId: uuid("counterparty_party_id"),
		counterpartyNameSnapshot: text("counterparty_name_snapshot"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		valueAmount: numeric("value_amount", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		documentReference: text("document_reference"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_material_agreement_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_material_agreement_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedAgreementCode,
		),
		uniqueIndex("ca_material_agreement_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

/** CA-6 — documents and filings */

export const caCorporateDocument = pgTable(
	"ca_corporate_document",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		documentCode: text("document_code").notNull(),
		normalizedDocumentCode: text("normalized_document_code").notNull(),
		documentType: text("document_type").notNull(),
		title: text("title").notNull(),
		externalReference: text("external_reference").notNull(),
		checksum: text("checksum"),
		classification: text("classification"),
		effectiveDate: date("effective_date"),
		expiryDate: date("expiry_date"),
		supersedesId: uuid("supersedes_id"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_corporate_document_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_corporate_document_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedDocumentCode,
		),
		uniqueIndex("ca_corporate_document_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caFilingObligation = pgTable(
	"ca_filing_obligation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		obligationCode: text("obligation_code").notNull(),
		normalizedObligationCode: text("normalized_obligation_code").notNull(),
		filingType: text("filing_type").notNull(),
		jurisdictionCode: text("jurisdiction_code"),
		authorityName: text("authority_name").notNull(),
		periodLabel: text("period_label").notNull(),
		dueDate: date("due_date").notNull(),
		extensionDate: date("extension_date"),
		status: text("status").notNull().default("pending"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_filing_obligation_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		uniqueIndex("ca_filing_obligation_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedObligationCode,
		),
		uniqueIndex("ca_filing_obligation_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);

export const caFilingSubmission = pgTable(
	"ca_filing_submission",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		filingObligationId: uuid("filing_obligation_id")
			.notNull()
			.references(() => caFilingObligation.id),
		submissionReference: text("submission_reference").notNull(),
		submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
		status: text("status").notNull().default("submitted"),
		acknowledgementReference: text("acknowledgement_reference"),
		rejectionReason: text("rejection_reason"),
		evidenceReference: text("evidence_reference"),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_filing_submission_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_filing_submission_org_obligation_idx").on(
			t.organizationId,
			t.filingObligationId,
		),
		uniqueIndex("ca_filing_submission_org_idempotency_uidx").on(
			t.organizationId,
			t.createIdempotencyKey,
		),
	],
);
