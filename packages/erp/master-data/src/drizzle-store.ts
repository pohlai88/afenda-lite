import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	eq,
	isNull,
	mdImportBatch,
	mdItem,
	mdItemGroup,
	mdParty,
	mdPaymentTerm,
	mdTaxRegistration,
	mdWarehouse,
	refCountry,
	refCurrency,
	refLanguage,
	refTimeZone,
	refUom,
	refUomDimension,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";
import type {
	ItemGroupLifecycleEventSuffix,
	PartyLifecycleEventSuffix,
	PaymentTermLifecycleEventSuffix,
	TaxRegistrationLifecycleEventSuffix,
	WarehouseLifecycleEventSuffix,
} from "./capabilities/core-organization-masters/core-master-events";
import { isWarehouseParentTypeCompatible } from "./capabilities/core-organization-masters/core-master-policy";
import { resolveItemOperationalProfile } from "./capabilities/core-organization-masters/item-operational-profile";
import {
	assertLifecycleTransition,
	assertRestoreTransition,
	assertTaxRegistrationLifecycleTransition,
} from "./capabilities/core-organization-masters/lifecycle";
import {
	mapItem,
	mapItemGroup,
	mapParty,
	mapPaymentTerm,
	mapRefCountry,
	mapRefCurrency,
	mapRefLanguage,
	mapRefTimeZone,
	mapRefUom,
	mapRefUomDimension,
	mapTaxRegistration,
	mapWarehouse,
} from "./capabilities/core-organization-masters/map-row";
import { createDrizzleOrganizationDimensionStore } from "./capabilities/core-organization-masters/organization-dimension";
import type { OrganizationDimensionStore } from "./capabilities/core-organization-masters/organization-dimension-store";
import { normalizePaymentTermRule } from "./capabilities/core-organization-masters/payment-term-rule";
import type {
	ImportBatchCreateRecord,
	ImportBatchEntityType,
	ImportBatchRecord,
	ItemCreateRecord,
	ItemGroupCreateRecord,
	ItemGroupLifecycleRecord,
	ItemGroupUpdateRecord,
	ItemListFilter,
	ItemUpdateRecord,
	ListFilter,
	MasterDataStore,
	PartyByRoleFilter,
	PartyCreateRecord,
	PartyLifecycleRecord,
	PartyMergeRecord,
	PartySearchFilter,
	PartyTaxRegistrationLookup,
	PartyUpdateRecord,
	PaymentTermCreateRecord,
	PaymentTermLifecycleRecord,
	PaymentTermUpdateRecord,
	TaxRegistrationCreateRecord,
	TaxRegistrationLifecycleRecord,
	TaxRegistrationListFilter,
	TaxRegistrationOverlapQuery,
	TaxRegistrationUpdateRecord,
	WarehouseCreateRecord,
	WarehouseLifecycleRecord,
	WarehouseMoveRecord,
	WarehouseUpdateRecord,
} from "./capabilities/core-organization-masters/store";
import { isInvalidValidityRange } from "./capabilities/core-organization-masters/validity-overlap";
import {
	drizzleCreateChangeRequest,
	drizzleGetChangeRequestById,
	drizzleListChangeRequests,
	drizzleTransitionChangeRequest,
} from "./capabilities/data-governance-workflows/drizzle-change-request-store";
import {
	drizzleCountActivePartyRoles,
	drizzleCreateItemAlias,
	drizzleCreateItemBarcode,
	drizzleCreateItemExternalId,
	drizzleCreateItemUom,
	drizzleCreatePartyAddress,
	drizzleCreatePartyContact,
	drizzleCreatePartyExternalId,
	drizzleCreatePartyRelationship,
	drizzleCreatePartyRole,
	drizzleCreateWarehouseExternalId,
	drizzleFindItemByAlias,
	drizzleFindItemByBarcode,
	drizzleFindItemByExternalId,
	drizzleFindPartyByExternalId,
	drizzleFindWarehouseByExternalId,
	drizzleGetDefaultItemPurchaseUom,
	drizzleGetDefaultItemSalesUom,
	drizzleGetPartyAddressById,
	drizzleGetPartyRoleById,
	drizzleGetPartyRoleLifecycleContext,
	drizzleGetPrimaryPartyAddress,
	drizzleGetPrimaryPartyContact,
	drizzleListActivePartyRoles,
	drizzleListItemAliases,
	drizzleListItemsByAlias,
	drizzleListItemUoms,
	drizzleListPartyAddresses,
	drizzleListPartyContacts,
	drizzleListPartyRelationships,
	drizzleListPartyRoles,
	drizzleResolveItemUomCompatibilityContext,
	drizzleTransitionPartyRole,
	drizzleUpdatePartyAddress,
	drizzleUpdatePartyContact,
	drizzleUpdatePartyContactVerification,
	drizzleUpdatePartyRole,
} from "./capabilities/extensions/adapters/drizzle/extension-mutations";
import {
	drizzleAddItemTemplateAttribute,
	drizzleAddItemTemplateAttributeOption,
	drizzleCreateItemTemplate,
	drizzleCreateItemVariant,
	drizzleGetItemTemplateAttributeContextById,
	drizzleGetItemTemplateByCode,
	drizzleGetItemTemplateById,
	drizzleGetItemVariantById,
	drizzleListItemTemplateAttributeOptions,
	drizzleListItemTemplateAttributeOptionsByTemplate,
	drizzleListItemTemplateAttributes,
	drizzleListItemTemplates,
	drizzleListItemVariantsByTemplate,
	drizzleRetireItemVariant,
	drizzleTransitionItemTemplate,
	drizzleTransitionItemWithVariantSideEffect,
	drizzleUpdateItemTemplate,
} from "./capabilities/extensions/adapters/drizzle/variant-mutations";
import type { MasterFailureDetails } from "./contracts/reasons";
import type { MutationPorts } from "./ports";
import type {
	Item,
	ItemGroup,
	Party,
	PaymentTerm,
	RefCountry,
	RefCurrency,
	RefLanguage,
	RefTimeZone,
	RefUom,
	RefUomDimension,
	TaxRegistration,
	Warehouse,
	WarehouseLocationType,
} from "./types";
import { MAX_PAYMENT_TERM_NET_DAYS } from "./types";

function isUniqueViolation(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 4; depth += 1) {
		if (
			current === null ||
			current === undefined ||
			typeof current !== "object"
		) {
			return false;
		}
		const record = current as Record<string, unknown>;
		for (const key of ["code", "sqlState", "sqlstate"] as const) {
			if (record[key] === "23505") {
				return true;
			}
		}
		current = record.cause;
	}
	return false;
}

function hasSqlState(error: unknown, expected: string): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 4; depth += 1) {
		if (current === null || typeof current !== "object") return false;
		const record = current as Record<string, unknown>;
		if (
			["code", "sqlState", "sqlstate"].some((key) => record[key] === expected)
		) {
			return true;
		}
		current = record.cause;
	}
	return false;
}

function taxRegistrationOverlapConflict(): Result<never> {
	return fail("CONFLICT", "Active tax registration validity ranges overlap", {
		reason: "MASTER_VALIDITY_OVERLAP",
	} satisfies MasterFailureDetails);
}

function taxRegistrationValidityFailure(message: string): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_VALIDATION_FAILED",
	} satisfies MasterFailureDetails);
}

function codeConflict(message: string): Result<never> {
	return fail("CONFLICT", message, {
		reason: "MASTER_CODE_CONFLICT",
	} satisfies MasterFailureDetails);
}

function versionConflict(message: string): Result<never> {
	return fail("CONFLICT", message, {
		reason: "MASTER_VERSION_CONFLICT",
	} satisfies MasterFailureDetails);
}

function crossOrg(message: string): Result<never> {
	return fail("CONFLICT", message, {
		reason: "MASTER_CROSS_ORG_REFERENCE",
	} satisfies MasterFailureDetails);
}

function notFound(message: string): Result<never> {
	return fail("NOT_FOUND", message, {
		reason: "MASTER_NOT_FOUND",
	} satisfies MasterFailureDetails);
}

function validationFailed(message: string): Result<never> {
	return fail("BAD_REQUEST", message, {
		reason: "MASTER_VALIDATION_FAILED",
	} satisfies MasterFailureDetails);
}

function invalidState(message: string): Result<never> {
	return fail("CONFLICT", message, {
		reason: "MASTER_INVALID_STATE",
	} satisfies MasterFailureDetails);
}

type PartySqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	name: string;
	party_kind: string;
	status: string;
	version: number;
	legal_name: string | null;
	trading_name: string | null;
	registration_number: string | null;
	registration_country_id: string | null;
	preferred_language_id: string | null;
	default_currency_id: string | null;
	merged_into_id: string | null;
	created_by: string;
	updated_by: string;
	activated_at: string | Date | null;
	activated_by: string | null;
	blocked_at: string | Date | null;
	blocked_by: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	created_at: string | Date;
	updated_at: string | Date;
};

type ItemGroupSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	name: string;
	parent_id: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	activated_at: string | Date | null;
	activated_by: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	created_at: string | Date;
	updated_at: string | Date;
};

type ItemSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	name: string;
	item_type: string;
	description: string | null;
	tracking_policy: string;
	sellable: boolean;
	purchasable: boolean;
	stocked: boolean;
	service_indicator: boolean;
	status: string;
	version: number;
	base_uom_id: string;
	item_group_id: string;
	created_by: string;
	updated_by: string;
	activated_at: string | Date | null;
	activated_by: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	created_at: string | Date;
	updated_at: string | Date;
};

type WarehouseSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	name: string;
	location_type: string;
	parent_id: string | null;
	address_country_id: string | null;
	address_line1: string | null;
	address_line2: string | null;
	address_city: string | null;
	address_region: string | null;
	address_postal_code: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	activated_at: string | Date | null;
	activated_by: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	created_at: string | Date;
	updated_at: string | Date;
};

type PaymentTermSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	normalized_code: string;
	name: string;
	net_days: number;
	discount_days: number | null;
	discount_percent: string | null;
	due_day_rule: string;
	end_of_month: boolean;
	installment_policy: string;
	installment_count: number | null;
	valid_from: string | Date | null;
	valid_to: string | Date | null;
	currency_restriction_id: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	activated_at: string | Date | null;
	activated_by: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	created_at: string | Date;
	updated_at: string | Date;
};

type TaxRegistrationSqlRow = {
	id: string;
	organization_id: string;
	party_id: string;
	jurisdiction_country_id: string;
	registration_type: string;
	registration_number: string;
	normalized_registration_number: string;
	name: string | null;
	status: string;
	version: number;
	valid_from: string | Date | null;
	valid_to: string | Date | null;
	created_by: string;
	updated_by: string;
	activated_at: string | Date | null;
	activated_by: string | null;
	blocked_at: string | Date | null;
	blocked_by: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	deleted_at: string | Date | null;
	deleted_by: string | null;
	created_at: string | Date;
	updated_at: string | Date;
};

function toDate(value: string | Date | null | undefined): Date | null {
	if (value === null || value === undefined) {
		return null;
	}
	return value instanceof Date ? value : new Date(value);
}

function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	return JSON.stringify([{ field, oldValue, newValue }]);
}

function valueSnapshotJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function eventPayloadJson(
	input: {
		organizationId: string;
		entityType: string;
		entityId: string;
		code: string;
		version: number;
		actorId: string;
		correlationId: string;
	} & Record<string, unknown>,
): string {
	return JSON.stringify(input);
}

function mapWriteError(
	error: unknown,
	uniqueMessage: string,
	fallbackMessage: string,
): Result<never> {
	if (isUniqueViolation(error)) {
		return codeConflict(uniqueMessage);
	}
	return failFromUnknown(error, fallbackMessage);
}

function mapPartySqlRow(row: PartySqlRow): Party {
	return mapParty({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		name: row.name,
		partyKind: row.party_kind,
		status: row.status,
		version: row.version,
		legalName: row.legal_name,
		tradingName: row.trading_name,
		registrationNumber: row.registration_number,
		registrationCountryId: row.registration_country_id,
		preferredLanguageId: row.preferred_language_id,
		defaultCurrencyId: row.default_currency_id,
		mergedIntoId: row.merged_into_id,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		activatedAt: toDate(row.activated_at),
		activatedBy: row.activated_by,
		blockedAt: toDate(row.blocked_at),
		blockedBy: row.blocked_by,
		retiredAt: toDate(row.retired_at),
		retiredBy: row.retired_by,
		createdAt: toDate(row.created_at) ?? new Date(),
		updatedAt: toDate(row.updated_at) ?? new Date(),
	});
}

function mapItemGroupSqlRow(row: ItemGroupSqlRow): ItemGroup {
	return mapItemGroup({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		name: row.name,
		parentId: row.parent_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		activatedAt: toDate(row.activated_at),
		activatedBy: row.activated_by,
		retiredAt: toDate(row.retired_at),
		retiredBy: row.retired_by,
		createdAt: toDate(row.created_at) ?? new Date(),
		updatedAt: toDate(row.updated_at) ?? new Date(),
	});
}

function mapItemSqlRow(row: ItemSqlRow): Item {
	return mapItem({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		name: row.name,
		itemType: row.item_type,
		description: row.description,
		status: row.status,
		version: row.version,
		baseUomId: row.base_uom_id,
		itemGroupId: row.item_group_id,
		trackingPolicy: row.tracking_policy,
		sellable: row.sellable,
		purchasable: row.purchasable,
		stocked: row.stocked,
		serviceIndicator: row.service_indicator,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		activatedAt: toDate(row.activated_at),
		activatedBy: row.activated_by,
		retiredAt: toDate(row.retired_at),
		retiredBy: row.retired_by,
		createdAt: toDate(row.created_at) ?? new Date(),
		updatedAt: toDate(row.updated_at) ?? new Date(),
	});
}

function mapWarehouseSqlRow(row: WarehouseSqlRow): Warehouse {
	return mapWarehouse({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		name: row.name,
		locationType: row.location_type,
		parentId: row.parent_id,
		addressCountryId: row.address_country_id,
		addressLine1: row.address_line1,
		addressLine2: row.address_line2,
		addressCity: row.address_city,
		addressRegion: row.address_region,
		addressPostalCode: row.address_postal_code,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		activatedAt: toDate(row.activated_at),
		activatedBy: row.activated_by,
		retiredAt: toDate(row.retired_at),
		retiredBy: row.retired_by,
		createdAt: toDate(row.created_at) ?? new Date(),
		updatedAt: toDate(row.updated_at) ?? new Date(),
	});
}

function mapPaymentTermSqlRow(row: PaymentTermSqlRow): PaymentTerm {
	return mapPaymentTerm({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		name: row.name,
		netDays: row.net_days,
		discountDays: row.discount_days,
		discountPercent: row.discount_percent,
		dueDayRule: row.due_day_rule,
		endOfMonth: row.end_of_month,
		installmentPolicy: row.installment_policy,
		installmentCount: row.installment_count,
		validFrom: toDate(row.valid_from),
		validTo: toDate(row.valid_to),
		currencyRestrictionId: row.currency_restriction_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		activatedAt: toDate(row.activated_at),
		activatedBy: row.activated_by,
		retiredAt: toDate(row.retired_at),
		retiredBy: row.retired_by,
		createdAt: toDate(row.created_at) ?? new Date(),
		updatedAt: toDate(row.updated_at) ?? new Date(),
	});
}

function mapTaxRegistrationSqlRow(row: TaxRegistrationSqlRow): TaxRegistration {
	return mapTaxRegistration({
		id: row.id,
		organizationId: row.organization_id,
		partyId: row.party_id,
		jurisdictionCountryId: row.jurisdiction_country_id,
		registrationType: row.registration_type,
		registrationNumber: row.registration_number,
		normalizedRegistrationNumber: row.normalized_registration_number,
		name: row.name,
		status: row.status,
		version: row.version,
		validFrom: toDate(row.valid_from),
		validTo: toDate(row.valid_to),
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		activatedAt: toDate(row.activated_at),
		activatedBy: row.activated_by,
		blockedAt: toDate(row.blocked_at),
		blockedBy: row.blocked_by,
		retiredAt: toDate(row.retired_at),
		retiredBy: row.retired_by,
		deletedAt: toDate(row.deleted_at),
		deletedBy: row.deleted_by,
		createdAt: toDate(row.created_at) ?? new Date(),
		updatedAt: toDate(row.updated_at) ?? new Date(),
	});
}

async function assertItemGroupParent(
	organizationId: string,
	selfId: string | null,
	parentId: string | null,
): Promise<Result<true>> {
	if (parentId === null) {
		return ok(true);
	}
	if (selfId !== null && parentId === selfId) {
		return validationFailed("Item group cannot parent itself");
	}
	let cursor: string | null = parentId;
	const seen = new Set<string>();
	while (cursor !== null) {
		if (selfId !== null && cursor === selfId) {
			return invalidState("Item group parent would create a cycle");
		}
		if (seen.has(cursor)) {
			return invalidState("Item group parent would create a cycle");
		}
		seen.add(cursor);
		const [row] = await db
			.select({
				id: mdItemGroup.id,
				organizationId: mdItemGroup.organizationId,
				parentId: mdItemGroup.parentId,
				status: mdItemGroup.status,
				retiredAt: mdItemGroup.retiredAt,
			})
			.from(mdItemGroup)
			.where(eq(mdItemGroup.id, cursor))
			.limit(1);
		if (row === undefined || row.organizationId !== organizationId) {
			return crossOrg("Item group parent must exist in the same organization");
		}
		if (
			cursor === parentId &&
			(row.status !== "active" || row.retiredAt !== null)
		) {
			return invalidState("Item group parent must be active");
		}
		cursor = row.parentId;
	}
	return ok(true);
}

async function assertWarehouseParent(
	organizationId: string,
	selfId: string | null,
	parentId: string | null,
	childLocationType: WarehouseLocationType,
): Promise<Result<true>> {
	if (parentId === null) {
		return ok(true);
	}
	if (selfId !== null && parentId === selfId) {
		return validationFailed("Warehouse cannot parent itself");
	}
	let cursor: string | null = parentId;
	const seen = new Set<string>();
	while (cursor !== null) {
		if (selfId !== null && cursor === selfId) {
			return validationFailed("Warehouse parent would create a cycle");
		}
		if (seen.has(cursor)) {
			return validationFailed("Warehouse parent would create a cycle");
		}
		seen.add(cursor);
		const [rawRow] = await db
			.select()
			.from(mdWarehouse)
			.where(eq(mdWarehouse.id, cursor))
			.limit(1);
		if (rawRow === undefined || rawRow.organizationId !== organizationId) {
			return crossOrg("Warehouse parent must exist in the same organization");
		}
		const row = mapWarehouse(rawRow);
		if (cursor === parentId) {
			if (row.status !== "active" || row.retiredAt !== null) {
				return invalidState("Warehouse parent must be active");
			}
			if (
				!isWarehouseParentTypeCompatible(row.locationType, childLocationType)
			) {
				return validationFailed(
					"Warehouse parent and child location types are incompatible",
				);
			}
		}
		cursor = row.parentId;
	}
	return ok(true);
}

/**
 * Production MasterDataStore.
 * Current simple mutations use Neon HTTP `runNeonHttpTransaction` CTEs so
 * entity, audit, and outbox commit atomically in one round-trip.
 */
export class DrizzleMasterDataStore implements MasterDataStore {
	private readonly organizationDimensions: OrganizationDimensionStore =
		createDrizzleOrganizationDimensionStore();

	create(
		record: Parameters<OrganizationDimensionStore["create"]>[0],
	): ReturnType<OrganizationDimensionStore["create"]> {
		return this.organizationDimensions.create(record);
	}

	update(
		record: Parameters<OrganizationDimensionStore["update"]>[0],
	): ReturnType<OrganizationDimensionStore["update"]> {
		return this.organizationDimensions.update(record);
	}

	transition(
		input: Parameters<OrganizationDimensionStore["transition"]>[0],
	): ReturnType<OrganizationDimensionStore["transition"]> {
		return this.organizationDimensions.transition(input);
	}

	getById(
		input: Parameters<OrganizationDimensionStore["getById"]>[0],
	): ReturnType<OrganizationDimensionStore["getById"]> {
		return this.organizationDimensions.getById(input);
	}

	getByCode(
		input: Parameters<OrganizationDimensionStore["getByCode"]>[0],
	): ReturnType<OrganizationDimensionStore["getByCode"]> {
		return this.organizationDimensions.getByCode(input);
	}

	list(
		input: Parameters<OrganizationDimensionStore["list"]>[0],
	): ReturnType<OrganizationDimensionStore["list"]> {
		return this.organizationDimensions.list(input);
	}

	findEffective(
		input: Parameters<OrganizationDimensionStore["findEffective"]>[0],
	): ReturnType<OrganizationDimensionStore["findEffective"]> {
		return this.organizationDimensions.findEffective(input);
	}

	findEffectiveById(
		input: Parameters<OrganizationDimensionStore["findEffectiveById"]>[0],
	): ReturnType<OrganizationDimensionStore["findEffectiveById"]> {
		return this.organizationDimensions.findEffectiveById(input);
	}

	async getRefCountryByCode(code: string): Promise<Result<RefCountry | null>> {
		try {
			const [row] = await db
				.select()
				.from(refCountry)
				.where(eq(refCountry.code, code.trim().toUpperCase()))
				.limit(1);
			return ok(row === undefined ? null : mapRefCountry(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref country");
		}
	}

	async getRefCountryById(id: string): Promise<Result<RefCountry | null>> {
		try {
			const [row] = await db
				.select()
				.from(refCountry)
				.where(eq(refCountry.id, id))
				.limit(1);
			return ok(row === undefined ? null : mapRefCountry(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref country");
		}
	}

	async getRefCurrencyByCode(
		code: string,
	): Promise<Result<RefCurrency | null>> {
		try {
			const [row] = await db
				.select()
				.from(refCurrency)
				.where(eq(refCurrency.code, code.trim().toUpperCase()))
				.limit(1);
			return ok(row === undefined ? null : mapRefCurrency(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref currency");
		}
	}

	async getRefCurrencyById(id: string): Promise<Result<RefCurrency | null>> {
		try {
			const [row] = await db
				.select()
				.from(refCurrency)
				.where(eq(refCurrency.id, id))
				.limit(1);
			return ok(row === undefined ? null : mapRefCurrency(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref currency");
		}
	}

	async getRefLanguageByCode(
		code: string,
	): Promise<Result<RefLanguage | null>> {
		try {
			const [row] = await db
				.select()
				.from(refLanguage)
				.where(eq(refLanguage.code, code.trim().toLowerCase()))
				.limit(1);
			return ok(row === undefined ? null : mapRefLanguage(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref language");
		}
	}

	async getRefTimeZoneByIana(
		ianaName: string,
	): Promise<Result<RefTimeZone | null>> {
		try {
			const [row] = await db
				.select()
				.from(refTimeZone)
				.where(eq(refTimeZone.ianaName, ianaName.trim()))
				.limit(1);
			return ok(row === undefined ? null : mapRefTimeZone(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref time zone");
		}
	}

	async getRefUomDimensionByCode(
		code: string,
	): Promise<Result<RefUomDimension | null>> {
		try {
			const [row] = await db
				.select()
				.from(refUomDimension)
				.where(eq(refUomDimension.code, code.trim().toLowerCase()))
				.limit(1);
			return ok(row === undefined ? null : mapRefUomDimension(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref UoM dimension");
		}
	}

	async getRefUomById(id: string): Promise<Result<RefUom | null>> {
		try {
			const [row] = await db
				.select()
				.from(refUom)
				.where(eq(refUom.id, id))
				.limit(1);
			return ok(row === undefined ? null : mapRefUom(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref UoM");
		}
	}

	async getRefUomByCode(code: string): Promise<Result<RefUom | null>> {
		try {
			const [row] = await db
				.select()
				.from(refUom)
				.where(eq(refUom.code, code.trim().toUpperCase()))
				.limit(1);
			return ok(row === undefined ? null : mapRefUom(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load ref UoM by code");
		}
	}

	async listRefUoms(): Promise<Result<RefUom[]>> {
		try {
			const rows = await db.select().from(refUom).orderBy(asc(refUom.code));
			return ok(rows.map(mapRefUom));
		} catch (error) {
			return failFromUnknown(error, "Failed to list ref UoMs");
		}
	}

	async getPartyById(
		organizationId: string,
		id: string,
	): Promise<Result<Party | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdParty)
				.where(
					and(eq(mdParty.id, id), eq(mdParty.organizationId, organizationId)),
				)
				.limit(1);
			return ok(row === undefined ? null : mapParty(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load party");
		}
	}

	async getPartyByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Party | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdParty)
				.where(
					and(
						eq(mdParty.organizationId, organizationId),
						eq(mdParty.normalizedCode, normalizedCode),
						isNull(mdParty.retiredAt),
						isNull(mdParty.mergedIntoId),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapParty(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load party by code");
		}
	}

	async listParties(filter: ListFilter): Promise<Result<Party[]>> {
		try {
			const predicates = [eq(mdParty.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				predicates.push(eq(mdParty.status, filter.status));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(sql`${mdParty.updatedAt} > ${filter.updatedSince}`);
			}
			const rows = await db
				.select()
				.from(mdParty)
				.where(and(...predicates))
				.orderBy(asc(mdParty.normalizedCode), asc(mdParty.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapParty));
		} catch (error) {
			return failFromUnknown(error, "Failed to list parties");
		}
	}

	async listPartiesByRole(filter: PartyByRoleFilter): Promise<Result<Party[]>> {
		try {
			const predicates = [
				eq(mdParty.organizationId, filter.organizationId),
				sql`EXISTS (
					SELECT 1
					FROM md_party_role role
					WHERE role.organization_id = ${mdParty.organizationId}
						AND role.party_id = ${mdParty.id}
						AND role.role_code = ${filter.roleCode}
						AND role.archived_at IS NULL
						AND (${filter.activeOnly} = false OR role.status = 'active')
				)`,
			];
			if (filter.status !== undefined) {
				predicates.push(eq(mdParty.status, filter.status));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(sql`${mdParty.updatedAt} > ${filter.updatedSince}`);
			}
			const rows = await db
				.select()
				.from(mdParty)
				.where(and(...predicates))
				.orderBy(asc(mdParty.normalizedCode), asc(mdParty.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapParty));
		} catch (error) {
			return failFromUnknown(error, "Failed to list parties by role");
		}
	}

	async findPartyByTaxRegistration(
		filter: PartyTaxRegistrationLookup,
	): Promise<Result<Party | null>> {
		try {
			const [row] = await db
				.select({ party: mdParty })
				.from(mdParty)
				.innerJoin(
					mdTaxRegistration,
					and(
						eq(mdTaxRegistration.organizationId, mdParty.organizationId),
						eq(mdTaxRegistration.partyId, mdParty.id),
					),
				)
				.where(
					and(
						eq(mdParty.organizationId, filter.organizationId),
						isNull(mdParty.retiredAt),
						isNull(mdParty.mergedIntoId),
						eq(
							mdTaxRegistration.jurisdictionCountryId,
							filter.jurisdictionCountryId,
						),
						eq(mdTaxRegistration.registrationType, filter.registrationType),
						eq(
							mdTaxRegistration.normalizedRegistrationNumber,
							filter.normalizedRegistrationNumber,
						),
						isNull(mdTaxRegistration.deletedAt),
					),
				)
				.orderBy(asc(mdParty.normalizedCode), asc(mdParty.id))
				.limit(1);
			return ok(row === undefined ? null : mapParty(row.party));
		} catch (error) {
			return failFromUnknown(error, "Failed to find party by tax registration");
		}
	}

	async searchParties(filter: PartySearchFilter): Promise<Result<Party[]>> {
		try {
			const search = `%${filter.query.trim()}%`;
			const predicates = [
				eq(mdParty.organizationId, filter.organizationId),
				sql`(${mdParty.code} ILIKE ${search} OR ${mdParty.name} ILIKE ${search} OR ${mdParty.legalName} ILIKE ${search} OR ${mdParty.tradingName} ILIKE ${search})`,
			];
			if (filter.status !== undefined) {
				predicates.push(eq(mdParty.status, filter.status));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(sql`${mdParty.updatedAt} > ${filter.updatedSince}`);
			}
			const rows = await db
				.select()
				.from(mdParty)
				.where(and(...predicates))
				.orderBy(asc(mdParty.normalizedCode), asc(mdParty.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapParty));
		} catch (error) {
			return failFromUnknown(error, "Failed to search parties");
		}
	}

	async createParty(
		record: PartyCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Party>> {
		const partyId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			status: "draft",
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party",
			entityId: partyId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[PartySqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_party (
							id, organization_id, code, normalized_code, name, party_kind,
							status, version, legal_name, trading_name, registration_number,
							registration_country_id, preferred_language_id, default_currency_id,
							created_by, updated_by
						) VALUES (
							${partyId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.name}, ${record.partyKind}, 'draft', 1,
							${record.legalName ?? null}, ${record.tradingName ?? null},
							${record.registrationNumber ?? null}, ${record.registrationCountryId ?? null},
							${record.preferredLanguageId ?? null}, ${record.defaultCurrencyId ?? null},
							${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'party', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.party.created.v1', 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Party create returned no row");
			}
			return ok(mapPartySqlRow(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Party code already exists",
				"Failed to create party",
			);
		}
	}

	async updateParty(
		record: PartyUpdateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Party>> {
		const existingResult = await this.loadPartyForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const nextName = record.name ?? existing.name;
		const nextLegalName =
			record.legalName !== undefined ? record.legalName : existing.legalName;
		const nextTradingName =
			record.tradingName !== undefined
				? record.tradingName
				: existing.tradingName;
		const nextRegistrationNumber =
			record.registrationNumber !== undefined
				? record.registrationNumber
				: existing.registrationNumber;
		const nextRegistrationCountryId =
			record.registrationCountryId !== undefined
				? record.registrationCountryId
				: existing.registrationCountryId;
		const nextPreferredLanguageId =
			record.preferredLanguageId !== undefined
				? record.preferredLanguageId
				: existing.preferredLanguageId;
		const nextDefaultCurrencyId =
			record.defaultCurrencyId !== undefined
				? record.defaultCurrencyId
				: existing.defaultCurrencyId;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson("name", existing.name, nextName);
		const oldValueJson = valueSnapshotJson({
			name: existing.name,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			name: nextName,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "party",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[PartySqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE md_party
						SET
							name = ${nextName},
							legal_name = ${nextLegalName},
							trading_name = ${nextTradingName},
							registration_number = ${nextRegistrationNumber},
							registration_country_id = ${nextRegistrationCountryId},
							preferred_language_id = ${nextPreferredLanguageId},
							default_currency_id = ${nextDefaultCurrencyId},
							version = version + 1,
							updated_by = ${record.updatedBy},
							updated_at = now()
						WHERE id = ${record.id}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
							'master_data', 'party', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.party.updated.v1', 'master_data',
							${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Party version conflict");
			}
			return ok(mapPartySqlRow(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Party code already exists",
				"Failed to update party",
			);
		}
	}

	async transitionParty(
		record: PartyLifecycleRecord,
		_ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PartyLifecycleEventSuffix;
		},
	): Promise<Result<Party>> {
		const existingResult = await this.loadPartyForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const lifecycle =
			record.toStatus === "draft"
				? assertRestoreTransition(existing.status, "draft")
				: assertLifecycleTransition(existing.status, record.toStatus);
		if (!lifecycle.ok) {
			return lifecycle;
		}
		const requireActiveRole =
			record.toStatus === "active" && record.requireActiveRole;
		const eventType = `master_data.party.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson(
			"status",
			existing.status,
			record.toStatus,
		);
		const oldValueJson = valueSnapshotJson({
			status: existing.status,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			status: record.toStatus,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "party",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		const activatedBy =
			record.toStatus === "active"
				? (existing.activatedBy ?? record.actorUserId)
				: existing.activatedBy;
		const blockedBy =
			record.toStatus === "blocked" ? record.actorUserId : existing.blockedBy;
		const retiredBy = record.toStatus === "retired" ? record.actorUserId : null;
		const clearRetired =
			record.toStatus === "draft" && existing.status === "retired";

		const crId = record.changeRequestId ?? null;
		const crAuditId = randomUUID();
		const crEventId = randomUUID();
		const crChangesJson = fieldChangeJson("status", "approved", "applied");

		try {
			// Serialize party lifecycle with role transitions. The active-role check
			// runs in the following statement, after this lock has been acquired, so
			// it cannot observe the pre-commit snapshot of a final-role transition.
			const [, rows] = await runNeonHttpTransaction<
				[Record<string, unknown>[], PartySqlRow[]]
			>((sql) => [
				sql`
					SELECT id
					FROM md_party
					WHERE id = ${record.id}
						AND organization_id = ${record.organizationId}
						AND version = ${record.expectedVersion}
						AND status = ${existing.status}
					FOR UPDATE
				`,
				crId === null
					? sql`
					WITH mutated AS (
						UPDATE md_party
						SET
							status = ${record.toStatus},
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now(),
							activated_at = CASE
								WHEN ${record.toStatus} = 'active' THEN COALESCE(activated_at, now())
								ELSE activated_at
							END,
							activated_by = CASE
								WHEN ${record.toStatus} = 'active' THEN ${activatedBy}
								ELSE activated_by
							END,
							blocked_at = CASE
								WHEN ${record.toStatus} = 'blocked' THEN now()
								WHEN ${clearRetired} THEN NULL
								ELSE blocked_at
							END,
							blocked_by = CASE
								WHEN ${record.toStatus} = 'blocked' THEN ${blockedBy}
								WHEN ${clearRetired} THEN NULL
								ELSE blocked_by
							END,
							retired_at = CASE
								WHEN ${record.toStatus} = 'retired' THEN now()
								ELSE NULL
							END,
							retired_by = CASE
								WHEN ${record.toStatus} = 'retired' THEN ${retiredBy}
								ELSE NULL
							END
						WHERE id = ${record.id}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status = ${existing.status}
							AND (
								${requireActiveRole} = false
								OR EXISTS (
									SELECT 1
									FROM md_party_role role
									WHERE role.organization_id = ${record.organizationId}
										AND role.party_id = ${record.id}
										AND role.status = 'active'
										AND role.archived_at IS NULL
								)
							)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'master_data', 'party', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${eventType}, 'master_data',
							${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`
					: sql`
					WITH claimed AS (
						UPDATE md_change_request
						SET
							status = 'applied',
							version = version + 1,
							applied_by = ${record.actorUserId},
							applied_at = now(),
							updated_at = now()
						WHERE id = ${crId}
							AND organization_id = ${record.organizationId}
							AND status = 'approved'
							AND command_kind = 'activate_party'
							AND subject_entity_id = ${record.id}
						RETURNING *
					),
					mutated AS (
						UPDATE md_party
						SET
							status = ${record.toStatus},
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now(),
							activated_at = CASE
								WHEN ${record.toStatus} = 'active' THEN COALESCE(activated_at, now())
								ELSE activated_at
							END,
							activated_by = CASE
								WHEN ${record.toStatus} = 'active' THEN ${activatedBy}
								ELSE activated_by
							END,
							blocked_at = CASE
								WHEN ${record.toStatus} = 'blocked' THEN now()
								WHEN ${clearRetired} THEN NULL
								ELSE blocked_at
							END,
							blocked_by = CASE
								WHEN ${record.toStatus} = 'blocked' THEN ${blockedBy}
								WHEN ${clearRetired} THEN NULL
								ELSE blocked_by
							END,
							retired_at = CASE
								WHEN ${record.toStatus} = 'retired' THEN now()
								ELSE NULL
							END,
							retired_by = CASE
								WHEN ${record.toStatus} = 'retired' THEN ${retiredBy}
								ELSE NULL
							END
						WHERE id = ${record.id}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status = ${existing.status}
							AND EXISTS (SELECT 1 FROM claimed)
							AND EXISTS (
								SELECT 1
								FROM md_party_role role
								WHERE role.organization_id = ${record.organizationId}
									AND role.party_id = ${record.id}
									AND role.status = 'active'
									AND role.archived_at IS NULL
							)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'master_data', 'party', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${eventType}, 'master_data',
							${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					),
					cr_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${crAuditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'master_data', 'change_request', id, 'UPDATE', ${crChangesJson}::jsonb,
							${valueSnapshotJson({ status: "applied" })}::jsonb
						FROM claimed
						RETURNING id
					),
					cr_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${crEventId}, organization_id, 'master_data.change_request.applied.v1',
							'master_data', ${meta.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'entityType', 'change_request',
								'entityId', id,
								'code', code,
								'version', version,
								'actorId', ${record.actorUserId},
								'correlationId', ${meta.correlationId}
							),
							'pending', 0
						FROM claimed
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed, claimed, cr_audited, cr_outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Party version conflict");
			}
			return ok(mapPartySqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to transition party");
		}
	}

	async mergeParties(
		record: PartyMergeRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<{ survivor: Party; merged: Party }>> {
		const sourceResult = await this.loadPartyForMutation(
			record.organizationId,
			record.sourcePartyId,
			record.sourceExpectedVersion,
		);
		if (!sourceResult.ok) {
			return sourceResult;
		}
		const targetResult = await this.loadPartyForMutation(
			record.organizationId,
			record.targetPartyId,
			record.targetExpectedVersion,
		);
		if (!targetResult.ok) {
			return targetResult;
		}
		const source = sourceResult.data;
		const target = targetResult.data;
		if (source.mergedIntoId !== null || target.mergedIntoId !== null) {
			return fail("CONFLICT", "Party already merged", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		if (source.partyKind !== target.partyKind) {
			return fail("CONFLICT", "Incompatible party kinds for merge", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}

		const decide = <T>(
			decision: "source" | "target" | undefined,
			sourceValue: T,
			targetValue: T,
		): T => (decision === "source" ? sourceValue : targetValue);

		const nextName = decide(
			record.fieldDecisions.name,
			source.name,
			target.name,
		);
		const nextLegalName = decide(
			record.fieldDecisions.legalName,
			source.legalName,
			target.legalName,
		);
		const nextTradingName = decide(
			record.fieldDecisions.tradingName,
			source.tradingName,
			target.tradingName,
		);
		const nextRegistrationNumber = decide(
			record.fieldDecisions.registrationNumber,
			source.registrationNumber,
			target.registrationNumber,
		);
		const nextRegistrationCountryId = decide(
			record.fieldDecisions.registrationCountryId,
			source.registrationCountryId,
			target.registrationCountryId,
		);
		const nextPreferredLanguageId = decide(
			record.fieldDecisions.preferredLanguageId,
			source.preferredLanguageId,
			target.preferredLanguageId,
		);
		const nextDefaultCurrencyId = decide(
			record.fieldDecisions.defaultCurrencyId,
			source.defaultCurrencyId,
			target.defaultCurrencyId,
		);
		const nextSurvivorVersion = target.version + 1;
		const nextMergedVersion = source.version + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const formerExtId = randomUUID();
		const changesJson = fieldChangeJson("merged_from", null, source.id);
		const oldValueJson = valueSnapshotJson({
			sourceId: source.id,
			sourceVersion: source.version,
			targetVersion: target.version,
		});
		const newValueJson = valueSnapshotJson({
			survivorId: target.id,
			mergedId: source.id,
			survivorVersion: nextSurvivorVersion,
			fieldDecisions: record.fieldDecisions,
			consolidation: {
				roles: "reassign_non_colliding_active_retire_colliding",
				addresses: "repoint_to_survivor",
				contacts: "repoint_to_survivor",
			},
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party",
			entityId: target.id,
			code: target.code,
			version: nextSurvivorVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
			consolidation: {
				roles: "reassign_non_colliding_active_retire_colliding",
				addresses: "repoint_to_survivor",
				contacts: "repoint_to_survivor",
			},
		});

		const crAuditId = randomUUID();
		const crEventId = randomUUID();
		const crChangesJson = fieldChangeJson("status", "approved", "applied");

		try {
			const [rows] = await runNeonHttpTransaction<[PartySqlRow[]]>((sql) => [
				sql`
					WITH claimed AS (
						UPDATE md_change_request
						SET
							status = 'applied',
							version = version + 1,
							applied_by = ${record.actorUserId},
							applied_at = now(),
							updated_at = now()
						WHERE id = ${record.changeRequestId}
							AND organization_id = ${record.organizationId}
							AND status = 'approved'
							AND command_kind = 'merge_parties'
							AND subject_entity_id = ${target.id}
						RETURNING *
					),
					survivor AS (
						UPDATE md_party
						SET
							name = ${nextName},
							legal_name = ${nextLegalName},
							trading_name = ${nextTradingName},
							registration_number = ${nextRegistrationNumber},
							registration_country_id = ${nextRegistrationCountryId},
							preferred_language_id = ${nextPreferredLanguageId},
							default_currency_id = ${nextDefaultCurrencyId},
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now()
						WHERE id = ${target.id}
							AND organization_id = ${record.organizationId}
							AND version = ${target.version}
							AND merged_into_id IS NULL
							AND EXISTS (SELECT 1 FROM claimed)
						RETURNING *
					),
					merged AS (
						UPDATE md_party
						SET
							merged_into_id = ${target.id},
							status = 'retired',
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now(),
							retired_at = now(),
							retired_by = ${record.actorUserId}
						WHERE id = ${source.id}
							AND organization_id = ${record.organizationId}
							AND version = ${source.version}
							AND merged_into_id IS NULL
							AND EXISTS (SELECT 1 FROM claimed)
						RETURNING *
					),
					roles_archived_colliding AS (
						UPDATE md_party_role r
						SET
							status = 'archived',
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now(),
							archived_at = now(),
							archived_by = ${record.actorUserId}
						WHERE r.party_id = ${source.id}
							AND r.organization_id = ${record.organizationId}
							AND r.status = 'active'
							AND EXISTS (
								SELECT 1
								FROM md_party_role s
								WHERE s.party_id = ${target.id}
									AND s.organization_id = r.organization_id
									AND s.role_code = r.role_code
									AND s.status = 'active'
							)
							AND EXISTS (SELECT 1 FROM merged)
						RETURNING r.id
					),
					roles_reassigned AS (
						UPDATE md_party_role r
						SET
							party_id = ${target.id},
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now()
						WHERE r.party_id = ${source.id}
							AND r.organization_id = ${record.organizationId}
							AND (
								r.status <> 'active'
								OR NOT EXISTS (
									SELECT 1
									FROM md_party_role s
									WHERE s.party_id = ${target.id}
										AND s.organization_id = r.organization_id
										AND s.role_code = r.role_code
										AND s.status = 'active'
								)
							)
							AND EXISTS (SELECT 1 FROM merged)
						RETURNING r.id
					),
					addresses_moved AS (
						UPDATE md_party_address a
						SET
							party_id = ${target.id},
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now()
						WHERE a.party_id = ${source.id}
							AND a.organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM merged)
						RETURNING a.id
					),
					contacts_moved AS (
						UPDATE md_party_contact c
						SET
							party_id = ${target.id},
							version = version + 1,
							updated_by = ${record.actorUserId},
							updated_at = now()
						WHERE c.party_id = ${source.id}
							AND c.organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM merged)
						RETURNING c.id
					),
					moved_ext AS (
						UPDATE md_party_external_id e
						SET party_id = ${target.id}
						WHERE e.party_id = ${source.id}
							AND e.organization_id = ${record.organizationId}
							AND NOT EXISTS (
								SELECT 1
								FROM md_party_external_id o
								WHERE o.organization_id = e.organization_id
									AND o.source_system = e.source_system
									AND o.external_id_type = e.external_id_type
									AND o.normalized_value = e.normalized_value
									AND o.party_id = ${target.id}
							)
						RETURNING e.id
					),
					former_code AS (
						INSERT INTO md_party_external_id (
							id, organization_id, party_id, source_system, external_id_type,
							external_value, normalized_value, case_sensitivity, is_primary,
							version, created_by, updated_by
						)
						SELECT
							${formerExtId}, ${record.organizationId}, ${target.id},
							'afenda.former_code', 'party_code', ${source.code},
							${source.normalizedCode}, 'insensitive', false, 1,
							${record.actorUserId}, ${record.actorUserId}
						WHERE NOT EXISTS (
							SELECT 1 FROM md_party_external_id o
							WHERE o.organization_id = ${record.organizationId}
								AND o.source_system = 'afenda.former_code'
								AND o.external_id_type = 'party_code'
								AND o.normalized_value = ${source.normalizedCode}
						)
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'master_data', 'party', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
						FROM survivor
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.party.merged.v1', 'master_data',
							${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						FROM survivor
						RETURNING id
					),
					cr_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${crAuditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
							'master_data', 'change_request', id, 'UPDATE', ${crChangesJson}::jsonb,
							${valueSnapshotJson({ status: "applied" })}::jsonb
						FROM claimed
						RETURNING id
					),
					cr_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${crEventId}, organization_id, 'master_data.change_request.applied.v1',
							'master_data', ${meta.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'entityType', 'change_request',
								'entityId', id,
								'code', code,
								'version', version,
								'actorId', ${record.actorUserId},
								'correlationId', ${meta.correlationId}
							),
							'pending', 0
						FROM claimed
						RETURNING id
					)
					SELECT survivor.* FROM survivor, merged, audited, outboxed, claimed, cr_audited, cr_outboxed
				`,
			]);
			const survivorRow = rows[0];
			if (survivorRow === undefined) {
				return versionConflict("Party version conflict on merge");
			}
			const mergedParty: Party = {
				...source,
				mergedIntoId: target.id,
				status: "retired",
				version: nextMergedVersion,
				updatedBy: record.actorUserId,
				updatedAt: new Date(),
				retiredAt: new Date(),
				retiredBy: record.actorUserId,
			};
			return ok({
				survivor: mapPartySqlRow(survivorRow),
				merged: mergedParty,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to merge parties");
		}
	}

	async getItemGroupById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemGroup | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdItemGroup)
				.where(
					and(
						eq(mdItemGroup.id, id),
						eq(mdItemGroup.organizationId, organizationId),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapItemGroup(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load item group");
		}
	}

	async getItemGroupByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<ItemGroup | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdItemGroup)
				.where(
					and(
						eq(mdItemGroup.organizationId, organizationId),
						eq(mdItemGroup.normalizedCode, normalizedCode),
						isNull(mdItemGroup.retiredAt),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapItemGroup(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load item group by code");
		}
	}

	async listItemGroups(filter: ListFilter): Promise<Result<ItemGroup[]>> {
		try {
			const predicates = [
				eq(mdItemGroup.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				predicates.push(eq(mdItemGroup.status, filter.status));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(sql`${mdItemGroup.updatedAt} > ${filter.updatedSince}`);
			}
			const rows = await db
				.select()
				.from(mdItemGroup)
				.where(and(...predicates))
				.orderBy(asc(mdItemGroup.normalizedCode), asc(mdItemGroup.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapItemGroup));
		} catch (error) {
			return failFromUnknown(error, "Failed to list item groups");
		}
	}

	async createItemGroup(
		record: ItemGroupCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemGroup>> {
		const parentCheck = await assertItemGroupParent(
			record.organizationId,
			null,
			record.parentId ?? null,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			status: "draft",
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "item_group",
			entityId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[ItemGroupSqlRow[]]>(
				(sql) => [
					sql`
						WITH eligible_parent AS (
							SELECT 1
							WHERE ${record.parentId ?? null}::uuid IS NULL
								OR EXISTS (
									SELECT 1
									FROM md_item_group parent
									WHERE parent.id = ${record.parentId ?? null}::uuid
										AND parent.organization_id = ${record.organizationId}
										AND parent.status = 'active'
										AND parent.retired_at IS NULL
								)
						),
						mutated AS (
							INSERT INTO md_item_group (
								id, organization_id, code, normalized_code, name, parent_id,
								status, version, created_by, updated_by
							)
							SELECT
								${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
								${record.name}, ${record.parentId ?? null}, 'draft', 1,
								${record.createdBy}, ${record.createdBy}
							FROM eligible_parent
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, new_value
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'master_data', 'item_group', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.item_group.created.v1', 'master_data',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return invalidState("Item group parent must be active");
			}
			return ok(mapItemGroupSqlRow(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Item group code already exists",
				"Failed to create item group",
			);
		}
	}

	async updateItemGroup(
		record: ItemGroupUpdateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ItemGroup>> {
		const existingResult = await this.loadItemGroupForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const nextName = record.name ?? existing.name;
		const nextParentId =
			record.parentId !== undefined ? record.parentId : existing.parentId;
		const parentCheck = await assertItemGroupParent(
			record.organizationId,
			existing.id,
			nextParentId,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		const nextVersion = existing.version + 1;
		const parentChanged = nextParentId !== existing.parentId;
		const changesJson = JSON.stringify([
			{ field: "name", oldValue: existing.name, newValue: nextName },
			...(parentChanged
				? [
						{
							field: "parentId",
							oldValue: existing.parentId,
							newValue: nextParentId,
						},
					]
				: []),
		]);
		const oldValueJson = valueSnapshotJson({
			name: existing.name,
			parentId: existing.parentId,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			name: nextName,
			parentId: nextParentId,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "item_group",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
			changedPaths: parentChanged ? ["name", "parentId"] : ["name"],
		});
		const eventType = parentChanged
			? "master_data.item_group.reparented.v1"
			: "master_data.item_group.updated.v1";
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ItemGroupSqlRow[]]>(
				(sql) => [
					sql`
						WITH RECURSIVE ancestor AS (
							SELECT id, parent_id, ARRAY[id] AS path
							FROM md_item_group
							WHERE id = ${nextParentId}::uuid
								AND organization_id = ${record.organizationId}
							UNION ALL
							SELECT parent.id, parent.parent_id, child.path || parent.id
							FROM md_item_group parent
							JOIN ancestor child ON parent.id = child.parent_id
							WHERE parent.organization_id = ${record.organizationId}
								AND NOT parent.id = ANY(child.path)
						),
						eligible_parent AS (
							SELECT 1
							WHERE ${nextParentId}::uuid IS NULL
								OR (
									EXISTS (
										SELECT 1
										FROM md_item_group parent
										WHERE parent.id = ${nextParentId}::uuid
											AND parent.organization_id = ${record.organizationId}
											AND parent.status = 'active'
											AND parent.retired_at IS NULL
									)
									AND NOT EXISTS (
										SELECT 1 FROM ancestor WHERE id = ${record.id}::uuid
									)
								)
						),
						mutated AS (
							UPDATE md_item_group
							SET
								name = ${nextName},
								parent_id = ${nextParentId},
								version = version + 1,
								updated_by = ${record.updatedBy},
								updated_at = now()
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND EXISTS (SELECT 1 FROM eligible_parent)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
								'master_data', 'item_group', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${eventType}, 'master_data',
								${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Item group version conflict");
			}
			return ok(mapItemGroupSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to update item group");
		}
	}

	async transitionItemGroup(
		record: ItemGroupLifecycleRecord,
		_ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: ItemGroupLifecycleEventSuffix;
		},
	): Promise<Result<ItemGroup>> {
		const existingResult = await this.loadItemGroupForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const lifecycle = assertLifecycleTransition(
			existing.status,
			record.toStatus,
		);
		if (!lifecycle.ok) {
			return lifecycle;
		}
		const eventType = `master_data.item_group.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson(
			"status",
			existing.status,
			record.toStatus,
		);
		const oldValueJson = valueSnapshotJson({
			status: existing.status,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			status: record.toStatus,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "item_group",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		const activatedBy =
			record.toStatus === "active"
				? (existing.activatedBy ?? record.actorUserId)
				: existing.activatedBy;
		const retiredBy = record.toStatus === "retired" ? record.actorUserId : null;
		try {
			const [rows] = await runNeonHttpTransaction<[ItemGroupSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE md_item_group
							SET
								status = ${record.toStatus},
								version = version + 1,
								updated_by = ${record.actorUserId},
								updated_at = now(),
								activated_at = CASE
									WHEN ${record.toStatus} = 'active' THEN COALESCE(activated_at, now())
									ELSE activated_at
								END,
								activated_by = CASE
									WHEN ${record.toStatus} = 'active' THEN ${activatedBy}
									ELSE activated_by
								END,
								retired_at = CASE
									WHEN ${record.toStatus} = 'retired' THEN now()
									ELSE NULL
								END,
								retired_by = CASE
									WHEN ${record.toStatus} = 'retired' THEN ${retiredBy}
									ELSE NULL
								END
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = ${existing.status}
								AND (
									${record.toStatus}::text <> 'active'
									OR parent_id IS NULL
									OR EXISTS (
										SELECT 1
										FROM md_item_group parent
										WHERE parent.id = md_item_group.parent_id
											AND parent.organization_id = ${record.organizationId}
											AND parent.status = 'active'
											AND parent.retired_at IS NULL
									)
								)
								AND (
									${record.toStatus}::text <> 'retired'
									OR (
										NOT EXISTS (
											SELECT 1
											FROM md_item_group child
											WHERE child.organization_id = ${record.organizationId}
												AND child.parent_id = ${record.id}::uuid
												AND child.retired_at IS NULL
										)
										AND NOT EXISTS (
											SELECT 1
											FROM md_item item
											WHERE item.organization_id = ${record.organizationId}
												AND item.item_group_id = ${record.id}::uuid
												AND item.retired_at IS NULL
										)
									)
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'master_data', 'item_group', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${eventType}, 'master_data',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Item group version conflict");
			}
			return ok(mapItemGroupSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to transition item group");
		}
	}

	async getItemById(
		organizationId: string,
		id: string,
	): Promise<Result<Item | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdItem)
				.where(
					and(eq(mdItem.id, id), eq(mdItem.organizationId, organizationId)),
				)
				.limit(1);
			return ok(row === undefined ? null : mapItem(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load item");
		}
	}

	async getItemByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Item | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdItem)
				.where(
					and(
						eq(mdItem.organizationId, organizationId),
						eq(mdItem.normalizedCode, normalizedCode),
						isNull(mdItem.retiredAt),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapItem(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load item by code");
		}
	}

	async listItems(filter: ItemListFilter): Promise<Result<Item[]>> {
		try {
			const predicates = [eq(mdItem.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				predicates.push(eq(mdItem.status, filter.status));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(sql`${mdItem.updatedAt} > ${filter.updatedSince}`);
			}
			if (filter.itemGroupId !== undefined) {
				predicates.push(eq(mdItem.itemGroupId, filter.itemGroupId));
			}
			const rows = await db
				.select()
				.from(mdItem)
				.where(and(...predicates))
				.orderBy(asc(mdItem.normalizedCode), asc(mdItem.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapItem));
		} catch (error) {
			return failFromUnknown(error, "Failed to list items");
		}
	}

	async createItem(
		record: ItemCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Item>> {
		const uom = await this.getRefUomById(record.baseUomId);
		if (!uom.ok) {
			return uom;
		}
		if (uom.data === null) {
			return validationFailed("baseUomId is not a known platform UoM");
		}
		if (!uom.data.active) {
			return validationFailed(
				"baseUomId must reference an active platform UoM",
			);
		}
		const group = await this.getItemGroupById(
			record.organizationId,
			record.itemGroupId,
		);
		if (!group.ok) {
			return group;
		}
		if (group.data === null) {
			return crossOrg("itemGroupId must exist in the same organization");
		}
		if (group.data.status !== "active" || group.data.retiredAt !== null) {
			return invalidState("itemGroupId must reference an active item group");
		}
		const profile = resolveItemOperationalProfile({
			itemType: record.itemType,
			trackingPolicy: record.trackingPolicy,
			sellable: record.sellable,
			purchasable: record.purchasable,
			stocked: record.stocked,
			serviceIndicator: record.serviceIndicator,
		});
		const entityId = randomUUID();
		const baseUomRowId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			description: record.description ?? null,
			trackingPolicy: profile.trackingPolicy,
			sellable: profile.sellable,
			purchasable: profile.purchasable,
			stocked: profile.stocked,
			serviceIndicator: profile.serviceIndicator,
			baseUomId: record.baseUomId,
			itemGroupId: record.itemGroupId,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "item",
			entityId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[ItemSqlRow[]]>((sql) => [
				sql`
					WITH eligible_references AS (
						SELECT 1
						WHERE EXISTS (
							SELECT 1 FROM ref_uom base_uom
							WHERE base_uom.id = ${record.baseUomId}::uuid
								AND base_uom.active = true
						)
						AND EXISTS (
							SELECT 1 FROM md_item_group item_group
							WHERE item_group.id = ${record.itemGroupId}::uuid
								AND item_group.organization_id = ${record.organizationId}
								AND item_group.status = 'active'
								AND item_group.retired_at IS NULL
						)
					),
					mutated AS (
						INSERT INTO md_item (
							id, organization_id, code, normalized_code, name, item_type, description,
							tracking_policy, sellable, purchasable, stocked, service_indicator,
							base_uom_id, item_group_id, status, version, created_by, updated_by
						)
						SELECT
							${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.name}, ${record.itemType}, ${record.description ?? null},
							${profile.trackingPolicy}, ${profile.sellable}, ${profile.purchasable},
							${profile.stocked}, ${profile.serviceIndicator},
							${record.baseUomId}, ${record.itemGroupId},
							'draft', 1, ${record.createdBy}, ${record.createdBy}
						FROM eligible_references
						RETURNING *
					),
					base_uom AS (
						INSERT INTO md_item_uom (
							id, organization_id, item_id, alternate_uom_id, conversion_factor,
							rounding_scale, is_purchase_uom, is_sales_uom, is_inventory_uom,
							is_default_purchase_uom, is_default_sales_uom, compatibility_mode,
							status, version, created_by, updated_by
						)
						SELECT
							${baseUomRowId}, organization_id, id, base_uom_id, 1,
							0, false, false, true, false, false, 'physical_dimension',
							'active', 1, created_by, created_by
						FROM mutated
						RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'item', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.item.created.v1', 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, base_uom, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return invalidState(
					"Item requires an active item group and active platform UoM",
				);
			}
			return ok(mapItemSqlRow(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Item code already exists",
				"Failed to create item",
			);
		}
	}

	async updateItem(
		record: ItemUpdateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Item>> {
		const existingResult = await this.loadItemForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const nextName = record.name ?? existing.name;
		const nextDescription =
			record.description !== undefined
				? record.description
				: existing.description;
		const nextItemType = record.itemType ?? existing.itemType;
		const nextBaseUomId = record.baseUomId ?? existing.baseUomId;
		const nextGroupId = record.itemGroupId ?? existing.itemGroupId;
		const itemTypeChanged = nextItemType !== existing.itemType;
		const nextProfile = resolveItemOperationalProfile({
			itemType: nextItemType,
			trackingPolicy:
				record.trackingPolicy ??
				(itemTypeChanged ? undefined : existing.trackingPolicy),
			sellable:
				record.sellable ?? (itemTypeChanged ? undefined : existing.sellable),
			purchasable:
				record.purchasable ??
				(itemTypeChanged ? undefined : existing.purchasable),
			stocked:
				record.stocked ?? (itemTypeChanged ? undefined : existing.stocked),
			serviceIndicator:
				record.serviceIndicator ??
				(itemTypeChanged ? undefined : existing.serviceIndicator),
		});
		if (nextBaseUomId !== existing.baseUomId) {
			return invalidState(
				"Base UoM changes require a governed item conversion operation",
			);
		}
		if (nextItemType !== existing.itemType && existing.status !== "draft") {
			return invalidState("Item type can change only while the item is draft");
		}
		const uom = await this.getRefUomById(nextBaseUomId);
		if (!uom.ok) {
			return uom;
		}
		if (uom.data === null) {
			return validationFailed("baseUomId is not a known platform UoM");
		}
		if (!uom.data.active) {
			return validationFailed(
				"baseUomId must reference an active platform UoM",
			);
		}
		const group = await this.getItemGroupById(
			record.organizationId,
			nextGroupId,
		);
		if (!group.ok) {
			return group;
		}
		if (group.data === null) {
			return crossOrg("itemGroupId must exist in the same organization");
		}
		if (group.data.status !== "active" || group.data.retiredAt !== null) {
			return invalidState("itemGroupId must reference an active item group");
		}
		const nextVersion = existing.version + 1;
		const changesJson = JSON.stringify([
			{ field: "name", oldValue: existing.name, newValue: nextName },
			...(nextDescription !== existing.description
				? [
						{
							field: "description",
							oldValue: existing.description,
							newValue: nextDescription,
						},
					]
				: []),
			...(nextItemType !== existing.itemType
				? [
						{
							field: "itemType",
							oldValue: existing.itemType,
							newValue: nextItemType,
						},
					]
				: []),
			...(nextGroupId !== existing.itemGroupId
				? [
						{
							field: "itemGroupId",
							oldValue: existing.itemGroupId,
							newValue: nextGroupId,
						},
					]
				: []),
			...(nextProfile.trackingPolicy !== existing.trackingPolicy
				? [
						{
							field: "trackingPolicy",
							oldValue: existing.trackingPolicy,
							newValue: nextProfile.trackingPolicy,
						},
					]
				: []),
			...(nextProfile.sellable !== existing.sellable
				? [
						{
							field: "sellable",
							oldValue: existing.sellable,
							newValue: nextProfile.sellable,
						},
					]
				: []),
			...(nextProfile.purchasable !== existing.purchasable
				? [
						{
							field: "purchasable",
							oldValue: existing.purchasable,
							newValue: nextProfile.purchasable,
						},
					]
				: []),
			...(nextProfile.stocked !== existing.stocked
				? [
						{
							field: "stocked",
							oldValue: existing.stocked,
							newValue: nextProfile.stocked,
						},
					]
				: []),
			...(nextProfile.serviceIndicator !== existing.serviceIndicator
				? [
						{
							field: "serviceIndicator",
							oldValue: existing.serviceIndicator,
							newValue: nextProfile.serviceIndicator,
						},
					]
				: []),
		]);
		const oldValueJson = valueSnapshotJson({
			name: existing.name,
			description: existing.description,
			itemType: existing.itemType,
			baseUomId: existing.baseUomId,
			itemGroupId: existing.itemGroupId,
			trackingPolicy: existing.trackingPolicy,
			sellable: existing.sellable,
			purchasable: existing.purchasable,
			stocked: existing.stocked,
			serviceIndicator: existing.serviceIndicator,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			name: nextName,
			description: nextDescription,
			itemType: nextItemType,
			baseUomId: nextBaseUomId,
			itemGroupId: nextGroupId,
			trackingPolicy: nextProfile.trackingPolicy,
			sellable: nextProfile.sellable,
			purchasable: nextProfile.purchasable,
			stocked: nextProfile.stocked,
			serviceIndicator: nextProfile.serviceIndicator,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "item",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ItemSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE md_item
						SET
							name = ${nextName},
							description = ${nextDescription},
							item_type = ${nextItemType},
							tracking_policy = ${nextProfile.trackingPolicy},
							sellable = ${nextProfile.sellable},
							purchasable = ${nextProfile.purchasable},
							stocked = ${nextProfile.stocked},
							service_indicator = ${nextProfile.serviceIndicator},
							base_uom_id = ${nextBaseUomId},
							item_group_id = ${nextGroupId},
							version = version + 1,
							updated_by = ${record.updatedBy},
							updated_at = now()
						WHERE id = ${record.id}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND base_uom_id = ${nextBaseUomId}::uuid
							AND EXISTS (
								SELECT 1 FROM ref_uom base_uom
								WHERE base_uom.id = ${nextBaseUomId}::uuid
									AND base_uom.active = true
							)
							AND EXISTS (
								SELECT 1 FROM md_item_group item_group
								WHERE item_group.id = ${nextGroupId}::uuid
									AND item_group.organization_id = ${record.organizationId}
									AND item_group.status = 'active'
									AND item_group.retired_at IS NULL
							)
							AND (
								${nextItemType}::text = ${existing.itemType}::text
								OR (
									status = 'draft'
									AND NOT EXISTS (
										SELECT 1 FROM md_item_variant variant
										WHERE variant.organization_id = ${record.organizationId}
											AND variant.item_id = ${record.id}::uuid
											AND variant.retired_at IS NULL
									)
									AND NOT EXISTS (
										SELECT 1 FROM md_item_uom uom
										WHERE uom.organization_id = ${record.organizationId}
											AND uom.item_id = ${record.id}::uuid
											AND (
											uom.alternate_uom_id <> md_item.base_uom_id
											OR uom.conversion_factor <> 1
											)
									)
									AND NOT EXISTS (
										SELECT 1 FROM md_item_barcode barcode
										WHERE barcode.organization_id = ${record.organizationId}
											AND barcode.item_id = ${record.id}::uuid
									)
									AND NOT EXISTS (
										SELECT 1 FROM md_item_external_id external_id
										WHERE external_id.organization_id = ${record.organizationId}
											AND external_id.item_id = ${record.id}::uuid
									)
									AND NOT EXISTS (
										SELECT 1 FROM md_item_alias alias
										WHERE alias.organization_id = ${record.organizationId}
											AND alias.item_id = ${record.id}::uuid
									)
								)
							)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
							'master_data', 'item', id, 'UPDATE', ${changesJson}::jsonb,
							${oldValueJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.item.updated.v1', 'master_data',
							${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Item version conflict");
			}
			return ok(mapItemSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to update item");
		}
	}

	transitionItem = drizzleTransitionItemWithVariantSideEffect;

	async getWarehouseById(
		organizationId: string,
		id: string,
	): Promise<Result<Warehouse | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdWarehouse)
				.where(
					and(
						eq(mdWarehouse.id, id),
						eq(mdWarehouse.organizationId, organizationId),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapWarehouse(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load warehouse");
		}
	}

	async getWarehouseByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Warehouse | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdWarehouse)
				.where(
					and(
						eq(mdWarehouse.organizationId, organizationId),
						eq(mdWarehouse.normalizedCode, normalizedCode),
						isNull(mdWarehouse.retiredAt),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapWarehouse(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load warehouse by code");
		}
	}

	async listWarehouses(filter: ListFilter): Promise<Result<Warehouse[]>> {
		try {
			const predicates = [
				eq(mdWarehouse.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				predicates.push(eq(mdWarehouse.status, filter.status));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(sql`${mdWarehouse.updatedAt} > ${filter.updatedSince}`);
			}
			const rows = await db
				.select()
				.from(mdWarehouse)
				.where(and(...predicates))
				.orderBy(asc(mdWarehouse.normalizedCode), asc(mdWarehouse.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapWarehouse));
		} catch (error) {
			return failFromUnknown(error, "Failed to list warehouses");
		}
	}

	async createWarehouse(
		record: WarehouseCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>> {
		if (
			record.addressCountryId !== undefined &&
			record.addressCountryId !== null
		) {
			const country = await this.getRefCountryById(record.addressCountryId);
			if (!country.ok) return country;
			if (country.data === null || !country.data.active) {
				return validationFailed("Warehouse address country must be active");
			}
		}
		const parentCheck = await assertWarehouseParent(
			record.organizationId,
			null,
			record.parentId ?? null,
			record.locationType,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			addressCountryId: record.addressCountryId ?? null,
			status: "draft",
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "warehouse",
			entityId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[WarehouseSqlRow[]]>(
				(sql) => [
					sql`
						WITH eligible_parent AS (
							SELECT 1
							WHERE ${record.parentId ?? null}::uuid IS NULL
								OR EXISTS (
									SELECT 1 FROM md_warehouse parent
									WHERE parent.id = ${record.parentId ?? null}::uuid
										AND parent.organization_id = ${record.organizationId}
										AND parent.status = 'active'
										AND parent.retired_at IS NULL
										AND CASE parent.location_type
											WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
											WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
											WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE 99
										END <= CASE ${record.locationType}::text
											WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
											WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
											WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE -1
										END
								)
						),
						mutated AS (
							INSERT INTO md_warehouse (
								id, organization_id, code, normalized_code, name, location_type,
								parent_id, address_country_id, address_line1, address_line2,
								address_city, address_region, address_postal_code,
								status, version, created_by, updated_by
							)
							SELECT
								${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
								${record.name}, ${record.locationType}, ${record.parentId ?? null},
								${record.addressCountryId ?? null}, ${record.addressLine1 ?? null},
								${record.addressLine2 ?? null}, ${record.addressCity ?? null},
								${record.addressRegion ?? null}, ${record.addressPostalCode ?? null},
								'draft', 1, ${record.createdBy}, ${record.createdBy}
							FROM eligible_parent
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, new_value
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'master_data', 'warehouse', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.warehouse.created.v1', 'master_data',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return invalidState("Warehouse parent is not usable or compatible");
			}
			return ok(mapWarehouseSqlRow(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Warehouse code already exists",
				"Failed to create warehouse",
			);
		}
	}

	async updateWarehouse(
		record: WarehouseUpdateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>> {
		const existingResult = await this.loadWarehouseForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const nextName = record.name ?? existing.name;
		const nextLocationType = record.locationType ?? existing.locationType;
		const nextAddressCountryId =
			record.addressCountryId !== undefined
				? record.addressCountryId
				: existing.addressCountryId;
		const nextAddressLine1 =
			record.addressLine1 !== undefined
				? record.addressLine1
				: existing.addressLine1;
		const nextAddressLine2 =
			record.addressLine2 !== undefined
				? record.addressLine2
				: existing.addressLine2;
		const nextAddressCity =
			record.addressCity !== undefined
				? record.addressCity
				: existing.addressCity;
		const nextAddressRegion =
			record.addressRegion !== undefined
				? record.addressRegion
				: existing.addressRegion;
		const nextAddressPostalCode =
			record.addressPostalCode !== undefined
				? record.addressPostalCode
				: existing.addressPostalCode;
		if (nextAddressCountryId !== null) {
			const country = await this.getRefCountryById(nextAddressCountryId);
			if (!country.ok) return country;
			if (country.data === null || !country.data.active) {
				return validationFailed("Warehouse address country must be active");
			}
		}
		const locationTypeChanged = nextLocationType !== existing.locationType;
		if (locationTypeChanged && existing.status !== "draft") {
			return invalidState(
				"Warehouse location type can change only while the warehouse is draft",
			);
		}
		if (locationTypeChanged) {
			const parentCheck = await assertWarehouseParent(
				record.organizationId,
				existing.id,
				existing.parentId,
				nextLocationType,
			);
			if (!parentCheck.ok) return parentCheck;
		}
		const nextVersion = existing.version + 1;
		const changesJson = JSON.stringify([
			{ field: "name", oldValue: existing.name, newValue: nextName },
			...(locationTypeChanged
				? [
						{
							field: "locationType",
							oldValue: existing.locationType,
							newValue: nextLocationType,
						},
					]
				: []),
		]);
		const oldValueJson = valueSnapshotJson({
			name: existing.name,
			locationType: existing.locationType,
			addressCountryId: existing.addressCountryId,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			name: nextName,
			locationType: nextLocationType,
			addressCountryId: nextAddressCountryId,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "warehouse",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[WarehouseSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE md_warehouse
							SET
								name = ${nextName},
								location_type = ${nextLocationType},
								address_country_id = ${nextAddressCountryId},
								address_line1 = ${nextAddressLine1},
								address_line2 = ${nextAddressLine2},
								address_city = ${nextAddressCity},
								address_region = ${nextAddressRegion},
								address_postal_code = ${nextAddressPostalCode},
								version = version + 1,
								updated_by = ${record.updatedBy},
								updated_at = now()
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND (
									${nextLocationType}::text = ${existing.locationType}::text
									OR (
										status = 'draft'
										AND (
											parent_id IS NULL OR EXISTS (
												SELECT 1 FROM md_warehouse parent
												WHERE parent.id = md_warehouse.parent_id
													AND parent.organization_id = ${record.organizationId}
													AND parent.status = 'active'
													AND parent.retired_at IS NULL
													AND CASE parent.location_type
														WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
														WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
														WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE 99
													END <= CASE ${nextLocationType}::text
														WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
														WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
														WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE -1
													END
											)
										)
										AND NOT EXISTS (
											SELECT 1 FROM md_warehouse child
											WHERE child.organization_id = ${record.organizationId}
												AND child.parent_id = ${record.id}::uuid
												AND CASE ${nextLocationType}::text
													WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
													WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
													WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE 99
												END > CASE child.location_type
													WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
													WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
													WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE -1
												END
										)
										AND NOT EXISTS (
											SELECT 1 FROM md_warehouse_external_id external_id
											WHERE external_id.organization_id = ${record.organizationId}
												AND external_id.warehouse_id = ${record.id}::uuid
										)
									)
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
								'master_data', 'warehouse', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.warehouse.updated.v1', 'master_data',
								${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Warehouse version conflict");
			}
			return ok(mapWarehouseSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to update warehouse");
		}
	}

	async moveWarehouse(
		record: WarehouseMoveRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Warehouse>> {
		const existingResult = await this.loadWarehouseForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		if (existing.status !== "draft" && existing.status !== "inactive") {
			return invalidState(
				"Only draft or inactive warehouses may move without governed operational clearance",
			);
		}
		const parentCheck = await assertWarehouseParent(
			record.organizationId,
			existing.id,
			record.parentId,
			existing.locationType,
		);
		if (!parentCheck.ok) {
			return parentCheck;
		}
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson(
			"parentId",
			existing.parentId,
			record.parentId,
		);
		const oldValueJson = valueSnapshotJson({
			parentId: existing.parentId,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			parentId: record.parentId,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "warehouse",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[WarehouseSqlRow[]]>(
				(sql) => [
					sql`
						WITH RECURSIVE ancestor AS (
							SELECT id, parent_id, ARRAY[id] AS path
							FROM md_warehouse
							WHERE id = ${record.parentId}::uuid
								AND organization_id = ${record.organizationId}
							UNION ALL
							SELECT parent.id, parent.parent_id, child.path || parent.id
							FROM md_warehouse parent
							JOIN ancestor child ON parent.id = child.parent_id
							WHERE parent.organization_id = ${record.organizationId}
								AND NOT parent.id = ANY(child.path)
						),
						eligible_parent AS (
							SELECT 1
							WHERE ${record.parentId}::uuid IS NULL
								OR (
									EXISTS (
										SELECT 1 FROM md_warehouse parent
										WHERE parent.id = ${record.parentId}::uuid
											AND parent.organization_id = ${record.organizationId}
											AND parent.status = 'active'
											AND parent.retired_at IS NULL
											AND CASE parent.location_type
												WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
												WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
												WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE 99
											END <= CASE ${existing.locationType}::text
												WHEN 'site' THEN 0 WHEN 'warehouse' THEN 1
												WHEN 'zone' THEN 2 WHEN 'aisle' THEN 3
												WHEN 'rack' THEN 4 WHEN 'bin' THEN 5 ELSE -1
											END
									)
									AND NOT EXISTS (
										SELECT 1 FROM ancestor WHERE id = ${record.id}::uuid
									)
								)
						),
						mutated AS (
							UPDATE md_warehouse
							SET
								parent_id = ${record.parentId},
								version = version + 1,
								updated_by = ${record.updatedBy},
								updated_at = now()
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = ${existing.status}
								AND status IN ('draft', 'inactive')
								AND EXISTS (SELECT 1 FROM eligible_parent)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
								'master_data', 'warehouse', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.warehouse.moved.v1', 'master_data',
								${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Warehouse version conflict");
			}
			return ok(mapWarehouseSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to move warehouse");
		}
	}

	async transitionWarehouse(
		record: WarehouseLifecycleRecord,
		_ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: WarehouseLifecycleEventSuffix;
		},
	): Promise<Result<Warehouse>> {
		const existingResult = await this.loadWarehouseForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const lifecycle = assertLifecycleTransition(
			existing.status,
			record.toStatus,
		);
		if (!lifecycle.ok) return lifecycle;
		const eventType = `master_data.warehouse.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson(
			"status",
			existing.status,
			record.toStatus,
		);
		const oldValueJson = valueSnapshotJson({
			status: existing.status,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			status: record.toStatus,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "warehouse",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		const activatedBy =
			record.toStatus === "active"
				? (existing.activatedBy ?? record.actorUserId)
				: existing.activatedBy;
		const retiredBy = record.toStatus === "retired" ? record.actorUserId : null;
		try {
			const [rows] = await runNeonHttpTransaction<[WarehouseSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE md_warehouse
							SET
								status = ${record.toStatus},
								version = version + 1,
								updated_by = ${record.actorUserId},
								updated_at = now(),
								activated_at = CASE
									WHEN ${record.toStatus} = 'active' THEN COALESCE(activated_at, now())
									ELSE activated_at
								END,
								activated_by = CASE
									WHEN ${record.toStatus} = 'active' THEN ${activatedBy}
									ELSE activated_by
								END,
								retired_at = CASE
									WHEN ${record.toStatus} = 'retired' THEN now()
									ELSE NULL
								END,
								retired_by = CASE
									WHEN ${record.toStatus} = 'retired' THEN ${retiredBy}
									ELSE NULL
								END
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = ${existing.status}
								AND (
									${record.toStatus}::text <> 'active'
									OR parent_id IS NULL
									OR EXISTS (
										SELECT 1 FROM md_warehouse parent
										WHERE parent.id = md_warehouse.parent_id
											AND parent.organization_id = ${record.organizationId}
											AND parent.status = 'active'
											AND parent.retired_at IS NULL
									)
								)
								AND (
									${record.toStatus}::text <> 'retired'
									OR (
										NOT EXISTS (
											SELECT 1 FROM md_warehouse child
											WHERE child.organization_id = ${record.organizationId}
												AND child.parent_id = ${record.id}::uuid
												AND child.retired_at IS NULL
										)
										AND NOT EXISTS (
											SELECT 1 FROM md_warehouse_external_id external_id
											WHERE external_id.organization_id = ${record.organizationId}
												AND external_id.warehouse_id = ${record.id}::uuid
										)
									)
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'master_data', 'warehouse', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${eventType}, 'master_data',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Warehouse version conflict");
			}
			return ok(mapWarehouseSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to transition warehouse");
		}
	}

	async getPaymentTermById(
		organizationId: string,
		id: string,
	): Promise<Result<PaymentTerm | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdPaymentTerm)
				.where(
					and(
						eq(mdPaymentTerm.id, id),
						eq(mdPaymentTerm.organizationId, organizationId),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapPaymentTerm(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load payment term");
		}
	}

	async getPaymentTermByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<PaymentTerm | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdPaymentTerm)
				.where(
					and(
						eq(mdPaymentTerm.organizationId, organizationId),
						eq(mdPaymentTerm.normalizedCode, normalizedCode),
						isNull(mdPaymentTerm.retiredAt),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapPaymentTerm(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load payment term by code");
		}
	}

	async listPaymentTerms(filter: ListFilter): Promise<Result<PaymentTerm[]>> {
		try {
			const predicates = [
				eq(mdPaymentTerm.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				predicates.push(eq(mdPaymentTerm.status, filter.status));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(
					sql`${mdPaymentTerm.updatedAt} > ${filter.updatedSince}`,
				);
			}
			const rows = await db
				.select()
				.from(mdPaymentTerm)
				.where(and(...predicates))
				.orderBy(asc(mdPaymentTerm.normalizedCode), asc(mdPaymentTerm.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapPaymentTerm));
		} catch (error) {
			return failFromUnknown(error, "Failed to list payment terms");
		}
	}

	async createPaymentTerm(
		record: PaymentTermCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PaymentTerm>> {
		const ruleResult = normalizePaymentTermRule(record);
		if (!ruleResult.ok) return ruleResult;
		const rule = ruleResult.data;
		if (rule.currencyRestrictionId !== null) {
			const currency = await this.getRefCurrencyById(
				rule.currencyRestrictionId,
			);
			if (!currency.ok) return currency;
			if (currency.data === null || !currency.data.active) {
				return validationFailed(
					"Payment term currency restriction must be active",
				);
			}
		}
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			...rule,
			status: "draft",
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "payment_term",
			entityId,
			code: record.code,
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[PaymentTermSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							INSERT INTO md_payment_term (
								id, organization_id, code, normalized_code, name, net_days,
								discount_days, discount_percent, due_day_rule, end_of_month,
								installment_policy, installment_count, valid_from, valid_to,
								currency_restriction_id,
								status, version, created_by, updated_by
							)
							SELECT
								${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
								${record.name}, ${rule.netDays}, ${rule.discountDays},
								${rule.discountPercent}, ${rule.dueDayRule}, ${rule.endOfMonth},
								${rule.installmentPolicy}, ${rule.installmentCount},
								${rule.validFrom}, ${rule.validTo}, ${rule.currencyRestrictionId},
								'draft', 1, ${record.createdBy}, ${record.createdBy}
							WHERE ${rule.netDays}::integer BETWEEN 0 AND ${MAX_PAYMENT_TERM_NET_DAYS}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, new_value
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'master_data', 'payment_term', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.payment_term.created.v1', 'master_data',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return validationFailed(
					`netDays must be between 0 and ${MAX_PAYMENT_TERM_NET_DAYS}`,
				);
			}
			return ok(mapPaymentTermSqlRow(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Payment term code already exists",
				"Failed to create payment term",
			);
		}
	}

	async updatePaymentTerm(
		record: PaymentTermUpdateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PaymentTerm>> {
		const existingResult = await this.loadPaymentTermForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		if (existing.status === "retired") {
			return invalidState("Retired payment terms are immutable");
		}
		const nextName = record.name ?? existing.name;
		const ruleResult = normalizePaymentTermRule({
			netDays: record.netDays ?? existing.netDays,
			discountDays:
				record.discountDays !== undefined
					? record.discountDays
					: existing.discountDays,
			discountPercent:
				record.discountPercent !== undefined
					? record.discountPercent
					: existing.discountPercent,
			dueDayRule: record.dueDayRule ?? existing.dueDayRule,
			endOfMonth: record.endOfMonth ?? existing.endOfMonth,
			installmentPolicy: record.installmentPolicy ?? existing.installmentPolicy,
			installmentCount:
				record.installmentCount !== undefined
					? record.installmentCount
					: existing.installmentCount,
			validFrom:
				record.validFrom !== undefined ? record.validFrom : existing.validFrom,
			validTo: record.validTo !== undefined ? record.validTo : existing.validTo,
			currencyRestrictionId:
				record.currencyRestrictionId !== undefined
					? record.currencyRestrictionId
					: existing.currencyRestrictionId,
		});
		if (!ruleResult.ok) return ruleResult;
		const rule = ruleResult.data;
		if (rule.currencyRestrictionId !== null) {
			const currency = await this.getRefCurrencyById(
				rule.currencyRestrictionId,
			);
			if (!currency.ok) return currency;
			if (currency.data === null || !currency.data.active) {
				return validationFailed(
					"Payment term currency restriction must be active",
				);
			}
		}
		const nextVersion = existing.version + 1;
		const changesJson = JSON.stringify([
			{ field: "name", oldValue: existing.name, newValue: nextName },
			...(rule.netDays !== existing.netDays
				? [
						{
							field: "netDays",
							oldValue: existing.netDays,
							newValue: rule.netDays,
						},
					]
				: []),
		]);
		const oldValueJson = valueSnapshotJson({
			name: existing.name,
			netDays: existing.netDays,
			discountDays: existing.discountDays,
			discountPercent: existing.discountPercent,
			dueDayRule: existing.dueDayRule,
			endOfMonth: existing.endOfMonth,
			installmentPolicy: existing.installmentPolicy,
			installmentCount: existing.installmentCount,
			validFrom: existing.validFrom,
			validTo: existing.validTo,
			currencyRestrictionId: existing.currencyRestrictionId,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			name: nextName,
			...rule,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "payment_term",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[PaymentTermSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE md_payment_term
							SET
								name = ${nextName},
								net_days = ${rule.netDays},
								discount_days = ${rule.discountDays},
								discount_percent = ${rule.discountPercent},
								due_day_rule = ${rule.dueDayRule},
								end_of_month = ${rule.endOfMonth},
								installment_policy = ${rule.installmentPolicy},
								installment_count = ${rule.installmentCount},
								valid_from = ${rule.validFrom},
								valid_to = ${rule.validTo},
								currency_restriction_id = ${rule.currencyRestrictionId},
								version = version + 1,
								updated_by = ${record.updatedBy},
								updated_at = now()
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status <> 'retired'
								AND ${rule.netDays}::integer BETWEEN 0 AND ${MAX_PAYMENT_TERM_NET_DAYS}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
								'master_data', 'payment_term', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.payment_term.updated.v1', 'master_data',
								${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Payment term version conflict");
			}
			return ok(mapPaymentTermSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to update payment term");
		}
	}

	async transitionPaymentTerm(
		record: PaymentTermLifecycleRecord,
		_ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: PaymentTermLifecycleEventSuffix;
		},
	): Promise<Result<PaymentTerm>> {
		const existingResult = await this.loadPaymentTermForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const lifecycle = assertLifecycleTransition(
			existing.status,
			record.toStatus,
		);
		if (!lifecycle.ok) return lifecycle;
		const eventType = `master_data.payment_term.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson(
			"status",
			existing.status,
			record.toStatus,
		);
		const oldValueJson = valueSnapshotJson({
			status: existing.status,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			status: record.toStatus,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "payment_term",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		const activatedBy =
			record.toStatus === "active"
				? (existing.activatedBy ?? record.actorUserId)
				: existing.activatedBy;
		const retiredBy = record.toStatus === "retired" ? record.actorUserId : null;
		try {
			const [rows] = await runNeonHttpTransaction<[PaymentTermSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE md_payment_term
							SET
								status = ${record.toStatus},
								version = version + 1,
								updated_by = ${record.actorUserId},
								updated_at = now(),
								activated_at = CASE
									WHEN ${record.toStatus} = 'active' THEN COALESCE(activated_at, now())
									ELSE activated_at
								END,
								activated_by = CASE
									WHEN ${record.toStatus} = 'active' THEN ${activatedBy}
									ELSE activated_by
								END,
								retired_at = CASE
									WHEN ${record.toStatus} = 'retired' THEN now()
									ELSE NULL
								END,
								retired_by = CASE
									WHEN ${record.toStatus} = 'retired' THEN ${retiredBy}
									ELSE NULL
								END
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = ${existing.status}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'master_data', 'payment_term', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${eventType}, 'master_data',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Payment term version conflict");
			}
			return ok(mapPaymentTermSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to transition payment term");
		}
	}

	async getTaxRegistrationById(
		organizationId: string,
		id: string,
	): Promise<Result<TaxRegistration | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdTaxRegistration)
				.where(
					and(
						eq(mdTaxRegistration.id, id),
						eq(mdTaxRegistration.organizationId, organizationId),
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapTaxRegistration(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load tax registration");
		}
	}

	async listTaxRegistrations(
		filter: TaxRegistrationListFilter,
	): Promise<Result<TaxRegistration[]>> {
		try {
			const predicates = [
				eq(mdTaxRegistration.organizationId, filter.organizationId),
			];
			if (filter.status !== undefined) {
				predicates.push(eq(mdTaxRegistration.status, filter.status));
			}
			if (filter.partyId !== undefined) {
				predicates.push(eq(mdTaxRegistration.partyId, filter.partyId));
			}
			if (filter.updatedSince !== undefined) {
				predicates.push(
					sql`${mdTaxRegistration.updatedAt} > ${filter.updatedSince}`,
				);
			}
			const rows = await db
				.select()
				.from(mdTaxRegistration)
				.where(and(...predicates))
				.orderBy(
					asc(mdTaxRegistration.normalizedRegistrationNumber),
					asc(mdTaxRegistration.id),
				)
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return ok(rows.map(mapTaxRegistration));
		} catch (error) {
			return failFromUnknown(error, "Failed to list tax registrations");
		}
	}

	async findTaxRegistrationsByParty(
		organizationId: string,
		partyId: string,
	): Promise<Result<TaxRegistration[]>> {
		return this.listTaxRegistrations({
			organizationId,
			partyId,
			page: 1,
			pageSize: 100,
		});
	}

	async findOverlappingActiveTaxRegistration(
		query: TaxRegistrationOverlapQuery,
	): Promise<Result<TaxRegistration | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdTaxRegistration)
				.where(
					and(
						eq(mdTaxRegistration.organizationId, query.organizationId),
						eq(mdTaxRegistration.partyId, query.partyId),
						eq(
							mdTaxRegistration.jurisdictionCountryId,
							query.jurisdictionCountryId,
						),
						eq(mdTaxRegistration.registrationType, query.registrationType),
						eq(mdTaxRegistration.status, "active"),
						isNull(mdTaxRegistration.deletedAt),
						query.excludeId === undefined
							? undefined
							: sql`${mdTaxRegistration.id} <> ${query.excludeId}`,
						sql`${mdTaxRegistration.validFrom} IS NOT NULL`,
						sql`${mdTaxRegistration.validFrom} < COALESCE(${query.validTo}, 'infinity'::timestamptz)`,
						sql`${query.validFrom} < COALESCE(${mdTaxRegistration.validTo}, 'infinity'::timestamptz)`,
					),
				)
				.limit(1);
			return ok(row === undefined ? null : mapTaxRegistration(row));
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to check tax registration validity overlap",
			);
		}
	}

	async createTaxRegistration(
		record: TaxRegistrationCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TaxRegistration>> {
		if (
			isInvalidValidityRange({
				validFrom: record.validFrom,
				validTo: record.validTo,
			})
		) {
			return taxRegistrationValidityFailure("validTo must be after validFrom");
		}
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("identity", null, {
			partyId: record.partyId,
			jurisdictionCountryId: record.jurisdictionCountryId,
			registrationType: record.registrationType,
		});
		const newValueJson = valueSnapshotJson({
			partyId: record.partyId,
			jurisdictionCountryId: record.jurisdictionCountryId,
			registrationType: record.registrationType,
			status: "draft",
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "tax_registration",
			entityId,
			code: record.registrationType,
			partyId: record.partyId,
			jurisdictionCountryId: record.jurisdictionCountryId,
			registrationType: record.registrationType,
			status: "draft",
			version: 1,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[TaxRegistrationSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							INSERT INTO md_tax_registration (
								id, organization_id, party_id, jurisdiction_country_id,
								registration_type, registration_number, normalized_registration_number,
								name, status, version, valid_from, valid_to, created_by, updated_by
							)
							SELECT
								${entityId}, ${record.organizationId}, ${record.partyId},
								${record.jurisdictionCountryId}, ${record.registrationType},
								${record.registrationNumber}, ${record.normalizedRegistrationNumber},
								${record.name}, 'draft', 1, ${record.validFrom}, ${record.validTo},
								${record.createdBy}, ${record.createdBy}
							FROM md_party AS party
							JOIN ref_country AS country
								ON country.id = ${record.jurisdictionCountryId}
								AND country.active = true
							WHERE party.id = ${record.partyId}
								AND party.organization_id = ${record.organizationId}
								AND party.status <> 'retired'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, new_value
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'master_data', 'tax_registration', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.tax_registration.created.v1', 'master_data',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (row === undefined) {
				return taxRegistrationValidityFailure(
					"Party or active jurisdiction country is unavailable",
				);
			}
			return ok(mapTaxRegistrationSqlRow(row));
		} catch (error) {
			return mapWriteError(
				error,
				"Tax registration identity already exists",
				"Failed to create tax registration",
			);
		}
	}

	async updateTaxRegistration(
		record: TaxRegistrationUpdateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TaxRegistration>> {
		const existingResult = await this.loadTaxRegistrationForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		if (existing.status === "retired") {
			return invalidState("Retired tax registrations are immutable");
		}
		const nextName = record.name !== undefined ? record.name : existing.name;
		const nextValidFrom =
			record.validFrom !== undefined ? record.validFrom : existing.validFrom;
		const nextValidTo =
			record.validTo !== undefined ? record.validTo : existing.validTo;
		if (
			isInvalidValidityRange({
				validFrom: nextValidFrom,
				validTo: nextValidTo,
			})
		) {
			return taxRegistrationValidityFailure("validTo must be after validFrom");
		}
		if (existing.status === "active") {
			if (nextValidFrom === null) {
				return invalidState("Active tax registration requires validFrom");
			}
			const overlap = await this.findOverlappingActiveTaxRegistration({
				organizationId: existing.organizationId,
				partyId: existing.partyId,
				jurisdictionCountryId: existing.jurisdictionCountryId,
				registrationType: existing.registrationType,
				validFrom: nextValidFrom,
				validTo: nextValidTo,
				excludeId: existing.id,
			});
			if (!overlap.ok) return overlap;
			if (overlap.data !== null) return taxRegistrationOverlapConflict();
		}
		const nextVersion = existing.version + 1;
		const changesJson = JSON.stringify([
			{ field: "name", oldValue: existing.name, newValue: nextName },
			{
				field: "validFrom",
				oldValue: existing.validFrom,
				newValue: nextValidFrom,
			},
			{
				field: "validTo",
				oldValue: existing.validTo,
				newValue: nextValidTo,
			},
		]);
		const oldValueJson = valueSnapshotJson({
			name: existing.name,
			validFrom: existing.validFrom,
			validTo: existing.validTo,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			name: nextName,
			validFrom: nextValidFrom,
			validTo: nextValidTo,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "tax_registration",
			entityId: existing.id,
			code: existing.registrationType,
			partyId: existing.partyId,
			jurisdictionCountryId: existing.jurisdictionCountryId,
			registrationType: existing.registrationType,
			status: existing.status,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[TaxRegistrationSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE md_tax_registration
							SET
								name = ${nextName},
								valid_from = ${nextValidFrom},
								valid_to = ${nextValidTo},
								version = version + 1,
								updated_by = ${record.updatedBy},
								updated_at = now()
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = ${existing.status}
								AND status <> 'retired'
								AND (
									status <> 'active'
									OR (
										${nextValidFrom} IS NOT NULL
										AND EXISTS (
											SELECT 1 FROM ref_country AS country
											WHERE country.id = ${existing.jurisdictionCountryId}
												AND country.active = true
										)
										AND EXISTS (
											SELECT 1 FROM md_party AS party
											WHERE party.id = ${existing.partyId}
												AND party.organization_id = ${existing.organizationId}
												AND party.status <> 'retired'
										)
										AND NOT EXISTS (
											SELECT 1
											FROM md_tax_registration AS sibling
											WHERE sibling.organization_id = ${existing.organizationId}
												AND sibling.party_id = ${existing.partyId}
												AND sibling.jurisdiction_country_id = ${existing.jurisdictionCountryId}
												AND sibling.registration_type = ${existing.registrationType}
												AND sibling.status = 'active'
												AND sibling.deleted_at IS NULL
												AND sibling.id <> ${existing.id}
												AND sibling.valid_from IS NOT NULL
												AND sibling.valid_from < COALESCE(${nextValidTo}, 'infinity'::timestamptz)
												AND ${nextValidFrom} < COALESCE(sibling.valid_to, 'infinity'::timestamptz)
										)
									)
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
								'master_data', 'tax_registration', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, 'master_data.tax_registration.updated.v1', 'master_data',
								${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
				{ isolationLevel: "Serializable" },
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Tax registration version conflict");
			}
			return ok(mapTaxRegistrationSqlRow(row));
		} catch (error) {
			if (hasSqlState(error, "40001")) {
				return taxRegistrationOverlapConflict();
			}
			return failFromUnknown(error, "Failed to update tax registration");
		}
	}

	async transitionTaxRegistration(
		record: TaxRegistrationLifecycleRecord,
		_ports: MutationPorts,
		meta: {
			correlationId: string;
			eventSuffix: TaxRegistrationLifecycleEventSuffix;
		},
	): Promise<Result<TaxRegistration>> {
		const existingResult = await this.loadTaxRegistrationForMutation(
			record.organizationId,
			record.id,
			record.expectedVersion,
		);
		if (!existingResult.ok) {
			return existingResult;
		}
		const existing = existingResult.data;
		const lifecycle =
			existing.status === "retired" && record.toStatus === "blocked"
				? assertRestoreTransition(existing.status, "blocked")
				: assertTaxRegistrationLifecycleTransition(
						existing.status,
						record.toStatus,
					);
		if (!lifecycle.ok) return lifecycle;
		if (record.toStatus === "active") {
			if (existing.validFrom === null) {
				return invalidState("Active tax registration requires validFrom");
			}
			if (
				isInvalidValidityRange({
					validFrom: existing.validFrom,
					validTo: existing.validTo,
				})
			) {
				return taxRegistrationValidityFailure(
					"validTo must be after validFrom",
				);
			}
			const overlap = await this.findOverlappingActiveTaxRegistration({
				organizationId: existing.organizationId,
				partyId: existing.partyId,
				jurisdictionCountryId: existing.jurisdictionCountryId,
				registrationType: existing.registrationType,
				validFrom: existing.validFrom,
				validTo: existing.validTo,
				excludeId: existing.id,
			});
			if (!overlap.ok) return overlap;
			if (overlap.data !== null) return taxRegistrationOverlapConflict();
		}
		const eventType = `master_data.tax_registration.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson(
			"status",
			existing.status,
			record.toStatus,
		);
		const oldValueJson = valueSnapshotJson({
			status: existing.status,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			status: record.toStatus,
			version: nextVersion,
		});
		const payloadJson = eventPayloadJson({
			organizationId: existing.organizationId,
			entityType: "tax_registration",
			entityId: existing.id,
			code: existing.registrationType,
			partyId: existing.partyId,
			jurisdictionCountryId: existing.jurisdictionCountryId,
			registrationType: existing.registrationType,
			status: record.toStatus,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		const activatedBy =
			record.toStatus === "active"
				? (existing.activatedBy ?? record.actorUserId)
				: existing.activatedBy;
		const blockedBy =
			record.toStatus === "blocked" ? record.actorUserId : existing.blockedBy;
		const retiredBy = record.toStatus === "retired" ? record.actorUserId : null;
		try {
			const [rows] = await runNeonHttpTransaction<[TaxRegistrationSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE md_tax_registration
							SET
								status = ${record.toStatus},
								version = version + 1,
								updated_by = ${record.actorUserId},
								updated_at = now(),
								activated_at = CASE
									WHEN ${record.toStatus} = 'active' THEN COALESCE(activated_at, now())
									ELSE activated_at
								END,
								activated_by = CASE
									WHEN ${record.toStatus} = 'active' THEN ${activatedBy}
									ELSE activated_by
								END,
								blocked_at = CASE
									WHEN ${record.toStatus} = 'blocked' THEN now()
									ELSE blocked_at
								END,
								blocked_by = CASE
									WHEN ${record.toStatus} = 'blocked' THEN ${blockedBy}
									ELSE blocked_by
								END,
								retired_at = CASE
									WHEN ${record.toStatus} = 'retired' THEN now()
									ELSE NULL
								END,
								retired_by = CASE
									WHEN ${record.toStatus} = 'retired' THEN ${retiredBy}
									ELSE NULL
								END
							WHERE id = ${record.id}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = ${existing.status}
								AND (
									${record.toStatus} <> 'active'
									OR (
										valid_from IS NOT NULL
						AND (valid_to IS NULL OR valid_to > valid_from)
										AND EXISTS (
											SELECT 1 FROM ref_country AS country
											WHERE country.id = ${existing.jurisdictionCountryId}
												AND country.active = true
										)
										AND EXISTS (
											SELECT 1 FROM md_party AS party
											WHERE party.id = ${existing.partyId}
												AND party.organization_id = ${existing.organizationId}
												AND party.status <> 'retired'
										)
										AND NOT EXISTS (
											SELECT 1
											FROM md_tax_registration AS sibling
											WHERE sibling.organization_id = ${existing.organizationId}
												AND sibling.party_id = ${existing.partyId}
												AND sibling.jurisdiction_country_id = ${existing.jurisdictionCountryId}
												AND sibling.registration_type = ${existing.registrationType}
												AND sibling.status = 'active'
												AND sibling.deleted_at IS NULL
												AND sibling.id <> ${existing.id}
												AND sibling.valid_from IS NOT NULL
								AND sibling.valid_from < COALESCE(${existing.validTo}, 'infinity'::timestamptz)
								AND ${existing.validFrom} < COALESCE(sibling.valid_to, 'infinity'::timestamptz)
										)
									)
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'master_data', 'tax_registration', id, 'UPDATE', ${changesJson}::jsonb,
								${oldValueJson}::jsonb, ${newValueJson}::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${eventType}, 'master_data',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
				{ isolationLevel: "Serializable" },
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Tax registration version conflict");
			}
			return ok(mapTaxRegistrationSqlRow(row));
		} catch (error) {
			if (hasSqlState(error, "40001")) {
				return taxRegistrationOverlapConflict();
			}
			return failFromUnknown(error, "Failed to transition tax registration");
		}
	}

	private async loadPartyForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<Party>> {
		try {
			const [row] = await db
				.select()
				.from(mdParty)
				.where(eq(mdParty.id, id))
				.limit(1);
			if (row === undefined) {
				return notFound("Party not found");
			}
			if (row.organizationId !== organizationId) {
				return crossOrg("Party belongs to another organization");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Party version conflict");
			}
			return ok(mapParty(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load party for mutation");
		}
	}

	private async loadItemGroupForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<ItemGroup>> {
		try {
			const [row] = await db
				.select()
				.from(mdItemGroup)
				.where(eq(mdItemGroup.id, id))
				.limit(1);
			if (row === undefined) {
				return notFound("Item group not found");
			}
			if (row.organizationId !== organizationId) {
				return crossOrg("Item group belongs to another organization");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Item group version conflict");
			}
			return ok(mapItemGroup(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load item group for mutation");
		}
	}

	private async loadItemForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<Item>> {
		try {
			const [row] = await db
				.select()
				.from(mdItem)
				.where(eq(mdItem.id, id))
				.limit(1);
			if (row === undefined) {
				return notFound("Item not found");
			}
			if (row.organizationId !== organizationId) {
				return crossOrg("Item belongs to another organization");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Item version conflict");
			}
			return ok(mapItem(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load item for mutation");
		}
	}

	private async loadWarehouseForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<Warehouse>> {
		try {
			const [row] = await db
				.select()
				.from(mdWarehouse)
				.where(eq(mdWarehouse.id, id))
				.limit(1);
			if (row === undefined) {
				return notFound("Warehouse not found");
			}
			if (row.organizationId !== organizationId) {
				return crossOrg("Warehouse belongs to another organization");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Warehouse version conflict");
			}
			return ok(mapWarehouse(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load warehouse for mutation");
		}
	}

	private async loadPaymentTermForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<PaymentTerm>> {
		try {
			const [row] = await db
				.select()
				.from(mdPaymentTerm)
				.where(eq(mdPaymentTerm.id, id))
				.limit(1);
			if (row === undefined) {
				return notFound("Payment term not found");
			}
			if (row.organizationId !== organizationId) {
				return crossOrg("Payment term belongs to another organization");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Payment term version conflict");
			}
			return ok(mapPaymentTerm(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to load payment term for mutation");
		}
	}

	private async loadTaxRegistrationForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<TaxRegistration>> {
		try {
			const [row] = await db
				.select()
				.from(mdTaxRegistration)
				.where(eq(mdTaxRegistration.id, id))
				.limit(1);
			if (row === undefined) {
				return notFound("Tax registration not found");
			}
			if (row.organizationId !== organizationId) {
				return crossOrg("Tax registration belongs to another organization");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Tax registration version conflict");
			}
			return ok(mapTaxRegistration(row));
		} catch (error) {
			return failFromUnknown(
				error,
				"Failed to load tax registration for mutation",
			);
		}
	}

	countActivePartyRoles = drizzleCountActivePartyRoles;
	listPartyRoles = drizzleListPartyRoles;
	listActivePartyRoles = drizzleListActivePartyRoles;
	getPartyRoleById = drizzleGetPartyRoleById;
	getPartyRoleLifecycleContext = drizzleGetPartyRoleLifecycleContext;
	createPartyRole = drizzleCreatePartyRole;
	updatePartyRole = drizzleUpdatePartyRole;
	transitionPartyRole = drizzleTransitionPartyRole;
	listPartyAddresses = drizzleListPartyAddresses;
	getPartyAddressById = drizzleGetPartyAddressById;
	getPrimaryPartyAddress = drizzleGetPrimaryPartyAddress;
	createPartyAddress = drizzleCreatePartyAddress;
	updatePartyAddress = drizzleUpdatePartyAddress;
	listPartyContacts = drizzleListPartyContacts;
	getPrimaryPartyContact = drizzleGetPrimaryPartyContact;
	createPartyContact = drizzleCreatePartyContact;
	updatePartyContact = drizzleUpdatePartyContact;
	updatePartyContactVerification = drizzleUpdatePartyContactVerification;
	createPartyExternalId = drizzleCreatePartyExternalId;
	findPartyByExternalId = drizzleFindPartyByExternalId;
	createPartyRelationship = drizzleCreatePartyRelationship;
	listPartyRelationships = drizzleListPartyRelationships;
	resolveItemUomCompatibilityContext =
		drizzleResolveItemUomCompatibilityContext;
	listItemUoms = drizzleListItemUoms;
	getDefaultItemSalesUom = drizzleGetDefaultItemSalesUom;
	getDefaultItemPurchaseUom = drizzleGetDefaultItemPurchaseUom;
	createItemUom = drizzleCreateItemUom;
	createItemBarcode = drizzleCreateItemBarcode;
	createItemExternalId = drizzleCreateItemExternalId;
	findItemByExternalId = drizzleFindItemByExternalId;
	createItemAlias = drizzleCreateItemAlias;
	listItemAliases = drizzleListItemAliases;
	findItemByAlias = drizzleFindItemByAlias;
	listItemsByAlias = drizzleListItemsByAlias;
	findItemByBarcode = drizzleFindItemByBarcode;
	createWarehouseExternalId = drizzleCreateWarehouseExternalId;
	findWarehouseByExternalId = drizzleFindWarehouseByExternalId;

	getChangeRequestById = drizzleGetChangeRequestById;
	listChangeRequests = drizzleListChangeRequests;
	createChangeRequest = drizzleCreateChangeRequest;
	transitionChangeRequest = drizzleTransitionChangeRequest;

	getItemTemplateById = drizzleGetItemTemplateById;
	getItemTemplateByCode = drizzleGetItemTemplateByCode;
	listItemTemplates = drizzleListItemTemplates;
	createItemTemplate = drizzleCreateItemTemplate;
	updateItemTemplate = drizzleUpdateItemTemplate;
	transitionItemTemplate = drizzleTransitionItemTemplate;
	listItemTemplateAttributes = drizzleListItemTemplateAttributes;
	getItemTemplateAttributeContextById =
		drizzleGetItemTemplateAttributeContextById;
	listItemTemplateAttributeOptions = drizzleListItemTemplateAttributeOptions;
	listItemTemplateAttributeOptionsByTemplate =
		drizzleListItemTemplateAttributeOptionsByTemplate;
	addItemTemplateAttribute = drizzleAddItemTemplateAttribute;
	addItemTemplateAttributeOption = drizzleAddItemTemplateAttributeOption;
	getItemVariantById = drizzleGetItemVariantById;
	listItemVariantsByTemplate = drizzleListItemVariantsByTemplate;
	createItemVariant = drizzleCreateItemVariant;
	retireItemVariant = drizzleRetireItemVariant;

	async getImportBatchByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<ImportBatchRecord | null>> {
		try {
			const [row] = await db
				.select()
				.from(mdImportBatch)
				.where(
					and(
						eq(mdImportBatch.organizationId, organizationId),
						eq(mdImportBatch.idempotencyKey, idempotencyKey),
					),
				)
				.limit(1);
			if (row === undefined) {
				return ok(null);
			}
			return ok({
				id: row.id,
				organizationId: row.organizationId,
				idempotencyKey: row.idempotencyKey,
				entityType: row.entityType as ImportBatchEntityType,
				sourceSystem: row.sourceSystem,
				mode: row.mode,
				status: "applied",
				report: row.report,
				actorUserId: row.actorUserId,
				correlationId: row.correlationId,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to load import batch");
		}
	}

	async saveImportBatch(
		record: ImportBatchCreateRecord,
	): Promise<Result<ImportBatchRecord>> {
		const entityId = randomUUID();
		try {
			const [row] = await db
				.insert(mdImportBatch)
				.values({
					id: entityId,
					organizationId: record.organizationId,
					idempotencyKey: record.idempotencyKey,
					entityType: record.entityType,
					sourceSystem: record.sourceSystem,
					mode: record.mode,
					status: "applied",
					report: record.report,
					actorUserId: record.actorUserId,
					correlationId: record.correlationId,
				})
				.returning();
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Import batch save returned no row");
			}
			return ok({
				id: row.id,
				organizationId: row.organizationId,
				idempotencyKey: row.idempotencyKey,
				entityType: row.entityType as ImportBatchEntityType,
				sourceSystem: row.sourceSystem,
				mode: row.mode,
				status: "applied",
				report: row.report,
				actorUserId: row.actorUserId,
				correlationId: row.correlationId,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			});
		} catch (error) {
			return mapWriteError(
				error,
				"Import batch idempotency key already exists",
				"Failed to save import batch",
			);
		}
	}
}

export function createDrizzleMasterDataStore(): MasterDataStore {
	return new DrizzleMasterDataStore();
}
