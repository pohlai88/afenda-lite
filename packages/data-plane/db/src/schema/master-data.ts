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
		/** legal_entity | business_unit | location | cost_centre | project */
		kind: text("kind").notNull(),
		key: text("key").notNull(),
		normalizedKey: text("normalized_key").notNull(),
		name: text("name").notNull(),
		effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
		effectiveTo: date("effective_to", { mode: "string" }),
		supersedesId: uuid("supersedes_id"),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("md_org_dimension_org_id_uidx").on(t.organizationId, t.id),
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
		uniqueIndex("md_org_dimension_org_kind_key_from_uidx").on(
			t.organizationId,
			t.kind,
			t.normalizedKey,
			t.effectiveFrom,
		),
		check(
			"md_org_dimension_kind_check",
			sql`${t.kind} IN ('legal_entity', 'business_unit', 'location', 'cost_centre', 'project')`,
		),
		check(
			"md_org_dimension_effective_range_check",
			sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} >= ${t.effectiveFrom}`,
		),
		foreignKey({
			columns: [t.organizationId, t.supersedesId],
			foreignColumns: [t.organizationId, t.id],
			name: "md_org_dimension_org_supersedes_fk",
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
		index("md_item_org_id_idx").on(t.organizationId, t.id),
		index("md_item_org_status_idx").on(t.organizationId, t.status),
		index("md_item_org_group_idx").on(t.organizationId, t.itemGroupId),
		index("md_item_base_uom_idx").on(t.baseUomId),
		index("md_item_org_updated_at_idx").on(t.organizationId, t.updatedAt, t.id),
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
		index("md_warehouse_org_id_idx").on(t.organizationId, t.id),
		index("md_warehouse_org_status_idx").on(t.organizationId, t.status),
		index("md_warehouse_org_parent_idx").on(t.organizationId, t.parentId),
		index("md_warehouse_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_warehouse_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL`),
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
		index("md_payment_term_org_updated_at_idx").on(
			t.organizationId,
			t.updatedAt,
			t.id,
		),
		uniqueIndex("md_payment_term_org_normalized_code_live_uidx")
			.on(t.organizationId, t.normalizedCode)
			.where(sql`${t.retiredAt} IS NULL`),
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
	],
);

// ── Aggregate extensions (org-scoped children; mutate via @afenda/master-data) ─

export const mdPartyRole = pgTable(
	"md_party_role",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id")
			.notNull()
			.references(() => mdParty.id),
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("md_party_role_org_party_idx").on(t.organizationId, t.partyId),
		index("md_party_role_org_status_idx").on(t.organizationId, t.status),
		uniqueIndex("md_party_role_org_party_code_live_uidx")
			.on(t.organizationId, t.partyId, t.roleCode)
			.where(sql`${t.retiredAt} IS NULL`),
	],
);

export const mdPartyAddress = pgTable(
	"md_party_address",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id")
			.notNull()
			.references(() => mdParty.id),
		addressType: text("address_type").notNull(),
		line1: text("line1").notNull(),
		line2: text("line2"),
		city: text("city").notNull(),
		region: text("region"),
		postalCode: text("postal_code"),
		countryId: uuid("country_id")
			.notNull()
			.references(() => refCountry.id),
		isDefault: boolean("is_default").notNull().default(false),
		verificationStatus: text("verification_status")
			.notNull()
			.default("unverified"),
		version: integer("version").notNull().default(1),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
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
		index("md_party_address_org_party_idx").on(t.organizationId, t.partyId),
		index("md_party_address_org_country_idx").on(t.organizationId, t.countryId),
	],
);

export const mdPartyContact = pgTable(
	"md_party_contact",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id")
			.notNull()
			.references(() => mdParty.id),
		contactType: text("contact_type").notNull(),
		value: text("value").notNull(),
		purpose: text("purpose"),
		isPrimary: boolean("is_primary").notNull().default(false),
		verificationStatus: text("verification_status")
			.notNull()
			.default("unverified"),
		version: integer("version").notNull().default(1),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
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
		index("md_party_contact_org_party_idx").on(t.organizationId, t.partyId),
	],
);

export const mdPartyExternalId = pgTable(
	"md_party_external_id",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		partyId: uuid("party_id")
			.notNull()
			.references(() => mdParty.id),
		system: text("system").notNull(),
		namespace: text("namespace").notNull().default(""),
		externalId: text("external_id").notNull(),
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
		index("md_party_external_id_org_party_idx").on(t.organizationId, t.partyId),
		uniqueIndex("md_party_external_id_org_sys_ns_ext_uidx").on(
			t.organizationId,
			t.system,
			t.namespace,
			t.externalId,
		),
	],
);

export const mdPartyRelationship = pgTable(
	"md_party_relationship",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		fromPartyId: uuid("from_party_id")
			.notNull()
			.references(() => mdParty.id),
		toPartyId: uuid("to_party_id")
			.notNull()
			.references(() => mdParty.id),
		relationshipType: text("relationship_type").notNull(),
		status: text("status").notNull().default("active"),
		version: integer("version").notNull().default(1),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
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
		index("md_party_relationship_org_from_idx").on(
			t.organizationId,
			t.fromPartyId,
		),
		index("md_party_relationship_org_to_idx").on(t.organizationId, t.toPartyId),
		uniqueIndex("md_party_relationship_org_pair_type_uidx").on(
			t.organizationId,
			t.fromPartyId,
			t.toPartyId,
			t.relationshipType,
		),
	],
);

export const mdItemUom = pgTable(
	"md_item_uom",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		uomId: uuid("uom_id")
			.notNull()
			.references(() => refUom.id),
		/** Exact conversion to item base UoM — never float. */
		toBaseNumerator: numeric("to_base_numerator", {
			precision: 24,
			scale: 12,
		}).notNull(),
		toBaseDenominator: numeric("to_base_denominator", {
			precision: 24,
			scale: 12,
		}).notNull(),
		/** purchase | sales | packaging | other */
		usage: text("usage").notNull(),
		barcode: text("barcode"),
		roundingRule: text("rounding_rule"),
		minQuantity: numeric("min_quantity", { precision: 24, scale: 12 }),
		version: integer("version").notNull().default(1),
		validFrom: timestamp("valid_from", { withTimezone: true }),
		validTo: timestamp("valid_to", { withTimezone: true }),
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
		index("md_item_uom_org_item_idx").on(t.organizationId, t.itemId),
		index("md_item_uom_uom_idx").on(t.uomId),
		uniqueIndex("md_item_uom_org_item_uom_usage_uidx").on(
			t.organizationId,
			t.itemId,
			t.uomId,
			t.usage,
		),
	],
);

export const mdItemBarcode = pgTable(
	"md_item_barcode",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		barcode: text("barcode").notNull(),
		barcodeType: text("barcode_type").notNull().default("generic"),
		isPrimary: boolean("is_primary").notNull().default(false),
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
		index("md_item_barcode_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("md_item_barcode_org_barcode_uidx").on(
			t.organizationId,
			t.barcode,
		),
	],
);

export const mdItemExternalId = pgTable(
	"md_item_external_id",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		system: text("system").notNull(),
		namespace: text("namespace").notNull().default(""),
		externalId: text("external_id").notNull(),
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
		index("md_item_external_id_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("md_item_external_id_org_sys_ns_ext_uidx").on(
			t.organizationId,
			t.system,
			t.namespace,
			t.externalId,
		),
	],
);

export const mdItemAlias = pgTable(
	"md_item_alias",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		aliasCode: text("alias_code").notNull(),
		normalizedAlias: text("normalized_alias").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		retiredAt: timestamp("retired_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("md_item_alias_org_item_idx").on(t.organizationId, t.itemId),
		uniqueIndex("md_item_alias_org_normalized_live_uidx")
			.on(t.organizationId, t.normalizedAlias)
			.where(sql`${t.retiredAt} IS NULL`),
	],
);

export const mdWarehouseExternalId = pgTable(
	"md_warehouse_external_id",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		warehouseId: uuid("warehouse_id")
			.notNull()
			.references(() => mdWarehouse.id),
		system: text("system").notNull(),
		namespace: text("namespace").notNull().default(""),
		externalId: text("external_id").notNull(),
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
		index("md_warehouse_external_id_org_wh_idx").on(
			t.organizationId,
			t.warehouseId,
		),
		uniqueIndex("md_warehouse_external_id_org_sys_ns_ext_uidx").on(
			t.organizationId,
			t.system,
			t.namespace,
			t.externalId,
		),
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
	],
);

export const mdItemTemplateAttribute = pgTable(
	"md_item_template_attribute",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		templateId: uuid("template_id")
			.notNull()
			.references(() => mdItemTemplate.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		name: text("name").notNull(),
		/** text | option */
		valueKind: text("value_kind").notNull(),
		isRequired: boolean("is_required").notNull().default(true),
		sortOrder: integer("sort_order").notNull().default(0),
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
		index("md_item_template_attribute_org_template_idx").on(
			t.organizationId,
			t.templateId,
		),
		uniqueIndex("md_item_template_attribute_org_template_code_uidx").on(
			t.organizationId,
			t.templateId,
			t.normalizedCode,
		),
	],
);

export const mdItemTemplateAttributeOption = pgTable(
	"md_item_template_attribute_option",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		attributeId: uuid("attribute_id")
			.notNull()
			.references(() => mdItemTemplateAttribute.id),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		label: text("label").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
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
		index("md_item_template_attribute_option_org_attr_idx").on(
			t.organizationId,
			t.attributeId,
		),
		uniqueIndex("md_item_template_attribute_option_org_attr_code_uidx").on(
			t.organizationId,
			t.attributeId,
			t.normalizedCode,
		),
	],
);

export const mdItemVariant = pgTable(
	"md_item_variant",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		itemId: uuid("item_id")
			.notNull()
			.references(() => mdItem.id),
		templateId: uuid("template_id")
			.notNull()
			.references(() => mdItemTemplate.id),
		/** Derived uniqueness aid — value rows remain SSOT (not JSON bag). */
		combinationKey: text("combination_key").notNull(),
		version: integer("version").notNull().default(1),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
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
		index("md_item_variant_org_template_idx").on(
			t.organizationId,
			t.templateId,
		),
		uniqueIndex("md_item_variant_org_item_uidx").on(t.organizationId, t.itemId),
		uniqueIndex("md_item_variant_org_template_combination_live_uidx")
			.on(t.organizationId, t.templateId, t.combinationKey)
			.where(sql`${t.retiredAt} IS NULL`),
	],
);

export const mdItemVariantAttributeValue = pgTable(
	"md_item_variant_attribute_value",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		variantId: uuid("variant_id")
			.notNull()
			.references(() => mdItemVariant.id),
		attributeId: uuid("attribute_id")
			.notNull()
			.references(() => mdItemTemplateAttribute.id),
		valueText: text("value_text"),
		optionId: uuid("option_id").references(
			() => mdItemTemplateAttributeOption.id,
		),
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
		index("md_item_variant_attribute_value_org_variant_idx").on(
			t.organizationId,
			t.variantId,
		),
		uniqueIndex("md_item_variant_attribute_value_org_variant_attr_uidx").on(
			t.organizationId,
			t.variantId,
			t.attributeId,
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
		entityType: text("entity_type").notNull(),
		sourceSystem: text("source_system").notNull(),
		mode: text("mode").notNull(),
		status: text("status").notNull().default("applied"),
		report: jsonb("report").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("md_import_batch_org_id_idx").on(t.organizationId, t.id),
		uniqueIndex("md_import_batch_org_idempotency_uidx").on(
			t.organizationId,
			t.idempotencyKey,
		),
	],
);

// ── MDG change requests (R2) — maker-checker for gated commands ─────────────

export const mdChangeRequest = pgTable(
	"md_change_request",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		code: text("code").notNull(),
		normalizedCode: text("normalized_code").notNull(),
		/** activate_party | merge_parties */
		commandKind: text("command_kind").notNull(),
		/** submitted | approved | rejected | applied */
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
	],
);
