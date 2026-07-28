import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
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
