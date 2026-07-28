import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const caMutationReceipt = pgTable(
	"ca_mutation_receipt",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		commandId: text("command_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		fingerprint: text("fingerprint").notNull(),
		reservationToken: text("reservation_token").notNull(),
		status: text("status").notNull(),
		result: text("result"),
		reservedAt: timestamp("reserved_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		recordVersion: integer("record_version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_mutation_receipt_scope_uidx").on(
			t.organizationId,
			t.commandId,
			t.idempotencyKey,
		),
		index("ca_mutation_receipt_org_status_idx").on(t.organizationId, t.status),
		index("ca_mutation_receipt_org_updated_idx").on(
			t.organizationId,
			t.updatedAt,
		),
		check(
			"ca_mutation_receipt_status_check",
			sql`${t.status} IN ('in_progress', 'completed', 'released')`,
		),
		check(
			"ca_mutation_receipt_scope_check",
			sql`char_length(btrim(${t.organizationId})) > 0 AND char_length(btrim(${t.commandId})) > 0 AND char_length(btrim(${t.idempotencyKey})) > 0`,
		),
		check(
			"ca_mutation_receipt_fingerprint_check",
			sql`${t.fingerprint} ~ '^[0-9a-f]{64}$'`,
		),
		check(
			"ca_mutation_receipt_completion_check",
			sql`(${t.status} = 'completed' AND ${t.completedAt} IS NOT NULL AND ${t.result} IS NOT NULL) OR (${t.status} <> 'completed' AND ${t.completedAt} IS NULL AND ${t.result} IS NULL)`,
		),
		check(
			"ca_mutation_receipt_reservation_check",
			sql`char_length(${t.reservationToken}) > 0`,
		),
		check(
			"ca_mutation_receipt_record_version_check",
			sql`${t.recordVersion} > 0`,
		),
	],
);

export const caLegalCompany = pgTable(
	"ca_legal_company",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		companyCode: text("company_code").notNull(),
		normalizedCompanyCode: text("normalized_company_code").notNull(),
		displayName: text("display_name").notNull(),
		masterDataPartyId: text("master_data_party_id").notNull(),
		homeJurisdictionCountryCode: text(
			"home_jurisdiction_country_code",
		).notNull(),
		state: text("state").notNull().default("draft"),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_legal_company_org_code_uidx").on(
			t.organizationId,
			t.normalizedCompanyCode,
		),
		index("ca_legal_company_org_state_idx").on(t.organizationId, t.state),
		index("ca_legal_company_org_party_idx").on(
			t.organizationId,
			t.masterDataPartyId,
		),
		check(
			"ca_legal_company_state_check",
			sql`${t.state} IN ('draft', 'active', 'suspended', 'struck_off', 'in_liquidation', 'dissolved', 'restored', 'archived')`,
		),
		check(
			"ca_legal_company_code_check",
			sql`char_length(btrim(${t.companyCode})) > 0 AND char_length(btrim(${t.normalizedCompanyCode})) > 0`,
		),
		check(
			"ca_legal_company_country_check",
			sql`${t.homeJurisdictionCountryCode} ~ '^[A-Z]{2}$'`,
		),
		check("ca_legal_company_version_check", sql`${t.version} > 0`),
	],
);

export const caCompanyStatusHistory = pgTable(
	"ca_company_status_history",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		reason: text("reason"),
		sourceDocumentId: text("source_document_id").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_company_status_version_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.version,
		),
		index("ca_company_status_as_of_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedAt,
		),
		index("ca_company_status_value_idx").on(
			t.organizationId,
			t.status,
			t.effectiveFrom,
			t.effectiveTo,
		),
		check(
			"ca_company_status_value_check",
			sql`${t.status} IN ('draft', 'active', 'suspended', 'struck_off', 'in_liquidation', 'dissolved', 'restored', 'archived')`,
		),
		check(
			"ca_company_status_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_company_status_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check(
			"ca_company_status_reason_check",
			sql`${t.reason} IS NULL OR char_length(btrim(${t.reason})) > 0`,
		),
		check("ca_company_status_version_check", sql`${t.version} > 0`),
	],
);

export const caCompanyJurisdictionProfile = pgTable(
	"ca_company_jurisdiction_profile",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		jurisdictionCountryCode: text("jurisdiction_country_code").notNull(),
		entityType: text("entity_type").notNull(),
		regulatorCode: text("regulator_code"),
		complianceProfileCode: text("compliance_profile_code"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedFrom: timestamp("recorded_from", { withTimezone: true }).notNull(),
		recordedTo: timestamp("recorded_to", { withTimezone: true }),
		recordedBy: text("recorded_by").notNull(),
		sourceReference: text("source_reference").notNull(),
		sourceDocumentId: text("source_document_id"),
		correctionReason: text("correction_reason"),
		supersedesId: uuid("supersedes_id"),
		supersededAt: timestamp("superseded_at", { withTimezone: true }),
		supersededByProfileId: uuid("superseded_by_profile_id"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_jurisdiction_profile_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_company_jurisdiction_profile_effective_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("ca_company_jurisdiction_profile_recorded_idx").on(
			t.organizationId,
			t.recordedAt,
		),
		index("ca_company_jurisdiction_profile_known_at_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedFrom,
			t.recordedTo,
		),
		uniqueIndex("ca_company_jurisdiction_profile_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		check(
			"ca_company_jurisdiction_profile_country_check",
			sql`${t.jurisdictionCountryCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_company_jurisdiction_profile_entity_type_check",
			sql`${t.entityType} ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'`,
		),
		check(
			"ca_company_jurisdiction_profile_regulator_code_check",
			sql`${t.regulatorCode} IS NULL OR ${t.regulatorCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_company_jurisdiction_profile_compliance_profile_code_check",
			sql`${t.complianceProfileCode} IS NULL OR ${t.complianceProfileCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_company_jurisdiction_profile_source_check",
			sql`char_length(btrim(${t.sourceReference})) > 0`,
		),
		check(
			"ca_company_jurisdiction_profile_source_document_check",
			sql`${t.sourceDocumentId} IS NULL OR char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check(
			"ca_company_jurisdiction_profile_correction_reason_check",
			sql`${t.correctionReason} IS NULL OR char_length(btrim(${t.correctionReason})) > 0`,
		),
		check(
			"ca_company_jurisdiction_profile_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_company_jurisdiction_profile_recorded_range_check",
			sql`${t.recordedTo} IS NULL OR ${t.recordedFrom} <= ${t.recordedTo}`,
		),
		check(
			"ca_company_jurisdiction_profile_supersedes_self_check",
			sql`${t.supersedesId} IS NULL OR ${t.supersedesId} <> ${t.id}`,
		),
		check(
			"ca_company_jurisdiction_profile_supersession_check",
			sql`(${t.supersededAt} IS NULL AND ${t.supersededByProfileId} IS NULL) OR (${t.supersededAt} IS NOT NULL AND ${t.supersededByProfileId} IS NOT NULL)`,
		),
		check(
			"ca_company_jurisdiction_profile_version_check",
			sql`${t.version} > 0`,
		),
	],
);

export const caCompanyName = pgTable(
	"ca_company_name",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		nameType: text("name_type").notNull(),
		languageCode: text("language_code").notNull(),
		displayName: text("display_name").notNull(),
		normalizedName: text("normalized_name").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedFrom: timestamp("recorded_from", { withTimezone: true }).notNull(),
		recordedTo: timestamp("recorded_to", { withTimezone: true }),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id"),
		correctionReason: text("correction_reason"),
		status: text("status").notNull().default("active"),
		supersedesId: uuid("supersedes_id"),
		supersededAt: timestamp("superseded_at", { withTimezone: true }),
		supersededByNameId: uuid("superseded_by_name_id"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retirementReason: text("retirement_reason"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_name_company_idx").on(t.organizationId, t.legalCompanyId),
		index("ca_company_name_scope_effective_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.nameType,
			t.languageCode,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("ca_company_name_scope_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.nameType,
			t.languageCode,
		),
		index("ca_company_name_effective_from_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
		),
		index("ca_company_name_normalized_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.nameType,
			t.languageCode,
			t.normalizedName,
		),
		index("ca_company_name_normalized_name_idx").on(t.normalizedName),
		index("ca_company_name_recorded_at_idx").on(t.recordedAt),
		index("ca_company_name_supersedes_idx").on(t.supersedesId),
		index("ca_company_name_known_at_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.nameType,
			t.languageCode,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedFrom,
			t.recordedTo,
		),
		uniqueIndex("ca_company_name_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		check(
			"ca_company_name_type_check",
			sql`${t.nameType} IN ('legal', 'former', 'translated', 'trading')`,
		),
		check(
			"ca_company_name_language_check",
			sql`${t.languageCode} ~ '^[a-z]{2,3}(-[A-Z]{2})?$'`,
		),
		check(
			"ca_company_name_display_check",
			sql`char_length(btrim(${t.displayName})) > 0 AND char_length(btrim(${t.normalizedName})) > 0`,
		),
		check(
			"ca_company_name_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_company_name_recorded_range_check",
			sql`${t.recordedTo} IS NULL OR ${t.recordedFrom} <= ${t.recordedTo}`,
		),
		check(
			"ca_company_name_status_check",
			sql`${t.status} IN ('active', 'superseded', 'retired')`,
		),
		check(
			"ca_company_name_supersedes_self_check",
			sql`${t.supersedesId} IS NULL OR ${t.supersedesId} <> ${t.id}`,
		),
		check(
			"ca_company_name_supersession_check",
			sql`(${t.status} = 'superseded' AND ${t.supersededAt} IS NOT NULL AND ${t.supersededByNameId} IS NOT NULL) OR (${t.status} <> 'superseded')`,
		),
		check(
			"ca_company_name_retirement_check",
			sql`(${t.status} = 'retired' AND ${t.retiredAt} IS NOT NULL AND ${t.retirementReason} IS NOT NULL) OR (${t.status} <> 'retired')`,
		),
		check("ca_company_name_version_check", sql`${t.version} > 0`),
	],
);

export const caCompanyLegalFormHistory = pgTable(
	"ca_company_legal_form_history",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		legalFormCode: text("legal_form_code").notNull(),
		entityTypeCode: text("entity_type_code").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedFrom: timestamp("recorded_from", { withTimezone: true }).notNull(),
		recordedTo: timestamp("recorded_to", { withTimezone: true }),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id"),
		correctionReason: text("correction_reason"),
		status: text("status").notNull().default("active"),
		supersedesId: uuid("supersedes_id"),
		supersededAt: timestamp("superseded_at", { withTimezone: true }),
		supersededByLegalFormId: uuid("superseded_by_legal_form_id"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_legal_form_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_company_legal_form_effective_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("ca_company_legal_form_effective_from_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
		),
		index("ca_company_legal_form_jurisdiction_form_idx").on(
			t.organizationId,
			t.jurisdictionCode,
			t.legalFormCode,
		),
		index("ca_company_legal_form_recorded_at_idx").on(t.recordedAt),
		index("ca_company_legal_form_supersedes_idx").on(t.supersedesId),
		index("ca_company_legal_form_known_at_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedFrom,
			t.recordedTo,
		),
		uniqueIndex("ca_company_legal_form_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		check(
			"ca_company_legal_form_jurisdiction_check",
			sql`${t.jurisdictionCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_company_legal_form_code_check",
			sql`${t.legalFormCode} ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$' AND ${t.entityTypeCode} ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'`,
		),
		check(
			"ca_company_legal_form_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_company_legal_form_recorded_range_check",
			sql`${t.recordedTo} IS NULL OR ${t.recordedFrom} <= ${t.recordedTo}`,
		),
		check(
			"ca_company_legal_form_status_check",
			sql`${t.status} IN ('active', 'superseded')`,
		),
		check(
			"ca_company_legal_form_supersedes_self_check",
			sql`${t.supersedesId} IS NULL OR ${t.supersedesId} <> ${t.id}`,
		),
		check(
			"ca_company_legal_form_supersession_check",
			sql`(${t.status} = 'superseded' AND ${t.supersededAt} IS NOT NULL AND ${t.supersededByLegalFormId} IS NOT NULL) OR (${t.status} <> 'superseded')`,
		),
		check("ca_company_legal_form_version_check", sql`${t.version} > 0`),
	],
);

export const caCompanyIdentifier = pgTable(
	"ca_company_identifier",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		identifierType: text("identifier_type").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		issuingAuthorityCode: text("authority_code").notNull(),
		identifierValue: text("display_value").notNull(),
		normalizedIdentifierValue: text("normalized_value").notNull(),
		uniquenessScope: text("uniqueness_scope")
			.notNull()
			.default("tenant_authority"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedFrom: timestamp("recorded_from", { withTimezone: true }).notNull(),
		recordedTo: timestamp("recorded_to", { withTimezone: true }),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		correctionReason: text("correction_reason"),
		status: text("status").notNull().default("active"),
		supersedesId: uuid("supersedes_id"),
		supersededAt: timestamp("superseded_at", { withTimezone: true }),
		supersededByIdentifierId: uuid("superseded_by_identifier_id"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retirementReason: text("retirement_reason"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_identifier_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_company_identifier_scope_effective_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.identifierType,
			t.jurisdictionCode,
			t.issuingAuthorityCode,
			t.normalizedIdentifierValue,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("ca_company_identifier_known_at_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.identifierType,
			t.jurisdictionCode,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedFrom,
			t.recordedTo,
		),
		index("ca_company_identifier_recorded_at_idx").on(t.recordedAt),
		index("ca_company_identifier_supersedes_idx").on(t.supersedesId),
		uniqueIndex("ca_company_identifier_supersedes_once_uidx")
			.on(t.organizationId, t.legalCompanyId, t.supersedesId)
			.where(sql`${t.supersedesId} IS NOT NULL`),
		index("ca_company_identifier_type_authority_idx").on(
			t.identifierType,
			t.jurisdictionCode,
			t.issuingAuthorityCode,
		),
		index("ca_company_identifier_normalized_value_idx").on(
			t.normalizedIdentifierValue,
		),
		uniqueIndex("ca_company_identifier_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		check(
			"ca_company_identifier_type_check",
			sql`${t.identifierType} IN ('company_registration', 'registry_number', 'business_registration', 'foreign_registration', 'legal_entity_identifier', 'statistical_identifier', 'industry_identifier', 'other_non_tax_identifier')`,
		),
		check(
			"ca_company_identifier_not_tax_check",
			sql`${t.identifierType} !~* '(tax|vat|gst|sst|tin)'`,
		),
		check(
			"ca_company_identifier_jurisdiction_check",
			sql`${t.jurisdictionCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_company_identifier_value_check",
			sql`char_length(btrim(${t.identifierValue})) > 0 AND char_length(btrim(${t.normalizedIdentifierValue})) > 0`,
		),
		check(
			"ca_company_identifier_uniqueness_scope_check",
			sql`${t.uniquenessScope} IN ('global_authority', 'tenant_authority', 'company_authority')`,
		),
		check(
			"ca_company_identifier_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_company_identifier_recorded_range_check",
			sql`${t.recordedTo} IS NULL OR ${t.recordedFrom} <= ${t.recordedTo}`,
		),
		check(
			"ca_company_identifier_status_check",
			sql`${t.status} IN ('active', 'superseded', 'retired')`,
		),
		check(
			"ca_company_identifier_supersedes_self_check",
			sql`${t.supersedesId} IS NULL OR ${t.supersedesId} <> ${t.id}`,
		),
		check("ca_company_identifier_version_check", sql`${t.version} > 0`),
	],
);

export const caCompanyFinancialYear = pgTable(
	"ca_company_financial_year",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		fiscalYearStartMonth: integer("year_end_month").notNull(),
		fiscalYearStartDay: integer("year_end_day").notNull(),
		calendarType: text("calendar_type").notNull().default("gregorian"),
		reportingCurrencyCode: text("functional_currency_code").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedFrom: timestamp("recorded_from", { withTimezone: true }).notNull(),
		recordedTo: timestamp("recorded_to", { withTimezone: true }),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		correctionReason: text("correction_reason"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_financial_year_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_company_financial_year_effective_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("ca_company_financial_year_known_at_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedFrom,
			t.recordedTo,
		),
		uniqueIndex("ca_company_financial_year_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		check(
			"ca_company_financial_year_start_check",
			sql`${t.fiscalYearStartMonth} BETWEEN 1 AND 12 AND ${t.fiscalYearStartDay} BETWEEN 1 AND 31`,
		),
		check(
			"ca_company_financial_year_calendar_check",
			sql`${t.calendarType} IN ('gregorian')`,
		),
		check(
			"ca_company_financial_year_currency_check",
			sql`${t.reportingCurrencyCode} ~ '^[A-Z]{3}$'`,
		),
		check(
			"ca_company_financial_year_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_company_financial_year_recorded_range_check",
			sql`${t.recordedTo} IS NULL OR ${t.recordedFrom} <= ${t.recordedTo}`,
		),
		check(
			"ca_company_financial_year_status_check",
			sql`${t.status} IN ('active')`,
		),
		check("ca_company_financial_year_version_check", sql`${t.version} > 0`),
	],
);

export const caCompanyActivity = pgTable(
	"ca_company_activity",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		classification: text("activity_type").notNull(),
		classificationSystem: text("classification_system")
			.notNull()
			.default("registered_activity"),
		activityCode: text("activity_code").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		regulatorCode: text("regulator_code"),
		description: text("description").notNull(),
		isPrimary: boolean("is_primary").notNull().default(false),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedFrom: timestamp("recorded_from", { withTimezone: true }).notNull(),
		recordedTo: timestamp("recorded_to", { withTimezone: true }),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_company_activity_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
		),
		index("ca_company_activity_as_of_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.classification,
			t.classificationSystem,
			t.jurisdictionCode,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("ca_company_activity_known_at_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedFrom,
			t.recordedTo,
		),
		uniqueIndex("ca_company_activity_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		check(
			"ca_company_activity_classification_check",
			sql`${t.classification} IN ('registered_object', 'regulated', 'operational')`,
		),
		check(
			"ca_company_activity_classification_system_check",
			sql`char_length(btrim(${t.classificationSystem})) > 0`,
		),
		check(
			"ca_company_activity_regulator_check",
			sql`${t.classification} <> 'regulated' OR ${t.regulatorCode} IS NOT NULL`,
		),
		check(
			"ca_company_activity_jurisdiction_check",
			sql`${t.jurisdictionCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_company_activity_code_check",
			sql`${t.activityCode} ~ '^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$'`,
		),
		check(
			"ca_company_activity_description_check",
			sql`char_length(btrim(${t.description})) > 0`,
		),
		check(
			"ca_company_activity_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_company_activity_recorded_range_check",
			sql`${t.recordedTo} IS NULL OR ${t.recordedFrom} <= ${t.recordedTo}`,
		),
		check(
			"ca_company_activity_status_check",
			sql`${t.status} IN ('active', 'ended')`,
		),
		check("ca_company_activity_version_check", sql`${t.version} > 0`),
	],
);

export const caLegalEstablishment = pgTable(
	"ca_legal_establishment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		establishmentType: text("establishment_type").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		registrationIdentifier: text("registration_identifier").notNull(),
		normalizedRegistrationIdentifier: text(
			"normalized_registration_identifier",
		).notNull(),
		displayName: text("display_name").notNull(),
		currentStatus: text("current_status").notNull().default("registered"),
		registeredFrom: date("registered_from").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_legal_establishment_natural_key_uidx").on(
			t.organizationId,
			t.jurisdictionCode,
			t.establishmentType,
			t.normalizedRegistrationIdentifier,
		),
		uniqueIndex("ca_legal_establishment_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_legal_establishment_company_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.currentStatus,
		),
		check(
			"ca_legal_establishment_type_check",
			sql`${t.establishmentType} IN ('branch', 'representative_office', 'foreign_registration', 'other')`,
		),
		check(
			"ca_legal_establishment_status_check",
			sql`${t.currentStatus} IN ('registered', 'active', 'suspended', 'closed')`,
		),
		check(
			"ca_legal_establishment_jurisdiction_check",
			sql`${t.jurisdictionCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_legal_establishment_identifier_check",
			sql`char_length(btrim(${t.registrationIdentifier})) > 0 AND ${t.normalizedRegistrationIdentifier} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_legal_establishment_display_name_check",
			sql`char_length(btrim(${t.displayName})) > 0`,
		),
		check("ca_legal_establishment_version_check", sql`${t.version} > 0`),
	],
);

export const caEstablishmentStatusHistory = pgTable(
	"ca_establishment_status_history",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		legalEstablishmentId: uuid("legal_establishment_id").notNull(),
		status: text("status").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		reason: text("reason"),
		sourceDocumentId: text("source_document_id").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_establishment_status_version_uidx").on(
			t.organizationId,
			t.legalEstablishmentId,
			t.version,
		),
		index("ca_establishment_status_as_of_idx").on(
			t.organizationId,
			t.legalEstablishmentId,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedAt,
		),
		check(
			"ca_establishment_status_value_check",
			sql`${t.status} IN ('registered', 'active', 'suspended', 'closed')`,
		),
		check(
			"ca_establishment_status_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_establishment_status_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_establishment_status_version_check", sql`${t.version} > 0`),
	],
);

export const caRegisteredAddress = pgTable(
	"ca_registered_address",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		legalEstablishmentId: uuid("legal_establishment_id"),
		addressScopeKey: text("address_scope_key").notNull(),
		addressType: text("address_type").notNull(),
		sourcePartyAddressId: uuid("source_party_address_id").notNull(),
		line1: text("line_1").notNull(),
		line2: text("line_2"),
		city: text("city").notNull(),
		region: text("region"),
		postalCode: text("postal_code"),
		countryCode: text("country_code").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_registered_address_as_of_idx").on(
			t.organizationId,
			t.addressScopeKey,
			t.addressType,
			t.effectiveFrom,
			t.effectiveTo,
			t.recordedAt,
		),
		check(
			"ca_registered_address_type_check",
			sql`${t.addressType} IN ('registered_office', 'service_address', 'place_of_business')`,
		),
		check(
			"ca_registered_address_scope_check",
			sql`${t.addressScopeKey} = COALESCE(${t.legalEstablishmentId}::text, ${t.legalCompanyId}::text)`,
		),
		check(
			"ca_registered_address_snapshot_check",
			sql`char_length(btrim(${t.line1})) > 0 AND char_length(btrim(${t.city})) > 0 AND ${t.countryCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_registered_address_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check("ca_registered_address_version_check", sql`${t.version} > 0`),
	],
);

export const caPremise = pgTable(
	"ca_premise",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		legalEstablishmentId: uuid("legal_establishment_id"),
		premiseType: text("premise_type").notNull(),
		displayName: text("display_name").notNull(),
		sourcePartyAddressId: uuid("source_party_address_id").notNull(),
		line1: text("line_1").notNull(),
		line2: text("line_2"),
		city: text("city").notNull(),
		region: text("region"),
		postalCode: text("postal_code"),
		countryCode: text("country_code").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		endReason: text("end_reason"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("ca_premise_as_of_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.legalEstablishmentId,
			t.premiseType,
			t.effectiveFrom,
			t.effectiveTo,
		),
		check(
			"ca_premise_type_check",
			sql`${t.premiseType} IN ('office', 'warehouse', 'operational_site', 'other')`,
		),
		check("ca_premise_status_check", sql`${t.status} IN ('active', 'ended')`),
		check(
			"ca_premise_snapshot_check",
			sql`char_length(btrim(${t.displayName})) > 0 AND char_length(btrim(${t.line1})) > 0 AND char_length(btrim(${t.city})) > 0 AND ${t.countryCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_premise_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_premise_end_check",
			sql`(${t.status} = 'ended' AND ${t.effectiveTo} IS NOT NULL AND ${t.endReason} IS NOT NULL) OR ${t.status} = 'active'`,
		),
		check("ca_premise_version_check", sql`${t.version} > 0`),
	],
);

export const caGovernanceBody = pgTable(
	"ca_governance_body",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		bodyType: text("body_type").notNull(),
		bodyCode: text("body_code").notNull(),
		normalizedBodyCode: text("normalized_body_code").notNull(),
		displayName: text("display_name").notNull(),
		description: text("description"),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		retirementReason: text("retirement_reason"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_governance_body_natural_key_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.normalizedBodyCode,
		),
		uniqueIndex("ca_governance_body_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_governance_body_as_of_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.bodyType,
			t.status,
			t.effectiveFrom,
			t.effectiveTo,
		),
		check(
			"ca_governance_body_type_check",
			sql`${t.bodyType} IN ('board', 'committee', 'shareholder_body', 'configured_statutory_body')`,
		),
		check(
			"ca_governance_body_code_check",
			sql`char_length(btrim(${t.bodyCode})) > 0 AND ${t.normalizedBodyCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_governance_body_display_check",
			sql`char_length(btrim(${t.displayName})) > 0`,
		),
		check(
			"ca_governance_body_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_governance_body_status_check",
			sql`${t.status} IN ('active', 'retired')`,
		),
		check(
			"ca_governance_body_retirement_check",
			sql`(${t.status} = 'retired' AND ${t.effectiveTo} IS NOT NULL AND ${t.retirementReason} IS NOT NULL) OR ${t.status} = 'active'`,
		),
		check(
			"ca_governance_body_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_governance_body_version_check", sql`${t.version} > 0`),
	],
);

export const caGovernanceMembership = pgTable(
	"ca_governance_membership",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		governanceBodyId: uuid("governance_body_id").notNull(),
		memberKind: text("member_kind").notNull(),
		memberPartyId: text("member_party_id"),
		roleSeatCode: text("role_seat_code"),
		seatLabel: text("seat_label").notNull(),
		membershipRole: text("membership_role").notNull(),
		votingEntitlement: text("voting_entitlement").notNull(),
		isChair: boolean("is_chair").notNull().default(false),
		termFrom: date("term_from").notNull(),
		termTo: date("term_to"),
		status: text("status").notNull().default("active"),
		endReason: text("end_reason"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_governance_membership_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_governance_membership_body_as_of_idx").on(
			t.organizationId,
			t.governanceBodyId,
			t.status,
			t.termFrom,
			t.termTo,
		),
		index("ca_governance_membership_party_idx").on(
			t.organizationId,
			t.memberPartyId,
			t.termFrom,
			t.termTo,
		),
		check(
			"ca_governance_membership_kind_check",
			sql`${t.memberKind} IN ('party', 'role_seat')`,
		),
		check(
			"ca_governance_membership_member_ref_check",
			sql`(${t.memberKind} = 'party' AND ${t.memberPartyId} IS NOT NULL AND ${t.roleSeatCode} IS NULL) OR (${t.memberKind} = 'role_seat' AND ${t.memberPartyId} IS NULL AND ${t.roleSeatCode} IS NOT NULL)`,
		),
		check(
			"ca_governance_membership_role_seat_check",
			sql`${t.roleSeatCode} IS NULL OR ${t.roleSeatCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_governance_membership_seat_label_check",
			sql`char_length(btrim(${t.seatLabel})) > 0`,
		),
		check(
			"ca_governance_membership_role_check",
			sql`${t.membershipRole} IN ('member', 'secretary', 'observer', 'advisor')`,
		),
		check(
			"ca_governance_membership_voting_check",
			sql`${t.votingEntitlement} IN ('voting', 'non_voting')`,
		),
		check(
			"ca_governance_membership_term_range_check",
			sql`${t.termTo} IS NULL OR ${t.termFrom} < ${t.termTo}`,
		),
		check(
			"ca_governance_membership_status_check",
			sql`${t.status} IN ('active', 'ended')`,
		),
		check(
			"ca_governance_membership_end_check",
			sql`(${t.status} = 'ended' AND ${t.termTo} IS NOT NULL AND ${t.endReason} IS NOT NULL) OR ${t.status} = 'active'`,
		),
		check(
			"ca_governance_membership_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_governance_membership_version_check", sql`${t.version} > 0`),
	],
);

export const caStatutoryOffice = pgTable(
	"ca_statutory_office",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		officeTypeCode: text("office_type_code").notNull(),
		jurisdictionCode: text("jurisdiction_code").notNull(),
		displayName: text("display_name").notNull(),
		description: text("description"),
		required: boolean("required").notNull().default(true),
		minimumHolders: integer("minimum_holders").notNull().default(1),
		maximumHolders: integer("maximum_holders"),
		vacancyGraceDays: integer("vacancy_grace_days").notNull().default(0),
		protectedRole: boolean("protected_role").notNull().default(false),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		retirementReason: text("retirement_reason"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_statutory_office_natural_key_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.jurisdictionCode,
			t.officeTypeCode,
		),
		uniqueIndex("ca_statutory_office_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_statutory_office_as_of_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.jurisdictionCode,
			t.required,
			t.status,
			t.effectiveFrom,
			t.effectiveTo,
		),
		check(
			"ca_statutory_office_code_check",
			sql`${t.officeTypeCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_statutory_office_jurisdiction_check",
			sql`${t.jurisdictionCode} ~ '^[A-Z]{2}$'`,
		),
		check(
			"ca_statutory_office_display_check",
			sql`char_length(btrim(${t.displayName})) > 0`,
		),
		check(
			"ca_statutory_office_holder_count_check",
			sql`${t.minimumHolders} > 0 AND (${t.maximumHolders} IS NULL OR ${t.maximumHolders} >= ${t.minimumHolders})`,
		),
		check("ca_statutory_office_grace_check", sql`${t.vacancyGraceDays} >= 0`),
		check(
			"ca_statutory_office_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_statutory_office_status_check",
			sql`${t.status} IN ('active', 'retired')`,
		),
		check(
			"ca_statutory_office_retirement_check",
			sql`(${t.status} = 'retired' AND ${t.effectiveTo} IS NOT NULL AND ${t.retirementReason} IS NOT NULL) OR ${t.status} = 'active'`,
		),
		check(
			"ca_statutory_office_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_statutory_office_version_check", sql`${t.version} > 0`),
	],
);

export const caOfficerAppointment = pgTable(
	"ca_officer_appointment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		statutoryOfficeId: uuid("statutory_office_id").notNull(),
		officerPartyId: text("officer_party_id").notNull(),
		appointmentMethod: text("appointment_method").notNull(),
		appointingAuthorityType: text("appointing_authority_type").notNull(),
		appointingAuthorityId: text("appointing_authority_id"),
		consentDocumentId: text("consent_document_id").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		endReason: text("end_reason"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_officer_appointment_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_officer_appointment_office_as_of_idx").on(
			t.organizationId,
			t.statutoryOfficeId,
			t.status,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("ca_officer_appointment_party_idx").on(
			t.organizationId,
			t.officerPartyId,
			t.effectiveFrom,
			t.effectiveTo,
		),
		check(
			"ca_officer_appointment_method_check",
			sql`${t.appointmentMethod} IN ('board_resolution', 'shareholder_resolution', 'statutory_filing', 'delegated_authority', 'court_order', 'other')`,
		),
		check(
			"ca_officer_appointment_authority_type_check",
			sql`${t.appointingAuthorityType} IN ('governance_body', 'shareholder_body', 'statutory_authority', 'court', 'delegated_role', 'other')`,
		),
		check(
			"ca_officer_appointment_party_check",
			sql`char_length(btrim(${t.officerPartyId})) > 0`,
		),
		check(
			"ca_officer_appointment_document_check",
			sql`char_length(btrim(${t.consentDocumentId})) > 0 AND char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check(
			"ca_officer_appointment_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_officer_appointment_status_check",
			sql`${t.status} IN ('active', 'resigned', 'removed', 'ended')`,
		),
		check(
			"ca_officer_appointment_end_check",
			sql`(${t.status} = 'active' AND ${t.endReason} IS NULL) OR (${t.status} <> 'active' AND ${t.effectiveTo} IS NOT NULL AND ${t.endReason} IS NOT NULL)`,
		),
		check("ca_officer_appointment_version_check", sql`${t.version} > 0`),
	],
);

export const caOfficerQualification = pgTable(
	"ca_officer_qualification",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		officerAppointmentId: uuid("officer_appointment_id").notNull(),
		qualificationTypeCode: text("qualification_type_code").notNull(),
		issuer: text("issuer").notNull(),
		referenceNumber: text("reference_number"),
		validFrom: date("valid_from").notNull(),
		validTo: date("valid_to"),
		verificationStatus: text("verification_status").notNull(),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_officer_qualification_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_officer_qualification_appointment_idx").on(
			t.organizationId,
			t.officerAppointmentId,
			t.validFrom,
			t.validTo,
		),
		check(
			"ca_officer_qualification_type_check",
			sql`${t.qualificationTypeCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_officer_qualification_issuer_check",
			sql`char_length(btrim(${t.issuer})) > 0`,
		),
		check(
			"ca_officer_qualification_valid_range_check",
			sql`${t.validTo} IS NULL OR ${t.validFrom} < ${t.validTo}`,
		),
		check(
			"ca_officer_qualification_status_check",
			sql`${t.verificationStatus} IN ('pending', 'verified', 'rejected', 'expired')`,
		),
		check(
			"ca_officer_qualification_verified_check",
			sql`${t.verificationStatus} <> 'verified' OR ${t.verifiedAt} IS NOT NULL`,
		),
		check(
			"ca_officer_qualification_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_officer_qualification_version_check", sql`${t.version} > 0`),
	],
);

export const caOfficerDeclaration = pgTable(
	"ca_officer_declaration",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		officerAppointmentId: uuid("officer_appointment_id").notNull(),
		declarationType: text("declaration_type").notNull(),
		status: text("status").notNull().default("active"),
		effectiveFrom: date("effective_from").notNull(),
		expiresOn: date("expires_on"),
		sensitiveDetailRef: text("sensitive_detail_ref"),
		maskedSummary: text("masked_summary"),
		sourceDocumentId: text("source_document_id").notNull(),
		supersededAt: timestamp("superseded_at", { withTimezone: true }),
		supersededByDeclarationId: uuid("superseded_by_declaration_id"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_officer_declaration_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_officer_declaration_appointment_idx").on(
			t.organizationId,
			t.officerAppointmentId,
			t.declarationType,
			t.status,
			t.effectiveFrom,
			t.expiresOn,
		),
		index("ca_officer_declaration_expiry_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.status,
			t.expiresOn,
		),
		check(
			"ca_officer_declaration_type_check",
			sql`${t.declarationType} IN ('consent', 'eligibility', 'interest', 'independence', 'fit_and_proper', 'related_party')`,
		),
		check(
			"ca_officer_declaration_status_check",
			sql`${t.status} IN ('active', 'superseded', 'expired')`,
		),
		check(
			"ca_officer_declaration_effective_range_check",
			sql`${t.expiresOn} IS NULL OR ${t.effectiveFrom} < ${t.expiresOn}`,
		),
		check(
			"ca_officer_declaration_sensitive_check",
			sql`${t.sensitiveDetailRef} IS NOT NULL OR ${t.maskedSummary} IS NOT NULL`,
		),
		check(
			"ca_officer_declaration_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_officer_declaration_version_check", sql`${t.version} > 0`),
	],
);

export const caOfficerDisqualification = pgTable(
	"ca_officer_disqualification",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		officerAppointmentId: uuid("officer_appointment_id").notNull(),
		reasonCode: text("reason_code").notNull(),
		authorityReference: text("authority_reference"),
		sourceDocumentId: text("source_document_id").notNull(),
		effectiveFrom: date("effective_from").notNull(),
		effectiveTo: date("effective_to"),
		status: text("status").notNull().default("active"),
		endReason: text("end_reason"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_officer_disqualification_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_officer_disqualification_as_of_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.officerAppointmentId,
			t.status,
			t.effectiveFrom,
			t.effectiveTo,
		),
		check(
			"ca_officer_disqualification_reason_check",
			sql`${t.reasonCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_officer_disqualification_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} < ${t.effectiveTo}`,
		),
		check(
			"ca_officer_disqualification_status_check",
			sql`${t.status} IN ('active', 'ended')`,
		),
		check(
			"ca_officer_disqualification_end_check",
			sql`(${t.status} = 'active' AND ${t.endReason} IS NULL) OR (${t.status} = 'ended' AND ${t.effectiveTo} IS NOT NULL AND ${t.endReason} IS NOT NULL)`,
		),
		check(
			"ca_officer_disqualification_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_officer_disqualification_version_check", sql`${t.version} > 0`),
	],
);

export const caConflictDisclosure = pgTable(
	"ca_conflict_disclosure",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		officerAppointmentId: uuid("officer_appointment_id").notNull(),
		matterType: text("matter_type").notNull(),
		matterId: text("matter_id").notNull(),
		conflictTypeCode: text("conflict_type_code").notNull(),
		status: text("status").notNull().default("disclosed"),
		sensitiveDetailRef: text("sensitive_detail_ref"),
		maskedSummary: text("masked_summary"),
		disclosedAt: timestamp("disclosed_at", { withTimezone: true }).notNull(),
		recusalRecordedAt: timestamp("recusal_recorded_at", { withTimezone: true }),
		recusalReason: text("recusal_reason"),
		sourceDocumentId: text("source_document_id").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_conflict_disclosure_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_conflict_disclosure_matter_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.matterType,
			t.matterId,
			t.status,
		),
		check(
			"ca_conflict_disclosure_matter_type_check",
			sql`${t.matterType} IN ('meeting', 'resolution', 'transaction', 'corporate_action')`,
		),
		check(
			"ca_conflict_disclosure_conflict_type_check",
			sql`${t.conflictTypeCode} ~ '^[A-Z0-9][A-Z0-9._-]*$'`,
		),
		check(
			"ca_conflict_disclosure_status_check",
			sql`${t.status} IN ('disclosed', 'recused', 'cleared')`,
		),
		check(
			"ca_conflict_disclosure_sensitive_check",
			sql`${t.sensitiveDetailRef} IS NOT NULL OR ${t.maskedSummary} IS NOT NULL`,
		),
		check(
			"ca_conflict_disclosure_recusal_check",
			sql`(${t.status} = 'recused' AND ${t.recusalRecordedAt} IS NOT NULL AND ${t.recusalReason} IS NOT NULL) OR ${t.status} <> 'recused'`,
		),
		check(
			"ca_conflict_disclosure_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_conflict_disclosure_version_check", sql`${t.version} > 0`),
	],
);

export const caGovernanceMeeting = pgTable(
	"ca_governance_meeting",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		governanceBodyId: uuid("governance_body_id").notNull(),
		procedureType: text("procedure_type").notNull(),
		status: text("status").notNull().default("scheduled"),
		title: text("title").notNull(),
		scheduledStartAt: timestamp("scheduled_start_at", {
			withTimezone: true,
		}).notNull(),
		scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
		noticePeriodDays: integer("notice_period_days").notNull(),
		locationSummary: text("location_summary"),
		remoteAccessSummary: text("remote_access_summary"),
		sourceDocumentId: text("source_document_id").notNull(),
		openedAt: timestamp("opened_at", { withTimezone: true }),
		adjournedAt: timestamp("adjourned_at", { withTimezone: true }),
		adjournedTo: timestamp("adjourned_to", { withTimezone: true }),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		noQuorumReason: text("no_quorum_reason"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_governance_meeting_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_governance_meeting_body_time_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.governanceBodyId,
			t.scheduledStartAt,
		),
		check(
			"ca_governance_meeting_procedure_type_check",
			sql`${t.procedureType} IN ('physical', 'virtual', 'hybrid', 'written_resolution')`,
		),
		check(
			"ca_governance_meeting_status_check",
			sql`${t.status} IN ('scheduled', 'open', 'adjourned', 'closed', 'cancelled')`,
		),
		check(
			"ca_governance_meeting_time_check",
			sql`${t.scheduledEndAt} IS NULL OR ${t.scheduledStartAt} < ${t.scheduledEndAt}`,
		),
		check(
			"ca_governance_meeting_notice_period_check",
			sql`${t.noticePeriodDays} >= 0`,
		),
		check(
			"ca_governance_meeting_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_governance_meeting_version_check", sql`${t.version} > 0`),
	],
);

export const caMeetingNotice = pgTable(
	"ca_meeting_notice",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		governanceMeetingId: uuid("governance_meeting_id").notNull(),
		recipientMembershipId: uuid("recipient_membership_id"),
		recipientPartyId: text("recipient_party_id"),
		status: text("status").notNull().default("issued"),
		issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		waivedAt: timestamp("waived_at", { withTimezone: true }),
		deliveryMethod: text("delivery_method").notNull(),
		waiverReason: text("waiver_reason"),
		sourceDocumentId: text("source_document_id").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_meeting_notice_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_meeting_notice_meeting_idx").on(
			t.organizationId,
			t.governanceMeetingId,
			t.status,
		),
		check(
			"ca_meeting_notice_recipient_check",
			sql`${t.recipientMembershipId} IS NOT NULL OR ${t.recipientPartyId} IS NOT NULL`,
		),
		check(
			"ca_meeting_notice_status_check",
			sql`${t.status} IN ('issued', 'delivered', 'waived')`,
		),
		check(
			"ca_meeting_notice_delivery_check",
			sql`(${t.status} <> 'delivered' OR (${t.deliveredAt} IS NOT NULL AND ${t.waivedAt} IS NULL))`,
		),
		check(
			"ca_meeting_notice_waiver_check",
			sql`(${t.status} <> 'waived' OR (${t.waivedAt} IS NOT NULL AND ${t.waiverReason} IS NOT NULL))`,
		),
		check(
			"ca_meeting_notice_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_meeting_notice_version_check", sql`${t.version} > 0`),
	],
);

export const caMeetingParticipant = pgTable(
	"ca_meeting_participant",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		governanceMeetingId: uuid("governance_meeting_id").notNull(),
		governanceMembershipId: uuid("governance_membership_id").notNull(),
		participantPartyId: text("participant_party_id"),
		attendanceStatus: text("attendance_status").notNull(),
		representedByPartyId: text("represented_by_party_id"),
		proxyDocumentId: text("proxy_document_id"),
		recusalReason: text("recusal_reason"),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_meeting_participant_org_meeting_member_uidx").on(
			t.organizationId,
			t.governanceMeetingId,
			t.governanceMembershipId,
		),
		index("ca_meeting_participant_meeting_idx").on(
			t.organizationId,
			t.governanceMeetingId,
			t.attendanceStatus,
		),
		check(
			"ca_meeting_participant_attendance_check",
			sql`${t.attendanceStatus} IN ('present', 'absent', 'represented', 'recused')`,
		),
		check(
			"ca_meeting_participant_proxy_check",
			sql`${t.attendanceStatus} <> 'represented' OR (${t.representedByPartyId} IS NOT NULL AND ${t.proxyDocumentId} IS NOT NULL)`,
		),
		check(
			"ca_meeting_participant_recusal_check",
			sql`${t.attendanceStatus} <> 'recused' OR ${t.recusalReason} IS NOT NULL`,
		),
		check("ca_meeting_participant_version_check", sql`${t.version} > 0`),
	],
);

export const caMeetingQuorumResult = pgTable(
	"ca_meeting_quorum_result",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		governanceMeetingId: uuid("governance_meeting_id").notNull(),
		ruleSnapshot: jsonb("rule_snapshot").notNull(),
		eligibleMemberCount: integer("eligible_member_count").notNull(),
		presentMemberCount: integer("present_member_count").notNull(),
		requiredPresentCount: integer("required_present_count").notNull(),
		hasQuorum: boolean("has_quorum").notNull(),
		noQuorumReason: text("no_quorum_reason"),
		sourceDocumentId: text("source_document_id").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_meeting_quorum_result_org_company_id_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.id,
		),
		index("ca_meeting_quorum_result_meeting_idx").on(
			t.organizationId,
			t.governanceMeetingId,
			t.recordedAt,
		),
		check(
			"ca_meeting_quorum_result_counts_check",
			sql`${t.eligibleMemberCount} >= 0 AND ${t.presentMemberCount} >= 0 AND ${t.requiredPresentCount} > 0`,
		),
		check(
			"ca_meeting_quorum_result_truth_check",
			sql`${t.hasQuorum} = (${t.presentMemberCount} >= ${t.requiredPresentCount})`,
		),
		check(
			"ca_meeting_quorum_result_reason_check",
			sql`${t.hasQuorum} OR ${t.noQuorumReason} IS NOT NULL`,
		),
		check(
			"ca_meeting_quorum_result_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_meeting_quorum_result_version_check", sql`${t.version} > 0`),
	],
);

export const caMeetingVote = pgTable(
	"ca_meeting_vote",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		governanceMeetingId: uuid("governance_meeting_id").notNull(),
		motionCode: text("motion_code").notNull(),
		eligibleVotes: integer("eligible_votes").notNull(),
		votesFor: integer("votes_for").notNull(),
		votesAgainst: integer("votes_against").notNull(),
		abstentions: integer("abstentions").notNull(),
		thresholdType: text("threshold_type").notNull(),
		requiredFor: integer("required_for").notNull(),
		outcome: text("outcome").notNull(),
		outcomeBasis: text("outcome_basis").notNull(),
		sourceDocumentId: text("source_document_id").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_meeting_vote_org_meeting_motion_uidx").on(
			t.organizationId,
			t.governanceMeetingId,
			t.motionCode,
		),
		index("ca_meeting_vote_company_outcome_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.outcome,
		),
		check(
			"ca_meeting_vote_counts_check",
			sql`${t.eligibleVotes} > 0 AND ${t.votesFor} >= 0 AND ${t.votesAgainst} >= 0 AND ${t.abstentions} >= 0 AND (${t.votesFor} + ${t.votesAgainst} + ${t.abstentions}) <= ${t.eligibleVotes}`,
		),
		check(
			"ca_meeting_vote_threshold_check",
			sql`${t.thresholdType} IN ('simple_majority', 'supermajority', 'unanimous', 'custom')`,
		),
		check(
			"ca_meeting_vote_required_check",
			sql`${t.requiredFor} > 0 AND ${t.requiredFor} <= ${t.eligibleVotes}`,
		),
		check(
			"ca_meeting_vote_outcome_check",
			sql`${t.outcome} IN ('adopted', 'rejected')`,
		),
		check(
			"ca_meeting_vote_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_meeting_vote_version_check", sql`${t.version} > 0`),
	],
);

export const caResolution = pgTable(
	"ca_resolution",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		governanceMeetingId: uuid("governance_meeting_id"),
		meetingVoteId: uuid("meeting_vote_id"),
		approvalBasis: text("approval_basis").notNull(),
		status: text("status").notNull(),
		resolutionCode: text("resolution_code").notNull(),
		title: text("title").notNull(),
		textDigest: text("text_digest").notNull(),
		documentId: text("document_id").notNull(),
		minutesDocumentId: text("minutes_document_id"),
		effectiveFrom: date("effective_from").notNull(),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		rejectedAt: timestamp("rejected_at", { withTimezone: true }),
		supersededAt: timestamp("superseded_at", { withTimezone: true }),
		supersededByResolutionId: uuid("superseded_by_resolution_id"),
		sourceDocumentId: text("source_document_id").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_resolution_org_company_code_uidx").on(
			t.organizationId,
			t.legalCompanyId,
			t.resolutionCode,
		),
		index("ca_resolution_company_status_idx").on(
			t.organizationId,
			t.legalCompanyId,
			t.status,
			t.effectiveFrom,
		),
		index("ca_resolution_vote_idx").on(t.organizationId, t.meetingVoteId),
		check(
			"ca_resolution_approval_basis_check",
			sql`${t.approvalBasis} IN ('meeting_vote', 'written_resolution')`,
		),
		check(
			"ca_resolution_status_check",
			sql`${t.status} IN ('adopted', 'rejected', 'superseded')`,
		),
		check(
			"ca_resolution_vote_basis_check",
			sql`(${t.approvalBasis} = 'meeting_vote' AND ${t.meetingVoteId} IS NOT NULL) OR (${t.approvalBasis} = 'written_resolution' AND ${t.meetingVoteId} IS NULL)`,
		),
		check(
			"ca_resolution_decision_check",
			sql`(${t.status} IN ('adopted', 'superseded') AND ${t.approvedAt} IS NOT NULL AND ${t.rejectedAt} IS NULL) OR (${t.status} = 'rejected' AND ${t.rejectedAt} IS NOT NULL AND ${t.approvedAt} IS NULL)`,
		),
		check(
			"ca_resolution_supersession_check",
			sql`(${t.status} = 'superseded' AND ${t.supersededAt} IS NOT NULL AND ${t.supersededByResolutionId} IS NOT NULL) OR (${t.status} <> 'superseded' AND ${t.supersededAt} IS NULL AND ${t.supersededByResolutionId} IS NULL)`,
		),
		check(
			"ca_resolution_digest_check",
			sql`char_length(btrim(${t.textDigest})) >= 32`,
		),
		check(
			"ca_resolution_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_resolution_version_check", sql`${t.version} > 0`),
	],
);

export const caResolutionAction = pgTable(
	"ca_resolution_action",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		legalCompanyId: uuid("legal_company_id").notNull(),
		resolutionId: uuid("resolution_id").notNull(),
		actionTypeCode: text("action_type_code").notNull(),
		assigneePartyId: text("assignee_party_id").notNull(),
		status: text("status").notNull().default("assigned"),
		dueOn: date("due_on").notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		evidenceDocumentId: text("evidence_document_id"),
		completionNotes: text("completion_notes"),
		sourceDocumentId: text("source_document_id").notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
		recordedBy: text("recorded_by").notNull(),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ca_resolution_action_org_resolution_type_uidx").on(
			t.organizationId,
			t.resolutionId,
			t.actionTypeCode,
		),
		index("ca_resolution_action_due_idx").on(
			t.organizationId,
			t.status,
			t.dueOn,
		),
		check(
			"ca_resolution_action_status_check",
			sql`${t.status} IN ('assigned', 'completed', 'cancelled')`,
		),
		check(
			"ca_resolution_action_completion_check",
			sql`(${t.status} = 'completed' AND ${t.completedAt} IS NOT NULL AND ${t.evidenceDocumentId} IS NOT NULL) OR (${t.status} <> 'completed' AND ${t.completedAt} IS NULL AND ${t.evidenceDocumentId} IS NULL)`,
		),
		check(
			"ca_resolution_action_source_check",
			sql`char_length(btrim(${t.sourceDocumentId})) > 0`,
		),
		check("ca_resolution_action_version_check", sql`${t.version} > 0`),
	],
);
