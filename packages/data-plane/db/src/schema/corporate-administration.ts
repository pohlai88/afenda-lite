import { sql } from "drizzle-orm";
import {
	boolean,
	check,
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

export const CA_LEGAL_COMPANY_STATUSES = [
	"draft",
	"active",
	"suspended",
	"dissolved",
	"archived",
] as const;

export type CaLegalCompanyStatus =
	(typeof CA_LEGAL_COMPANY_STATUSES)[number];

export const CA_COMPANY_NAME_TYPES = [
	"legal",
	"former",
	"trading",
] as const;

export type CaCompanyNameType = (typeof CA_COMPANY_NAME_TYPES)[number];

export const CA_COMPANY_IDENTIFIER_STATUSES = [
	"active",
	"retired",
] as const;

export type CaCompanyIdentifierStatus =
	(typeof CA_COMPANY_IDENTIFIER_STATUSES)[number];

export const caLegalCompany = pgTable(
	"ca_legal_company",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		legalEntityDimensionId: uuid("legal_entity_dimension_id")
			.notNull()
			.references(() => mdOrganizationDimension.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),
		legalEntityKeySnapshot: text("legal_entity_key_snapshot").notNull(),
		legalEntityNameSnapshot: text("legal_entity_name_snapshot").notNull(),
		legalPartyId: uuid("legal_party_id").references(() => mdParty.id, {
			onDelete: "restrict",
			onUpdate: "cascade",
		}),
		legalPartyCodeSnapshot: text("legal_party_code_snapshot"),
		legalPartyNameSnapshot: text("legal_party_name_snapshot"),
		jurisdictionCountryId: uuid("jurisdiction_country_id"),
		legalFormCode: text("legal_form_code"),
		legalFormNameSnapshot: text("legal_form_name_snapshot"),
		incorporationDate: date("incorporation_date"),
		commencementDate: date("commencement_date"),
		fiscalYearEndMonth: integer("fiscal_year_end_month"),
		fiscalYearEndDay: integer("fiscal_year_end_day"),
		status: text("status")
			.$type<CaLegalCompanyStatus>()
			.notNull()
			.default("draft"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		suspendedAt: timestamp("suspended_at", { withTimezone: true }),
		suspendedBy: text("suspended_by"),
		dissolvedAt: timestamp("dissolved_at", { withTimezone: true }),
		dissolvedBy: text("dissolved_by"),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		archivedBy: text("archived_by"),
	},
	(table) => [
		uniqueIndex("ca_legal_company_org_normalized_code_uidx").on(
			table.organizationId,
			table.normalizedCode,
		),
		uniqueIndex("ca_legal_company_org_legal_entity_uidx").on(
			table.organizationId,
			table.legalEntityDimensionId,
		),
		uniqueIndex("ca_legal_company_org_create_idempotency_uidx").on(
			table.organizationId,
			table.createIdempotencyKey,
		),
		index("ca_legal_company_org_id_idx").on(table.organizationId, table.id),
		index("ca_legal_company_org_status_idx").on(
			table.organizationId,
			table.status,
			table.normalizedCode,
			table.id,
		),
		index("ca_legal_company_org_party_idx").on(
			table.organizationId,
			table.legalPartyId,
		),
		check(
			"ca_legal_company_status_chk",
			sql`${table.status} IN (
				'draft',
				'active',
				'suspended',
				'dissolved',
				'archived'
			)`,
		),
		check("ca_legal_company_version_chk", sql`${table.version} >= 1`),
		check(
			"ca_legal_company_code_chk",
			sql`length(btrim(${table.code})) > 0`,
		),
		check(
			"ca_legal_company_normalized_code_chk",
			sql`length(btrim(${table.normalizedCode})) > 0`,
		),
		check(
			"ca_legal_company_dimension_key_chk",
			sql`length(btrim(${table.legalEntityKeySnapshot})) > 0`,
		),
		check(
			"ca_legal_company_dimension_name_chk",
			sql`length(btrim(${table.legalEntityNameSnapshot})) > 0`,
		),
		check(
			"ca_legal_company_fye_month_chk",
			sql`
				${table.fiscalYearEndMonth} IS NULL
				OR ${table.fiscalYearEndMonth} BETWEEN 1 AND 12
			`,
		),
		check(
			"ca_legal_company_fye_day_chk",
			sql`
				${table.fiscalYearEndDay} IS NULL
				OR ${table.fiscalYearEndDay} BETWEEN 1 AND 31
			`,
		),
		check(
			"ca_legal_company_fye_pair_chk",
			sql`
				(
					${table.fiscalYearEndMonth} IS NULL
					AND ${table.fiscalYearEndDay} IS NULL
				)
				OR
				(
					${table.fiscalYearEndMonth} IS NOT NULL
					AND ${table.fiscalYearEndDay} IS NOT NULL
				)
			`,
		),
		check(
			"ca_legal_company_date_chronology_chk",
			sql`
				${table.incorporationDate} IS NULL
				OR ${table.commencementDate} IS NULL
				OR ${table.commencementDate} >= ${table.incorporationDate}
			`,
		),
		check(
			"ca_legal_company_party_snapshot_chk",
			sql`
				(
					${table.legalPartyId} IS NULL
					AND ${table.legalPartyCodeSnapshot} IS NULL
					AND ${table.legalPartyNameSnapshot} IS NULL
				)
				OR
				(
					${table.legalPartyId} IS NOT NULL
					AND ${table.legalPartyNameSnapshot} IS NOT NULL
					AND length(btrim(${table.legalPartyNameSnapshot})) > 0
				)
			`,
		),
		check(
			"ca_legal_company_activation_pair_chk",
			sql`
				(
					${table.activatedAt} IS NULL
					AND ${table.activatedBy} IS NULL
				)
				OR
				(
					${table.activatedAt} IS NOT NULL
					AND ${table.activatedBy} IS NOT NULL
				)
			`,
		),
		check(
			"ca_legal_company_suspension_pair_chk",
			sql`
				(
					${table.suspendedAt} IS NULL
					AND ${table.suspendedBy} IS NULL
				)
				OR
				(
					${table.suspendedAt} IS NOT NULL
					AND ${table.suspendedBy} IS NOT NULL
				)
			`,
		),
		check(
			"ca_legal_company_dissolution_pair_chk",
			sql`
				(
					${table.dissolvedAt} IS NULL
					AND ${table.dissolvedBy} IS NULL
				)
				OR
				(
					${table.dissolvedAt} IS NOT NULL
					AND ${table.dissolvedBy} IS NOT NULL
				)
			`,
		),
		check(
			"ca_legal_company_archive_pair_chk",
			sql`
				(
					${table.archivedAt} IS NULL
					AND ${table.archivedBy} IS NULL
				)
				OR
				(
					${table.archivedAt} IS NOT NULL
					AND ${table.archivedBy} IS NOT NULL
				)
			`,
		),
	],
);

export const caCompanyName = pgTable(
	"ca_company_name",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),
		nameType: text("name_type").$type<CaCompanyNameType>().notNull(),
		displayName: text("display_name").notNull(),
		normalizedName: text("normalized_name").notNull(),
		isPrimary: integer("is_primary").notNull().default(0),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		supersedesCompanyNameId: uuid("supersedes_company_name_id"),
		correctionReason: text("correction_reason"),
		version: integer("version").notNull().default(1),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("ca_company_name_org_company_idx").on(
			table.organizationId,
			table.legalCompanyId,
			table.id,
		),
		index("ca_company_name_org_company_effective_idx").on(
			table.organizationId,
			table.legalCompanyId,
			table.nameType,
			table.effectiveFrom,
			table.effectiveTo,
		),
		index("ca_company_name_org_normalized_name_idx").on(
			table.organizationId,
			table.normalizedName,
		),
		uniqueIndex("ca_company_name_org_idempotency_uidx").on(
			table.organizationId,
			table.idempotencyKey,
		),
		check(
			"ca_company_name_type_chk",
			sql`${table.nameType} IN ('legal', 'former', 'trading')`,
		),
		check(
			"ca_company_name_display_name_chk",
			sql`length(btrim(${table.displayName})) > 0`,
		),
		check(
			"ca_company_name_normalized_name_chk",
			sql`length(btrim(${table.normalizedName})) > 0`,
		),
		check(
			"ca_company_name_primary_chk",
			sql`${table.isPrimary} IN (0, 1)`,
		),
		check(
			"ca_company_name_effective_range_chk",
			sql`
				${table.effectiveTo} IS NULL
				OR ${table.effectiveTo} > ${table.effectiveFrom}
			`,
		),
		check("ca_company_name_version_chk", sql`${table.version} >= 1`),
		check(
			"ca_company_name_supersession_chk",
			sql`
				${table.supersedesCompanyNameId} IS NULL
				OR ${table.supersedesCompanyNameId} <> ${table.id}
			`,
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
			.references(() => caLegalCompany.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),
		identifierType: text("identifier_type").notNull(),
		jurisdictionCountryId: uuid("jurisdiction_country_id"),
		authorityPartyId: uuid("authority_party_id").references(() => mdParty.id, {
			onDelete: "restrict",
			onUpdate: "cascade",
		}),
		identifierValue: text("identifier_value").notNull(),
		normalizedIdentifierValue: text("normalized_identifier_value").notNull(),
		isPrimary: integer("is_primary").notNull().default(0),
		status: text("status")
			.$type<CaCompanyIdentifierStatus>()
			.notNull()
			.default("active"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		version: integer("version").notNull().default(1),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("ca_company_identifier_org_company_idx").on(
			table.organizationId,
			table.legalCompanyId,
			table.id,
		),
		index("ca_company_identifier_org_company_effective_idx").on(
			table.organizationId,
			table.legalCompanyId,
			table.identifierType,
			table.effectiveFrom,
			table.effectiveTo,
		),
		index("ca_company_identifier_org_authority_idx").on(
			table.organizationId,
			table.authorityPartyId,
		),
		uniqueIndex("ca_company_identifier_org_type_value_uidx").on(
			table.organizationId,
			table.identifierType,
			table.normalizedIdentifierValue,
		),
		uniqueIndex("ca_company_identifier_org_idempotency_uidx").on(
			table.organizationId,
			table.idempotencyKey,
		),
		check(
			"ca_company_identifier_type_chk",
			sql`length(btrim(${table.identifierType})) > 0`,
		),
		check(
			"ca_company_identifier_value_chk",
			sql`length(btrim(${table.identifierValue})) > 0`,
		),
		check(
			"ca_company_identifier_normalized_value_chk",
			sql`length(btrim(${table.normalizedIdentifierValue})) > 0`,
		),
		check(
			"ca_company_identifier_primary_chk",
			sql`${table.isPrimary} IN (0, 1)`,
		),
		check(
			"ca_company_identifier_status_chk",
			sql`${table.status} IN ('active', 'retired')`,
		),
		check(
			"ca_company_identifier_effective_range_chk",
			sql`
				${table.effectiveTo} IS NULL
				OR ${table.effectiveTo} > ${table.effectiveFrom}
			`,
		),
		check(
			"ca_company_identifier_version_chk",
			sql`${table.version} >= 1`,
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
			.references(() => caLegalCompany.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),
		fromStatus: text("from_status").$type<CaLegalCompanyStatus>(),
		toStatus: text("to_status").$type<CaLegalCompanyStatus>().notNull(),
		effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
		reasonCode: text("reason_code"),
		reason: text("reason"),
		resolutionReference: text("resolution_reference"),
		evidenceDocumentReference: text("evidence_document_reference"),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		causationId: text("causation_id"),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("ca_company_status_history_org_company_idx").on(
			table.organizationId,
			table.legalCompanyId,
			table.effectiveAt,
			table.id,
		),
		uniqueIndex("ca_company_status_history_org_idempotency_uidx").on(
			table.organizationId,
			table.idempotencyKey,
		),
		check(
			"ca_company_status_history_from_status_chk",
			sql`
				${table.fromStatus} IS NULL
				OR ${table.fromStatus} IN (
					'draft',
					'active',
					'suspended',
					'dissolved',
					'archived'
				)
			`,
		),
		check(
			"ca_company_status_history_to_status_chk",
			sql`
				${table.toStatus} IN (
					'draft',
					'active',
					'suspended',
					'dissolved',
					'archived'
				)
			`,
		),
		check(
			"ca_company_status_history_transition_chk",
			sql`
				${table.fromStatus} IS NULL
				OR ${table.fromStatus} <> ${table.toStatus}
			`,
		),
	],
);

export type CaLegalCompanyRow = typeof caLegalCompany.$inferSelect;
export type NewCaLegalCompanyRow = typeof caLegalCompany.$inferInsert;

export type CaCompanyNameRow = typeof caCompanyName.$inferSelect;
export type NewCaCompanyNameRow = typeof caCompanyName.$inferInsert;

export type CaCompanyIdentifierRow =
	typeof caCompanyIdentifier.$inferSelect;
export type NewCaCompanyIdentifierRow =
	typeof caCompanyIdentifier.$inferInsert;

export type CaCompanyStatusHistoryRow =
	typeof caCompanyStatusHistory.$inferSelect;
export type NewCaCompanyStatusHistoryRow =
	typeof caCompanyStatusHistory.$inferInsert;

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
		requestFingerprint: text("request_fingerprint").notNull(),
		supersedesOfficerAppointmentId: uuid(
			"supersedes_officer_appointment_id",
		),
		amendmentReason: text("amendment_reason"),
		endReason: text("end_reason"),
		endEvidenceReference: text("end_evidence_reference"),
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
		requestFingerprint: text("request_fingerprint").notNull(),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		retirementReason: text("retirement_reason"),
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
		requestFingerprint: text("request_fingerprint").notNull(),
		endReason: text("end_reason"),
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
		minimumSignatories: integer("minimum_signatories").notNull().default(1),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		grantEvidenceReference: text("grant_evidence_reference"),
		revocationEvidenceReference: text("revocation_evidence_reference"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		supersedesAuthorityMandateId: uuid("supersedes_authority_mandate_id"),
		amendmentReason: text("amendment_reason"),
		revocationReason: text("revocation_reason"),
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

/** party | officer */
export const caAuthorityMandateHolder = pgTable(
	"ca_authority_mandate_holder",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id")
			.notNull()
			.references(() => caLegalCompany.id),
		authorityMandateId: uuid("authority_mandate_id")
			.notNull()
			.references(() => caAuthorityMandate.id),
		holderKind: text("holder_kind").notNull(),
		partyId: uuid("party_id"),
		partyCodeSnapshot: text("party_code_snapshot"),
		partyNameSnapshot: text("party_name_snapshot"),
		officerAppointmentId: uuid("officer_appointment_id").references(
			() => caOfficerAppointment.id,
		),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_authority_mandate_holder_org_mandate_idx").on(
			t.organizationId,
			t.authorityMandateId,
		),
		index("ca_authority_mandate_holder_org_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
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
		requestFingerprint: text("request_fingerprint").notNull(),
		supersedesCompanyPremiseId: uuid("supersedes_company_premise_id"),
		amendmentReason: text("amendment_reason"),
		retirementReason: text("retirement_reason"),
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
		requestFingerprint: text("request_fingerprint").notNull(),
		correctsGovernanceMeetingId: uuid("corrects_governance_meeting_id"),
		correctionReason: text("correction_reason"),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		closedBy: text("closed_by"),
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
		approvalEvidenceReference: text("approval_evidence_reference"),
		supersedesResolutionId: uuid("supersedes_resolution_id"),
		supersededById: uuid("superseded_by_id"),
		supersededAt: timestamp("superseded_at", { withTimezone: true }),
		revokedDate: date("revoked_date"),
		revocationReason: text("revocation_reason"),
		revocationEvidenceReference: text("revocation_evidence_reference"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
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
		normalizedTitleReference: text("normalized_title_reference").notNull(),
		propertyDescription: text("property_description").notNull(),
		ownershipPercentage: numeric("ownership_percentage", {
			precision: 24,
			scale: 12,
		}).notNull(),
		acquisitionDate: date("acquisition_date").notNull(),
		disposalDate: date("disposal_date"),
		tenureType: text("tenure_type"),
		valuationReference: text("valuation_reference"),
		disposalReason: text("disposal_reason"),
		disposalEvidenceReference: text("disposal_evidence_reference"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("ca_property_holding_org_company_title_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedTitleReference,
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
		assetCategory: text("category").notNull(),
		identifier: text("asset_identifier"),
		normalizedIdentifier: text("normalized_identifier"),
		description: text("description").notNull(),
		custodianPartyId: uuid("custodian_party_id"),
		custodianPartyCodeSnapshot: text("custodian_party_code_snapshot"),
		custodianPartyNameSnapshot: text("custodian_party_name_snapshot"),
		acquisitionDate: date("acquisition_date").notNull(),
		disposalDate: date("disposal_date"),
		writeOffDate: date("write_off_date"),
		terminalReason: text("terminal_reason"),
		terminalEvidenceReference: text("terminal_evidence_reference"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("ca_corporate_asset_org_company_identifier_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedIdentifier,
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
		applicationNumber: text("application_number"),
		registrationNumber: text("registration_number"),
		normalizedRightNumber: text("normalized_right_number").notNull(),
		ownerPartyId: uuid("owner_party_id").notNull(),
		ownerPartyCodeSnapshot: text("owner_party_code_snapshot"),
		ownerPartyNameSnapshot: text("owner_party_name_snapshot"),
		filingDate: date("filing_date"),
		grantDate: date("grant_date"),
		expiryDate: date("expiry_date"),
		lastRenewalDate: date("renewal_date"),
		disposalDate: date("disposal_date"),
		terminalReason: text("terminal_reason"),
		terminalEvidenceReference: text("terminal_evidence_reference"),
		status: text("status").notNull().default("pending"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		index("ca_intellectual_property_right_org_identity_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.rightType,
			t.jurisdictionCode,
			t.normalizedRightNumber,
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
		insurerPartyId: uuid("insurer_party_id").notNull(),
		insurerPartyCodeSnapshot: text("insurer_party_code_snapshot"),
		insurerPartyNameSnapshot: text("insurer_party_name_snapshot"),
		coveredSubjectKind: text("covered_subject_kind").notNull(),
		coveredPropertyHoldingId: uuid("covered_property_holding_id"),
		coveredCorporateAssetId: uuid("covered_corporate_asset_id"),
		coveredIntellectualPropertyRightId: uuid(
			"covered_intellectual_property_right_id",
		),
		coveredSubjectDescription: text("covered_subject_description"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		limitAmount: numeric("limit_amount", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		documentReference: text("document_reference").notNull(),
		cancellationDate: date("cancellation_date"),
		cancellationReason: text("cancellation_reason"),
		cancellationEvidenceReference: text("cancellation_evidence_reference"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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
		securedPartyId: uuid("secured_party_id").notNull(),
		securedPartyCodeSnapshot: text("secured_party_code_snapshot"),
		securedPartyNameSnapshot: text("secured_party_name_snapshot"),
		affectedSubjectKind: text("affected_subject_kind").notNull(),
		affectedPropertyHoldingId: uuid("affected_property_holding_id"),
		affectedCorporateAssetId: uuid("affected_corporate_asset_id"),
		affectedIntellectualPropertyRightId: uuid(
			"affected_intellectual_property_right_id",
		),
		affectedSubjectDescription: text("affected_subject_description"),
		amount: numeric("amount", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		priorityRank: integer("priority_rank").notNull(),
		createdDate: date("created_date").notNull(),
		releasedDate: date("released_date"),
		creationEvidenceReference: text("creation_evidence_reference").notNull(),
		releaseReason: text("release_reason"),
		releaseEvidenceReference: text("release_evidence_reference"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createIdempotencyKey: text("create_idempotency_key").notNull(),
		createRequestFingerprint: text("create_request_fingerprint").notNull(),
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

export const caIntellectualPropertyRenewal = pgTable(
	"ca_intellectual_property_renewal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		intellectualPropertyRightId: uuid("intellectual_property_right_id")
			.notNull()
			.references(() => caIntellectualPropertyRight.id),
		renewalDate: date("renewal_date").notNull(),
		previousExpiryDate: date("previous_expiry_date"),
		newExpiryDate: date("new_expiry_date").notNull(),
		evidenceReference: text("evidence_reference").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_ip_renewal_org_right_idx").on(
			t.organizationId,
			t.intellectualPropertyRightId,
		),
		uniqueIndex("ca_ip_renewal_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
	],
);

export const caInsurancePolicyRenewal = pgTable(
	"ca_insurance_policy_renewal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		insurancePolicyId: uuid("insurance_policy_id")
			.notNull()
			.references(() => caInsurancePolicy.id),
		renewalDate: date("renewal_date").notNull(),
		previousEffectiveTo: date("previous_effective_to"),
		newEffectiveTo: date("new_effective_to").notNull(),
		limitAmount: numeric("limit_amount", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		documentReference: text("document_reference").notNull(),
		evidenceReference: text("evidence_reference").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_insurance_renewal_org_policy_idx").on(
			t.organizationId,
			t.insurancePolicyId,
		),
		uniqueIndex("ca_insurance_renewal_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
	],
);

export const caChargeVariation = pgTable(
	"ca_charge_variation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		chargeId: uuid("charge_id")
			.notNull()
			.references(() => caCharge.id),
		variationDate: date("variation_date").notNull(),
		amount: numeric("amount", { precision: 24, scale: 12 }),
		currencyCode: text("currency_code"),
		priorityRank: integer("priority_rank").notNull(),
		evidenceReference: text("evidence_reference").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_charge_variation_org_charge_idx").on(
			t.organizationId,
			t.chargeId,
		),
		uniqueIndex("ca_charge_variation_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
	],
);

export const caPropertyAssetMutationReceipt = pgTable(
	"ca_property_asset_mutation_receipt",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		commandId: text("command_id").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: uuid("entity_id").notNull(),
		resultVersion: integer("result_version").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_property_asset_receipt_org_key_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		index("ca_property_asset_receipt_org_entity_idx").on(
			t.organizationId,
			t.entityType,
			t.entityId,
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
