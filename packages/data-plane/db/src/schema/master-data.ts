/**
 * Master-data platform refs + org operational masters (Authority B).
 * Mutations: `@afenda/master-data` only — do not dual-write from apps/web.
 *
 * UoM is platform `ref_uom` only — never org-scoped `md_uom`.
 * `md_item.base_uom_id` → `ref_uom`.
 */
import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// ── Platform reference data (not hard-tenant) ───────────────────────────────

export const refCountry = pgTable(
	"ref_country",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** ISO 3166-1 alpha-2 */
		code: text("code").notNull(),
		/** ISO 3166-1 alpha-3 */
		alpha3: text("alpha3").notNull(),
		name: text("name").notNull(),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [uniqueIndex("ref_country_code_uidx").on(t.code)],
);

export const refCurrency = pgTable(
	"ref_currency",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** ISO 4217 */
		code: text("code").notNull(),
		name: text("name").notNull(),
		minorUnits: integer("minor_units").notNull(),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [uniqueIndex("ref_currency_code_uidx").on(t.code)],
);

export const refLanguage = pgTable(
	"ref_language",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** BCP-47 primary language subtag */
		code: text("code").notNull(),
		name: text("name").notNull(),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [uniqueIndex("ref_language_code_uidx").on(t.code)],
);

export const refTimeZone = pgTable(
	"ref_time_zone",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ianaName: text("iana_name").notNull(),
		name: text("name").notNull(),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [uniqueIndex("ref_time_zone_iana_name_uidx").on(t.ianaName)],
);

export const refUomDimension = pgTable(
	"ref_uom_dimension",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** count | mass | volume | length | area | time */
		code: text("code").notNull(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [uniqueIndex("ref_uom_dimension_code_uidx").on(t.code)],
);

export const refUom = pgTable(
	"ref_uom",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		code: text("code").notNull(),
		name: text("name").notNull(),
		symbol: text("symbol").notNull(),
		dimensionId: uuid("dimension_id")
			.notNull()
			.references(() => refUomDimension.id),
		/** Exact decimal ratio to dimension base — never float. */
		toBaseNumerator: numeric("to_base_numerator", {
			precision: 24,
			scale: 12,
		}).notNull(),
		toBaseDenominator: numeric("to_base_denominator", {
			precision: 24,
			scale: 12,
		}).notNull(),
		isBase: boolean("is_base").notNull().default(false),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("ref_uom_code_uidx").on(t.code),
		index("ref_uom_dimension_id_idx").on(t.dimensionId),
	],
);

// ── Organization operational masters (hard-tenant) ──────────────────────────

/**
 * Governed organization dimensions consumed by HR and other ERP domains.
 *
 * Rows are effective-dated immutable versions. Consumers persist both the row
 * identity and a business-key/name snapshot so historical decisions remain
 * reproducible after a rename or restructure.
 */
export const mdOrganizationDimension = pgTable(
	"md_organization_dimension",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		/** Controlled taxonomy; see @afenda/master-data ORGANIZATION_DIMENSION_KINDS. */
		kind: text("kind").notNull(),
		key: text("key").notNull(),
		normalizedKey: text("normalized_key").notNull(),
		name: text("name").notNull(),
		parentId: uuid("parent_id"),
		status: text("status").notNull().default("active"),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		supersedesId: uuid("supersedes_id"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedBy: text("updated_by").notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("md_org_dimension_org_id_uidx").on(t.organizationId, t.id),
		index("md_org_dimension_org_kind_key_idx").on(
			t.organizationId,
			t.kind,
			t.normalizedKey,
		),
		index("md_org_dimension_org_effective_idx").on(
			t.organizationId,
			t.effectiveFrom,
			t.effectiveTo,
		),
		index("md_org_dimension_org_parent_idx").on(t.organizationId, t.parentId),
		index("md_org_dimension_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("md_org_dimension_org_kind_key_from_uidx").on(
			t.organizationId,
			t.kind,
			t.normalizedKey,
			t.effectiveFrom,
		),
		check(
			"md_org_dimension_kind_check",
			sql`${t.kind} IN ('legal_entity', 'business_unit', 'location', 'department', 'cost_center', 'cost_centre', 'profit_center', 'channel', 'region', 'brand', 'project', 'custom')`,
		),
		check(
			"md_org_dimension_status_check",
			sql`${t.status} IN ('active', 'inactive', 'archived')`,
		),
		check(
			"md_org_dimension_not_self_parent_check",
			sql`${t.parentId} IS NULL OR ${t.parentId} <> ${t.id}`,
		),
		check(
			"md_org_dimension_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		check("md_org_dimension_version_ck", sql`${t.version} > 0`),
		foreignKey({
			columns: [t.organizationId, t.supersedesId],
			foreignColumns: [t.organizationId, t.id],
			name: "md_org_dimension_org_supersedes_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.parentId],
			foreignColumns: [t.organizationId, t.id],
			name: "md_org_dimension_org_parent_fk",
		}),
	],
);

export const mdParty = pgTable(
	"md_party",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		/** organization | person */
		partyKind: text("party_kind").notNull(),
		/** draft | active | inactive | blocked | retired */
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		legalName: text("legal_name"),
		tradingName: text("trading_name"),
		registrationNumber: text("registration_number"),
		registrationCountryId: uuid("registration_country_id").references(
			() => refCountry.id,
		),
		preferredLanguageId: uuid("preferred_language_id").references(
			() => refLanguage.id,
		),
		defaultCurrencyId: uuid("default_currency_id").references(
			() => refCurrency.id,
		),
		/** Survivor pointer after governed merge — source remains historically addressable. */
		mergedIntoId: uuid("merged_into_id"),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		blockedAt: timestamp("blocked_at", { withTimezone: true }),
		blockedBy: text("blocked_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("md_party_org_id_uidx").on(t.organizationId, t.id),
		index("md_party_org_id_idx").on(t.organizationId, t.id),
		index("md_party_org_status_idx").on(t.organizationId, t.status),
		index("md_party_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_party_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL AND ${t.mergedIntoId} IS NULL`),
		check("md_party_version_ck", sql`${t.version} > 0`),
		foreignKey({
			columns: [t.organizationId, t.mergedIntoId],
			foreignColumns: [t.organizationId, t.id],
			name: "md_party_merged_into_org_fk",
		}),
	],
);

export const mdItemGroup = pgTable(
	"md_item_group",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		parentId: uuid("parent_id"),
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("md_item_group_org_id_uidx").on(t.organizationId, t.id),
		index("md_item_group_org_id_idx").on(t.organizationId, t.id),
		index("md_item_group_org_status_idx").on(t.organizationId, t.status),
		index("md_item_group_org_parent_idx").on(t.organizationId, t.parentId),
		index("md_item_group_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_item_group_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL`),
		check("md_item_group_version_ck", sql`${t.version} > 0`),
		foreignKey({
			columns: [t.organizationId, t.parentId],
			foreignColumns: [t.organizationId, t.id],
			name: "md_item_group_org_parent_fk",
		}),
	],
);

export const mdItem = pgTable(
	"md_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		/** stock | non_stock | service | asset_candidate | expense */
		itemType: text("item_type").notNull(),
		description: text("description"),
		/** none | lot | serial | lot_and_serial */
		trackingPolicy: text("tracking_policy").notNull().default("none"),
		sellable: boolean("sellable").notNull().default(true),
		purchasable: boolean("purchasable").notNull().default(true),
		stocked: boolean("stocked").notNull().default(false),
		serviceIndicator: boolean("service_indicator").notNull().default(false),
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		/** Platform UoM — never org-scoped md_uom. */
		baseUomId: uuid("base_uom_id")
			.notNull()
			.references(() => refUom.id),
		itemGroupId: uuid("item_group_id")
			.notNull()
			.references(() => mdItemGroup.id),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("md_item_org_id_uidx").on(t.organizationId, t.id),
		index("md_item_org_id_idx").on(t.organizationId, t.id),
		index("md_item_org_status_idx").on(t.organizationId, t.status),
		index("md_item_org_group_idx").on(t.organizationId, t.itemGroupId),
		index("md_item_base_uom_idx").on(t.baseUomId),
		index("md_item_org_operational_flags_idx").on(
			t.organizationId,
			t.sellable,
			t.purchasable,
			t.stocked,
			t.serviceIndicator,
		),
		index("md_item_org_updated_at_idx").on(t.organizationId, t.updatedAt, t.id),
		check(
			"md_item_tracking_policy_ck",
			sql`${t.trackingPolicy} IN ('none', 'lot', 'serial', 'lot_and_serial')`,
		),
		check("md_item_version_ck", sql`${t.version} > 0`),
		foreignKey({
			columns: [t.organizationId, t.itemGroupId],
			foreignColumns: [mdItemGroup.organizationId, mdItemGroup.id],
			name: "md_item_org_group_fk",
		}),
		uniqueIndex("md_item_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL`),
	],
);

export const mdWarehouse = pgTable(
	"md_warehouse",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		/** site | warehouse | zone | aisle | rack | bin */
		locationType: text("location_type").notNull(),
		parentId: uuid("parent_id"),
		addressCountryId: uuid("address_country_id").references(
			() => refCountry.id,
		),
		addressLine1: text("address_line1"),
		addressLine2: text("address_line2"),
		addressCity: text("address_city"),
		addressRegion: text("address_region"),
		addressPostalCode: text("address_postal_code"),
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("md_warehouse_org_id_uidx").on(t.organizationId, t.id),
		index("md_warehouse_org_id_idx").on(t.organizationId, t.id),
		index("md_warehouse_org_status_idx").on(t.organizationId, t.status),
		index("md_warehouse_org_parent_idx").on(t.organizationId, t.parentId),
		index("md_warehouse_address_country_idx").on(t.addressCountryId),
		index("md_warehouse_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_warehouse_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL`),
		check("md_warehouse_version_ck", sql`${t.version} > 0`),
		foreignKey({
			columns: [t.organizationId, t.parentId],
			foreignColumns: [t.organizationId, t.id],
			name: "md_warehouse_org_parent_fk",
		}),
	],
);

export const mdPaymentTerm = pgTable(
	"md_payment_term",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		/** Days until full payment is due (commercial default). */
		netDays: integer("net_days").notNull(),
		discountDays: integer("discount_days"),
		discountPercent: numeric("discount_percent", {
			precision: 7,
			scale: 4,
		}),
		dueDayRule: text("due_day_rule").notNull().default("net_days"),
		endOfMonth: boolean("end_of_month").notNull().default(false),
		installmentPolicy: text("installment_policy").notNull().default("none"),
		installmentCount: integer("installment_count"),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
		currencyRestrictionId: uuid("currency_restriction_id").references(
			() => refCurrency.id,
		),
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("md_payment_term_org_id_idx").on(t.organizationId, t.id),
		index("md_payment_term_org_status_idx").on(t.organizationId, t.status),
		index("md_payment_term_currency_restriction_idx").on(
			t.currencyRestrictionId,
		),
		index("md_payment_term_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_payment_term_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL`),
		check("md_payment_term_net_days_ck", sql`${t.netDays} BETWEEN 0 AND 999`),
		check(
			"md_payment_term_discount_days_ck",
			sql`${t.discountDays} IS NULL OR (${t.discountDays} >= 0 AND ${t.discountDays} <= ${t.netDays})`,
		),
		check(
			"md_payment_term_discount_percent_ck",
			sql`${t.discountPercent} IS NULL OR (${t.discountPercent} > 0 AND ${t.discountPercent} <= 100)`,
		),
		check(
			"md_payment_term_discount_pair_ck",
			sql`${t.discountPercent} IS NULL OR ${t.discountDays} IS NOT NULL`,
		),
		check(
			"md_payment_term_due_day_rule_ck",
			sql`${t.dueDayRule} IN ('net_days', 'end_of_month', 'day_of_month')`,
		),
		check(
			"md_payment_term_installment_policy_ck",
			sql`${t.installmentPolicy} IN ('none', 'equal_installments')`,
		),
		check(
			"md_payment_term_installment_count_ck",
			sql`(${t.installmentPolicy} = 'none' AND ${t.installmentCount} IS NULL) OR (${t.installmentPolicy} = 'equal_installments' AND ${t.installmentCount} >= 2)`,
		),
		check(
			"md_payment_term_validity_range_ck",
			sql`${t.validTo} IS NULL OR ${t.validFrom} IS NULL OR ${t.validTo} >= ${t.validFrom}`,
		),
		check("md_payment_term_version_ck", sql`${t.version} > 0`),
	],
);

export const mdTaxRegistration = pgTable(
	"md_tax_registration",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id")
			.notNull()
			.references(() => mdParty.id),
		jurisdictionCountryId: uuid("jurisdiction_country_id")
			.notNull()
			.references(() => refCountry.id),
		/** vat_gst | tin | ein_local | other_gov */
		registrationType: text("registration_type").notNull(),
		registrationNumber: text("registration_number").notNull(),
		normalizedRegistrationNumber: text(
			"normalized_registration_number",
		).notNull(),
		name: text("name"),
		/** draft | active | inactive | blocked | retired */
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		blockedAt: timestamp("blocked_at", { withTimezone: true }),
		blockedBy: text("blocked_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
		deletedBy: text("deleted_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("md_tax_registration_org_id_idx").on(t.organizationId, t.id),
		index("md_tax_registration_org_status_idx").on(t.organizationId, t.status),
		index("md_tax_registration_org_party_idx").on(t.organizationId, t.partyId),
		index("md_tax_registration_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_tax_registration_live_identity_uidx")
			.on(
				t.organizationId,
				t.partyId,
				t.jurisdictionCountryId,
				t.registrationType,
				t.normalizedRegistrationNumber,
			)
			.where(sql`${t.retiredAt} IS NULL AND ${t.deletedAt} IS NULL`),
		check("md_tax_registration_version_ck", sql`${t.version} > 0`),
		foreignKey({
			columns: [t.organizationId, t.partyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "md_tax_registration_org_party_fk",
		}),
	],
);

// ── Aggregate extensions (org-scoped children; mutate via @afenda/master-data) ─

export const mdPartyRole = pgTable(
	"md_party_role",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id").notNull(),
		/** Closed catalog: customer | supplier | carrier | … */
		roleCode: text("role_code").notNull(),
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
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
		foreignKey({
			columns: [t.organizationId, t.partyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "md_party_role_org_party_fk",
		}),
		index("md_party_role_org_party_idx").on(t.organizationId, t.partyId),
		index("md_party_role_org_status_idx").on(t.organizationId, t.status),
		check(
			"md_party_role_status_check",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'retired', 'archived')`,
		),
		check("md_party_role_version_ck", sql`${t.version} > 0`),
		check(
			"md_party_role_valid_range_ck",
			sql`${t.validFrom} IS NULL OR ${t.validTo} IS NULL OR ${t.validFrom} <= ${t.validTo}`,
		),
		uniqueIndex("md_party_role_org_party_code_active_uidx")
			.on(t.organizationId, t.partyId, t.roleCode)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
	],
);

export const mdPartyAddress = pgTable(
	"md_party_address",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id").notNull(),
		addressType: text("address_type").notNull(),
		purpose: text("purpose").notNull(),
		line1: text("line1").notNull(),
		line2: text("line2"),
		line3: text("line3"),
		city: text("city").notNull(),
		administrativeArea: text("administrative_area"),
		postalCode: text("postal_code"),
		countryId: uuid("country_id")
			.notNull()
			.references(() => refCountry.id),
		attention: text("attention"),
		isPrimary: boolean("is_primary").notNull().default(false),
		validationStatus: text("validation_status")
			.notNull()
			.default("unvalidated"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		effectiveFrom: timestamp("effective_from", { withTimezone: true }),
		effectiveTo: timestamp("effective_to", { withTimezone: true }),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.partyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "md_party_address_org_party_fk",
		}),
		index("md_party_address_org_party_idx").on(t.organizationId, t.partyId),
		index("md_party_address_org_country_idx").on(t.organizationId, t.countryId),
		check(
			"md_party_address_type_check",
			sql`${t.addressType} IN ('physical', 'postal', 'registered', 'billing', 'shipping', 'operational')`,
		),
		check(
			"md_party_address_purpose_check",
			sql`${t.purpose} IN ('registered', 'billing', 'shipping', 'correspondence', 'operational', 'returns', 'tax', 'other')`,
		),
		check(
			"md_party_address_validation_status_check",
			sql`${t.validationStatus} IN ('unvalidated', 'validated', 'invalid')`,
		),
		check(
			"md_party_address_status_check",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check(
			"md_party_address_effective_range_check",
			sql`${t.effectiveFrom} IS NULL OR ${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
		check("md_party_address_version_ck", sql`${t.version} > 0`),
		uniqueIndex("md_party_address_primary_purpose_active_uidx")
			.on(t.organizationId, t.partyId, t.purpose)
			.where(
				sql`${t.isPrimary} = true AND ${t.status} = 'active' AND ${t.archivedAt} IS NULL`,
			),
	],
);

export const mdPartyContact = pgTable(
	"md_party_contact",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id").notNull(),
		contactType: text("contact_type").notNull(),
		value: text("value").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		label: text("label"),
		purpose: text("purpose"),
		isPrimary: boolean("is_primary").notNull().default(false),
		verificationStatus: text("verification_status")
			.notNull()
			.default("unverified"),
		verifiedAt: timestamp("verified_at", { withTimezone: true }),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		effectiveFrom: timestamp("effective_from", { withTimezone: true }),
		effectiveTo: timestamp("effective_to", { withTimezone: true }),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.partyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "md_party_contact_org_party_fk",
		}),
		index("md_party_contact_org_party_idx").on(t.organizationId, t.partyId),
		index("md_party_contact_org_normalized_value_idx").on(
			t.organizationId,
			t.contactType,
			t.normalizedValue,
		),
		check(
			"md_party_contact_type_check",
			sql`${t.contactType} IN ('email', 'telephone', 'mobile', 'fax', 'website', 'messaging', 'other')`,
		),
		check(
			"md_party_contact_verification_status_check",
			sql`${t.verificationStatus} IN ('unverified', 'pending', 'verified', 'failed')`,
		),
		check(
			"md_party_contact_verification_timestamp_check",
			sql`(${t.verificationStatus} = 'verified' AND ${t.verifiedAt} IS NOT NULL) OR (${t.verificationStatus} <> 'verified' AND ${t.verifiedAt} IS NULL)`,
		),
		check(
			"md_party_contact_status_check",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check(
			"md_party_contact_effective_range_check",
			sql`${t.effectiveFrom} IS NULL OR ${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
		),
		check("md_party_contact_version_ck", sql`${t.version} > 0`),
		uniqueIndex("md_party_contact_primary_type_purpose_uidx")
			.on(
				t.organizationId,
				t.partyId,
				t.contactType,
				sql`coalesce(${t.purpose}, '')`,
			)
			.where(
				sql`${t.isPrimary} = true AND ${t.status} = 'active' AND ${t.archivedAt} IS NULL`,
			),
	],
);

export const mdPartyExternalId = pgTable(
	"md_party_external_id",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id").notNull(),
		sourceSystem: text("source_system").notNull(),
		externalIdType: text("external_id_type").notNull(),
		externalValue: text("external_value").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		caseSensitivity: text("case_sensitivity").notNull(),
		isPrimary: boolean("is_primary").notNull().default(false),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.partyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "md_party_external_id_org_party_fk",
		}),
		index("md_party_external_id_org_party_idx").on(t.organizationId, t.partyId),
		check(
			"md_party_external_id_case_sensitivity_ck",
			sql`${t.caseSensitivity} IN ('sensitive', 'insensitive')`,
		),
		check(
			"md_party_external_id_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_party_external_id_version_ck", sql`${t.version} > 0`),
		uniqueIndex("md_party_external_id_active_identity_uidx")
			.on(t.organizationId, t.sourceSystem, t.externalIdType, t.normalizedValue)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
		uniqueIndex("md_party_external_id_active_primary_uidx")
			.on(t.organizationId, t.partyId, t.sourceSystem, t.externalIdType)
			.where(
				sql`${t.isPrimary} = true AND ${t.status} = 'active' AND ${t.archivedAt} IS NULL`,
			),
	],
);

export const mdPartyRelationship = pgTable(
	"md_party_relationship",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		sourcePartyId: uuid("source_party_id").notNull(),
		targetPartyId: uuid("target_party_id").notNull(),
		relationshipType: text("relationship_type").notNull(),
		direction: text("direction").notNull(),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		effectiveFrom: timestamp("effective_from", { withTimezone: true }),
		effectiveTo: timestamp("effective_to", { withTimezone: true }),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.sourcePartyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "md_party_relationship_org_from_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.targetPartyId],
			foreignColumns: [mdParty.organizationId, mdParty.id],
			name: "md_party_relationship_org_to_fk",
		}),
		index("md_party_relationship_org_from_idx").on(
			t.organizationId,
			t.sourcePartyId,
		),
		index("md_party_relationship_org_to_idx").on(
			t.organizationId,
			t.targetPartyId,
		),
		check(
			"md_party_relationship_non_reflexive_ck",
			sql`${t.sourcePartyId} <> ${t.targetPartyId}`,
		),
		check(
			"md_party_relationship_direction_ck",
			sql`${t.direction} IN ('directional', 'reciprocal', 'hierarchical', 'symmetric')`,
		),
		check(
			"md_party_relationship_type_ck",
			sql`${t.relationshipType} IN ('parent_of', 'owned_by', 'contact_for', 'bill_to_for', 'ship_to_for', 'supplies', 'distributes_for', 'franchisee_of', 'related_party', 'landlord_of')`,
		),
		check(
			"md_party_relationship_semantics_ck",
			sql`(${t.relationshipType} = 'parent_of' AND ${t.direction} = 'hierarchical') OR (${t.relationshipType} = 'landlord_of' AND ${t.direction} = 'reciprocal') OR (${t.relationshipType} = 'related_party' AND ${t.direction} = 'symmetric') OR (${t.relationshipType} IN ('owned_by', 'contact_for', 'bill_to_for', 'ship_to_for', 'supplies', 'distributes_for', 'franchisee_of') AND ${t.direction} = 'directional')`,
		),
		check(
			"md_party_relationship_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'terminated', 'archived')`,
		),
		check(
			"md_party_relationship_effective_range_ck",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		check("md_party_relationship_version_ck", sql`${t.version} > 0`),
		uniqueIndex("md_party_relationship_active_pair_type_uidx")
			.on(
				t.organizationId,
				t.sourcePartyId,
				t.targetPartyId,
				t.relationshipType,
			)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
	],
);

export const mdItemUom = pgTable(
	"md_item_uom",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id").notNull(),
		alternateUomId: uuid("alternate_uom_id")
			.notNull()
			.references(() => refUom.id),
		/** 1 alternate UoM = conversion_factor × item base UoM. */
		conversionFactor: numeric("conversion_factor", {
			precision: 24,
			scale: 12,
		}).notNull(),
		roundingScale: integer("rounding_scale").notNull().default(0),
		isPurchaseUom: boolean("is_purchase_uom").notNull().default(false),
		isSalesUom: boolean("is_sales_uom").notNull().default(false),
		isInventoryUom: boolean("is_inventory_uom").notNull().default(false),
		isDefaultPurchaseUom: boolean("is_default_purchase_uom")
			.notNull()
			.default(false),
		isDefaultSalesUom: boolean("is_default_sales_uom").notNull().default(false),
		compatibilityMode: text("compatibility_mode").notNull(),
		packagingApprovalReference: text("packaging_approval_reference"),
		/** Nullable migration evidence; new code must use conversionFactor. */
		legacyToBaseNumerator: numeric("to_base_numerator", {
			precision: 24,
			scale: 12,
		}),
		/** Nullable migration evidence; new code must use conversionFactor. */
		legacyToBaseDenominator: numeric("to_base_denominator", {
			precision: 24,
			scale: 12,
		}),
		/** Nullable migration evidence; new code must use explicit usage flags. */
		legacyUsage: text("usage"),
		/** Nullable migration evidence; barcode ownership is md_item_barcode. */
		legacyBarcode: text("barcode"),
		/** Nullable migration evidence; rounding is governed by roundingScale. */
		legacyRoundingRule: text("rounding_rule"),
		/** Nullable migration evidence retained for additive schema evolution. */
		legacyMinQuantity: numeric("min_quantity", { precision: 24, scale: 12 }),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "md_item_uom_org_item_fk",
		}),
		index("md_item_uom_org_item_idx").on(t.organizationId, t.itemId),
		index("md_item_uom_uom_idx").on(t.alternateUomId),
		check("md_item_uom_factor_ck", sql`${t.conversionFactor} > 0`),
		check(
			"md_item_uom_rounding_scale_ck",
			sql`${t.roundingScale} BETWEEN 0 AND 12`,
		),
		check(
			"md_item_uom_default_purchase_ck",
			sql`${t.isDefaultPurchaseUom} = false OR ${t.isPurchaseUom} = true`,
		),
		check(
			"md_item_uom_default_sales_ck",
			sql`${t.isDefaultSalesUom} = false OR ${t.isSalesUom} = true`,
		),
		check(
			"md_item_uom_compatibility_mode_ck",
			sql`${t.compatibilityMode} IN ('physical_dimension', 'packaging_count')`,
		),
		check(
			"md_item_uom_packaging_approval_ck",
			sql`(${t.compatibilityMode} = 'packaging_count' AND ${t.packagingApprovalReference} IS NOT NULL) OR (${t.compatibilityMode} = 'physical_dimension' AND ${t.packagingApprovalReference} IS NULL)`,
		),
		check(
			"md_item_uom_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_item_uom_version_ck", sql`${t.version} > 0`),
		check(
			"md_item_uom_valid_range_ck",
			sql`${t.validFrom} IS NULL OR ${t.validTo} IS NULL OR ${t.validFrom} <= ${t.validTo}`,
		),
		uniqueIndex("md_item_uom_active_item_alternate_uidx")
			.on(t.organizationId, t.itemId, t.alternateUomId)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
		uniqueIndex("md_item_uom_default_purchase_uidx")
			.on(t.organizationId, t.itemId)
			.where(
				sql`${t.isDefaultPurchaseUom} = true AND ${t.status} = 'active' AND ${t.archivedAt} IS NULL`,
			),
		uniqueIndex("md_item_uom_default_sales_uidx")
			.on(t.organizationId, t.itemId)
			.where(
				sql`${t.isDefaultSalesUom} = true AND ${t.status} = 'active' AND ${t.archivedAt} IS NULL`,
			),
	],
);

export const mdItemBarcode = pgTable(
	"md_item_barcode",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id").notNull(),
		barcodeValue: text("barcode_value").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		symbology: text("symbology").notNull(),
		uomId: uuid("uom_id").references(() => refUom.id),
		packQuantity: numeric("pack_quantity", { precision: 24, scale: 12 }),
		isPrimary: boolean("is_primary").notNull().default(false),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "md_item_barcode_org_item_fk",
		}),
		index("md_item_barcode_org_item_idx").on(t.organizationId, t.itemId),
		index("md_item_barcode_uom_idx").on(t.uomId),
		uniqueIndex("md_item_barcode_active_identity_uidx")
			.on(t.organizationId, t.symbology, t.normalizedValue)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
		uniqueIndex("md_item_barcode_primary_item_uom_uidx")
			.on(
				t.organizationId,
				t.itemId,
				// Keep database uniqueness aligned with primary-record policy:
				// null uomId is one explicit item-level barcode scope.
				sql`coalesce(${t.uomId}::text, '')`,
			)
			.where(
				sql`${t.isPrimary} = true AND ${t.status} = 'active' AND ${t.archivedAt} IS NULL`,
			),
		check(
			"md_item_barcode_symbology_ck",
			sql`${t.symbology} IN ('EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'GTIN_14', 'CODE_128', 'QR', 'INTERNAL', 'OTHER')`,
		),
		check(
			"md_item_barcode_pack_ck",
			sql`(${t.uomId} IS NULL AND ${t.packQuantity} IS NULL) OR (${t.uomId} IS NOT NULL AND ${t.packQuantity} > 0)`,
		),
		check(
			"md_item_barcode_status_ck",
			sql`${t.status} IN ('pending', 'active', 'expired', 'revoked', 'archived')`,
		),
		check("md_item_barcode_version_ck", sql`${t.version} > 0`),
	],
);

export const mdItemExternalId = pgTable(
	"md_item_external_id",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id").notNull(),
		sourceSystem: text("source_system").notNull(),
		externalIdType: text("external_id_type").notNull(),
		externalValue: text("external_value").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		caseSensitivity: text("case_sensitivity").notNull(),
		isPrimary: boolean("is_primary").notNull().default(false),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "md_item_external_id_org_item_fk",
		}),
		index("md_item_external_id_org_item_idx").on(t.organizationId, t.itemId),
		check(
			"md_item_external_id_case_sensitivity_ck",
			sql`${t.caseSensitivity} IN ('sensitive', 'insensitive')`,
		),
		check(
			"md_item_external_id_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_item_external_id_version_ck", sql`${t.version} > 0`),
		uniqueIndex("md_item_external_id_active_identity_uidx")
			.on(t.organizationId, t.sourceSystem, t.externalIdType, t.normalizedValue)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
		uniqueIndex("md_item_external_id_active_primary_uidx")
			.on(t.organizationId, t.itemId, t.sourceSystem, t.externalIdType)
			.where(
				sql`${t.isPrimary} = true AND ${t.status} = 'active' AND ${t.archivedAt} IS NULL`,
			),
	],
);

export const mdItemAlias = pgTable(
	"md_item_alias",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id").notNull(),
		aliasType: text("alias_type").notNull(),
		aliasValue: text("alias_value").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		languageId: uuid("language_id").references(() => refLanguage.id),
		source: text("source").notNull(),
		isSearchable: boolean("is_searchable").notNull().default(true),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		/** Nullable migration evidence; lifecycle authority is status/archive. */
		legacyRetiredAt: timestamp("retired_at", { withTimezone: true }),
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
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "md_item_alias_org_item_fk",
		}),
		index("md_item_alias_org_item_idx").on(t.organizationId, t.itemId),
		index("md_item_alias_org_search_idx").on(
			t.organizationId,
			t.normalizedValue,
			t.aliasType,
			t.languageId,
		),
		index("md_item_alias_language_idx").on(t.languageId),
		check(
			"md_item_alias_type_ck",
			sql`${t.aliasType} IN ('short_name', 'commercial_name', 'supplier_name', 'customer_name', 'legacy_name', 'local_name', 'scientific_name', 'search_keyword', 'other')`,
		),
		check("md_item_alias_source_ck", sql`${t.source} ~ '^[a-z0-9._-]+$'`),
		check(
			"md_item_alias_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_item_alias_version_ck", sql`${t.version} > 0`),
		uniqueIndex("md_item_alias_active_identity_uidx")
			.on(
				t.organizationId,
				t.itemId,
				t.aliasType,
				sql`coalesce(${t.languageId}::text, '')`,
				t.normalizedValue,
			)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
	],
);

export const mdWarehouseExternalId = pgTable(
	"md_warehouse_external_id",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		warehouseId: uuid("warehouse_id").notNull(),
		sourceSystem: text("source_system").notNull(),
		externalIdType: text("external_id_type").notNull(),
		externalValue: text("external_value").notNull(),
		normalizedValue: text("normalized_value").notNull(),
		caseSensitivity: text("case_sensitivity").notNull(),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.warehouseId],
			foreignColumns: [mdWarehouse.organizationId, mdWarehouse.id],
			name: "md_warehouse_external_id_org_warehouse_fk",
		}),
		index("md_warehouse_external_id_org_wh_idx").on(
			t.organizationId,
			t.warehouseId,
		),
		uniqueIndex("md_warehouse_external_id_active_identity_uidx")
			.on(t.organizationId, t.sourceSystem, t.externalIdType, t.normalizedValue)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
		check(
			"md_warehouse_external_id_source_system_ck",
			sql`${t.sourceSystem} ~ '^[a-z0-9._-]+$'`,
		),
		check(
			"md_warehouse_external_id_type_ck",
			sql`${t.externalIdType} ~ '^[a-z0-9._-]+$'`,
		),
		check(
			"md_warehouse_external_id_case_sensitivity_ck",
			sql`${t.caseSensitivity} IN ('sensitive', 'insensitive')`,
		),
		check(
			"md_warehouse_external_id_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_warehouse_external_id_version_ck", sql`${t.version} > 0`),
	],
);

// ── Item variants & attributes (DNA §7.3 / R1) — no JSON bag SSOT ───────────

export const mdItemTemplate = pgTable(
	"md_item_template",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		status: text("status").notNull().default("draft"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		activatedAt: timestamp("activated_at", { withTimezone: true }),
		activatedBy: text("activated_by"),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("md_item_template_org_id_uidx").on(t.organizationId, t.id),
		index("md_item_template_org_id_idx").on(t.organizationId, t.id),
		index("md_item_template_org_status_idx").on(t.organizationId, t.status),
		index("md_item_template_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_item_template_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL`),
		check("md_item_template_version_ck", sql`${t.version} > 0`),
	],
);

export const mdItemTemplateAttribute = pgTable(
	"md_item_template_attribute",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		templateId: uuid("template_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		dataType: text("data_type").notNull(),
		isRequired: boolean("is_required").notNull().default(true),
		isVariantDefining: boolean("is_variant_defining").notNull().default(true),
		isSearchable: boolean("is_searchable").notNull().default(false),
		displayOrder: integer("display_order").notNull().default(0),
		validationRules: jsonb("validation_rules").notNull().default({}),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.templateId],
			foreignColumns: [mdItemTemplate.organizationId, mdItemTemplate.id],
			name: "md_item_template_attribute_org_template_fk",
		}),
		unique("md_item_template_attribute_org_id_uidx").on(t.organizationId, t.id),
		index("md_item_template_attribute_org_template_idx").on(
			t.organizationId,
			t.templateId,
		),
		uniqueIndex("md_item_template_attribute_org_template_code_uidx").on(
			t.organizationId,
			t.templateId,
			t.normalizedCode,
		),
		check(
			"md_item_template_attribute_data_type_ck",
			sql`${t.dataType} IN ('text', 'integer', 'decimal', 'boolean', 'date', 'single_option', 'multiple_option', 'reference')`,
		),
		check(
			"md_item_template_attribute_display_order_ck",
			sql`${t.displayOrder} >= 0`,
		),
		check(
			"md_item_template_attribute_validation_rules_ck",
			sql`jsonb_typeof(${t.validationRules}) = 'object'`,
		),
		check(
			"md_item_template_attribute_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_item_template_attribute_version_ck", sql`${t.version} > 0`),
	],
);

export const mdItemTemplateAttributeOption = pgTable(
	"md_item_template_attribute_option",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		attributeId: uuid("attribute_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		label: text("label").notNull(),
		description: text("description"),
		displayOrder: integer("display_order").notNull().default(0),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.attributeId],
			foreignColumns: [
				mdItemTemplateAttribute.organizationId,
				mdItemTemplateAttribute.id,
			],
			name: "md_item_template_attribute_option_org_attribute_fk",
		}),
		unique("md_item_template_attribute_option_org_id_uidx").on(
			t.organizationId,
			t.id,
		),
		unique("md_item_template_attribute_option_org_id_attr_uidx").on(
			t.organizationId,
			t.id,
			t.attributeId,
		),
		index("md_item_template_attribute_option_org_attr_idx").on(
			t.organizationId,
			t.attributeId,
		),
		uniqueIndex("md_item_template_attribute_option_org_attr_code_uidx").on(
			t.organizationId,
			t.attributeId,
			t.normalizedCode,
		),
		check(
			"md_item_template_attribute_option_display_order_ck",
			sql`${t.displayOrder} >= 0`,
		),
		check(
			"md_item_template_attribute_option_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check(
			"md_item_template_attribute_option_version_ck",
			sql`${t.version} > 0`,
		),
	],
);

export const mdItemVariant = pgTable(
	"md_item_variant",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id").notNull(),
		templateId: uuid("template_id").notNull(),
		/** Derived uniqueness aid — value rows remain SSOT (not JSON bag). */
		combinationKey: text("combination_key").notNull(),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		retiredBy: text("retired_by"),
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
		foreignKey({
			columns: [t.organizationId, t.itemId],
			foreignColumns: [mdItem.organizationId, mdItem.id],
			name: "md_item_variant_org_item_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.templateId],
			foreignColumns: [mdItemTemplate.organizationId, mdItemTemplate.id],
			name: "md_item_variant_org_template_fk",
		}),
		unique("md_item_variant_org_id_uidx").on(t.organizationId, t.id),
		index("md_item_variant_org_template_idx").on(
			t.organizationId,
			t.templateId,
		),
		uniqueIndex("md_item_variant_org_item_uidx").on(t.organizationId, t.itemId),
		uniqueIndex("md_item_variant_org_template_combination_live_uidx")
			.on(t.organizationId, t.templateId, t.combinationKey)
			.where(sql`${t.retiredAt} IS NULL`),
		check(
			"md_item_variant_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_item_variant_version_ck", sql`${t.version} > 0`),
	],
);

export const mdItemVariantAttributeValue = pgTable(
	"md_item_variant_attribute_value",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		variantId: uuid("variant_id").notNull(),
		attributeId: uuid("attribute_id").notNull(),
		valueType: text("value_type").notNull(),
		textValue: text("text_value"),
		integerValue: numeric("integer_value", { precision: 38, scale: 0 }),
		decimalValue: numeric("decimal_value", { precision: 38, scale: 18 }),
		booleanValue: boolean("boolean_value"),
		dateValue: date("date_value"),
		optionId: uuid("option_id"),
		referenceValue: text("reference_value"),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		foreignKey({
			columns: [t.organizationId, t.variantId],
			foreignColumns: [mdItemVariant.organizationId, mdItemVariant.id],
			name: "md_item_variant_attribute_value_org_variant_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.attributeId],
			foreignColumns: [
				mdItemTemplateAttribute.organizationId,
				mdItemTemplateAttribute.id,
			],
			name: "md_item_variant_attribute_value_org_attribute_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.optionId, t.attributeId],
			foreignColumns: [
				mdItemTemplateAttributeOption.organizationId,
				mdItemTemplateAttributeOption.id,
				mdItemTemplateAttributeOption.attributeId,
			],
			name: "md_item_variant_attribute_value_org_option_fk",
		}),
		check(
			"md_item_variant_attribute_value_typed_value_ck",
			sql`(${t.valueType} = 'text' AND ${t.textValue} IS NOT NULL AND num_nonnulls(${t.integerValue}, ${t.decimalValue}, ${t.booleanValue}, ${t.dateValue}, ${t.optionId}, ${t.referenceValue}) = 0)
				OR (${t.valueType} = 'integer' AND ${t.integerValue} IS NOT NULL AND num_nonnulls(${t.textValue}, ${t.decimalValue}, ${t.booleanValue}, ${t.dateValue}, ${t.optionId}, ${t.referenceValue}) = 0)
				OR (${t.valueType} = 'decimal' AND ${t.decimalValue} IS NOT NULL AND num_nonnulls(${t.textValue}, ${t.integerValue}, ${t.booleanValue}, ${t.dateValue}, ${t.optionId}, ${t.referenceValue}) = 0)
				OR (${t.valueType} = 'boolean' AND ${t.booleanValue} IS NOT NULL AND num_nonnulls(${t.textValue}, ${t.integerValue}, ${t.decimalValue}, ${t.dateValue}, ${t.optionId}, ${t.referenceValue}) = 0)
				OR (${t.valueType} = 'date' AND ${t.dateValue} IS NOT NULL AND num_nonnulls(${t.textValue}, ${t.integerValue}, ${t.decimalValue}, ${t.booleanValue}, ${t.optionId}, ${t.referenceValue}) = 0)
				OR (${t.valueType} = 'single_option' AND ${t.optionId} IS NOT NULL AND num_nonnulls(${t.textValue}, ${t.integerValue}, ${t.decimalValue}, ${t.booleanValue}, ${t.dateValue}, ${t.referenceValue}) = 0)
				OR (${t.valueType} = 'multiple_option' AND num_nonnulls(${t.textValue}, ${t.integerValue}, ${t.decimalValue}, ${t.booleanValue}, ${t.dateValue}, ${t.optionId}, ${t.referenceValue}) = 0)
				OR (${t.valueType} = 'reference' AND ${t.referenceValue} IS NOT NULL AND num_nonnulls(${t.textValue}, ${t.integerValue}, ${t.decimalValue}, ${t.booleanValue}, ${t.dateValue}, ${t.optionId}) = 0)`,
		),
		check(
			"md_item_variant_attribute_value_status_ck",
			sql`${t.status} IN ('draft', 'active', 'inactive', 'archived')`,
		),
		check("md_item_variant_attribute_value_version_ck", sql`${t.version} > 0`),
		unique("md_item_variant_attribute_value_org_id_attr_uidx").on(
			t.organizationId,
			t.id,
			t.attributeId,
		),
		index("md_item_variant_attribute_value_org_variant_idx").on(
			t.organizationId,
			t.variantId,
		),
		uniqueIndex("md_item_variant_attribute_value_current_uidx")
			.on(t.organizationId, t.variantId, t.attributeId)
			.where(sql`${t.status} = 'active' AND ${t.archivedAt} IS NULL`),
	],
);

export const mdItemVariantAttributeValueOption = pgTable(
	"md_item_variant_attribute_value_option",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		valueId: uuid("value_id").notNull(),
		attributeId: uuid("attribute_id").notNull(),
		optionId: uuid("option_id").notNull(),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		foreignKey({
			columns: [t.organizationId, t.valueId, t.attributeId],
			foreignColumns: [
				mdItemVariantAttributeValue.organizationId,
				mdItemVariantAttributeValue.id,
				mdItemVariantAttributeValue.attributeId,
			],
			name: "md_item_variant_attribute_value_option_org_value_fk",
		}),
		foreignKey({
			columns: [t.organizationId, t.optionId, t.attributeId],
			foreignColumns: [
				mdItemTemplateAttributeOption.organizationId,
				mdItemTemplateAttributeOption.id,
				mdItemTemplateAttributeOption.attributeId,
			],
			name: "md_item_variant_attribute_value_option_org_option_fk",
		}),
		uniqueIndex("md_item_variant_attribute_value_option_identity_uidx").on(
			t.organizationId,
			t.valueId,
			t.optionId,
		),
		index("md_item_variant_attribute_value_option_value_idx").on(
			t.organizationId,
			t.valueId,
		),
	],
);

// ── Import batch idempotency (apply path) ───────────────────────────────────

export const mdImportBatch = pgTable(
	"md_import_batch",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		idempotencyKey: text("idempotency_key").notNull(),
		payloadHash: text("payload_hash").notNull(),
		operationType: text("operation_type").notNull(),
		entityType: text("entity_type").notNull(),
		sourceSystem: text("source_system").notNull(),
		mode: text("mode").notNull(),
		status: text("status").notNull().default("claimed"),
		report: jsonb("report").notNull(),
		leaseOwner: text("lease_owner"),
		leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("md_import_batch_org_id_uidx").on(t.organizationId, t.id),
		index("md_import_batch_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("md_import_batch_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
		check(
			"md_import_batch_status_ck",
			sql`${t.status} IN ('claimed', 'validating', 'approval_pending', 'approved', 'applying', 'partially_applied', 'applied', 'failed', 'cancelled')`,
		),
		check(
			"md_import_batch_lease_ck",
			sql`(${t.leaseOwner} IS NULL AND ${t.leaseExpiresAt} IS NULL) OR (${t.leaseOwner} IS NOT NULL AND ${t.leaseExpiresAt} IS NOT NULL)`,
		),
	],
);

export const mdImportBatchRow = pgTable(
	"md_import_batch_row",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		batchId: uuid("batch_id").notNull(),
		sourceRowNumber: integer("source_row_number").notNull(),
		payloadHash: text("payload_hash").notNull(),
		normalizedPayload: jsonb("normalized_payload").notNull(),
		intendedOperation: text("intended_operation"),
		matchedEntityId: uuid("matched_entity_id"),
		status: text("status").notNull().default("pending"),
		errorCode: text("error_code"),
		errorDetails: jsonb("error_details"),
		resultEntityId: uuid("result_entity_id"),
		resultVersion: integer("result_version"),
		attemptCount: integer("attempt_count").notNull().default(0),
		leaseOwner: text("lease_owner"),
		leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		foreignKey({
			columns: [t.organizationId, t.batchId],
			foreignColumns: [mdImportBatch.organizationId, mdImportBatch.id],
			name: "md_import_batch_row_org_batch_fk",
		}),
		uniqueIndex("md_import_batch_row_org_source_uidx").on(
			t.organizationId,
			t.batchId,
			t.sourceRowNumber,
		),
		index("md_import_batch_row_org_status_idx").on(
			t.organizationId,
			t.batchId,
			t.status,
			t.sourceRowNumber,
		),
		check(
			"md_import_batch_row_source_number_ck",
			sql`${t.sourceRowNumber} > 0`,
		),
		check(
			"md_import_batch_row_status_ck",
			sql`${t.status} IN ('pending', 'applying', 'applied', 'failed', 'skipped')`,
		),
		check(
			"md_import_batch_row_operation_ck",
			sql`${t.intendedOperation} IS NULL OR ${t.intendedOperation} IN ('create', 'update', 'skip', 'reject')`,
		),
		check(
			"md_import_batch_row_lease_ck",
			sql`(${t.leaseOwner} IS NULL AND ${t.leaseExpiresAt} IS NULL) OR (${t.leaseOwner} IS NOT NULL AND ${t.leaseExpiresAt} IS NOT NULL)`,
		),
	],
);

// ── MDG change requests (R2) — controlled master-data maker-checker only ────

export const mdChangeRequest = pgTable(
	"md_change_request",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** MDG v1: activate_party | merge_parties; not a generic workflow key */
		commandKind: text("command_kind").notNull(),
		/** Governance workflow: draft | submitted | approved | rejected | applying | applied | failed | cancelled | expired | superseded */
		status: text("status").notNull().default("submitted"),
		version: integer("version").notNull().default(1),
		payload: jsonb("payload").notNull(),
		subjectEntityType: text("subject_entity_type").notNull(),
		subjectEntityId: uuid("subject_entity_id").notNull(),
		submittedBy: text("submitted_by").notNull(),
		submittedAt: timestamp("submitted_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		reviewedBy: text("reviewed_by"),
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
		reviewNote: text("review_note"),
		appliedBy: text("applied_by"),
		appliedAt: timestamp("applied_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("md_change_request_org_id_idx").on(t.organizationId, t.id),
		index("md_change_request_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("md_change_request_org_normalized_code_uidx").on(
			t.organizationId,
			t.normalizedCode,
		),
		check(
			"md_change_request_status_ck",
			sql`${t.status} IN ('draft', 'submitted', 'approved', 'rejected', 'applying', 'applied', 'failed', 'cancelled', 'expired', 'superseded')`,
		),
		check("md_change_request_version_ck", sql`${t.version} > 0`),
	],
);
