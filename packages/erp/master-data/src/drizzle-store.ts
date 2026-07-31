import { randomUUID } from "node:crypto";

import {
	audit as afendaAudit,
	type PreparedDerivedEntityAuditInsertValues,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	eq,
	isNull,
	mdImportBatch,
	mdImportBatchRow,
	mdItem,
	mdItemGroup,
	mdParty,
	mdPaymentTerm,
	mdTaxRegistration,
	mdWarehouse,
	type NeonHttpSql,
	refCountry,
	refCurrency,
	refLanguage,
	refTimeZone,
	refUom,
	refUomDimension,
	sql,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

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
	ImportBatchClaimRecord,
	ImportBatchClaimResult,
	ImportBatchCompletionRecord,
	ImportBatchEntityType,
	ImportBatchLeaseRequest,
	ImportBatchLeaseResult,
	ImportBatchRecord,
	ImportBatchRowRecord,
	ItemCreateRecord,
	ItemGroupCreateRecord,
	ItemGroupLifecycleRecord,
	ItemGroupUpdateRecord,
	ItemListFilter,
	ItemUpdateRecord,
	ListFilter,
	MasterDataStore,
	MutationMeta,
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
	IMPORT_BATCH_STATUSES,
	IMPORT_ROW_OPERATIONS,
} from "./capabilities/data-governance-workflows/import-types";
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

function importRowAppliedQuery(
	sqlClient: NeonHttpSql,
	meta: MutationMeta,
	input: {
		auditId: string;
		eventId: string;
		resultEntityId: string;
		resultVersion: number;
	},
) {
	const context = meta.importMutation;
	if (context === undefined) {
		return sqlClient`SELECT 1 AS import_row_committed`;
	}
	return sqlClient`
		WITH completed AS (
			UPDATE md_import_batch_row AS import_row
			SET
				intended_operation = ${context.intendedOperation ?? null},
				matched_entity_id = ${context.matchedEntityId ?? null},
				status = 'applied',
				error_code = NULL,
				error_details = NULL,
				result_entity_id = ${input.resultEntityId},
				result_version = ${input.resultVersion},
				attempt_count = attempt_count + 1,
				started_at = COALESCE(started_at, now()),
				completed_at = now(),
				updated_at = now()
			FROM md_import_batch AS batch
			WHERE import_row.organization_id = ${context.organizationId}
				AND import_row.batch_id = ${context.batchId}
				AND import_row.source_row_number = ${context.sourceRowNumber}
				AND import_row.status <> 'applied'
				AND batch.organization_id = import_row.organization_id
				AND batch.id = import_row.batch_id
				AND batch.status = 'applying'
				AND batch.lease_owner = ${context.leaseOwner}
				AND EXISTS (SELECT 1 FROM platform_audit_log WHERE id = ${input.auditId})
				AND EXISTS (SELECT 1 FROM platform_domain_event WHERE id = ${input.eventId})
			RETURNING import_row.id
		)
		SELECT 1 / CASE
			WHEN EXISTS (SELECT 1 FROM completed) THEN 1
			ELSE 0
		END AS import_row_committed
	`;
}

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

const CORE_MASTER_AUDIT_SOURCE = "master-data.drizzle-store";

interface CoreMasterAuditInput {
	action: "CREATE" | "UPDATE" | "DELETE";
	actorUserId: string;
	causationId?: string | null;
	correlationId: string;
	entity: string;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function prepareCoreMasterAudit(
	input: CoreMasterAuditInput & { entityId: string },
): Result<PreparedTransactionalAuditInsertValues> {
	return afendaAudit.transaction.prepare({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "master_data",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue,
		newValue: input.newValue,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: CORE_MASTER_AUDIT_SOURCE,
			occurredAt: null,
			causationId: input.causationId ?? null,
			reasonCode: input.reasonCode,
		},
	});
}

function prepareDerivedCoreMasterAudit(
	input: CoreMasterAuditInput,
): Result<PreparedDerivedEntityAuditInsertValues> {
	return afendaAudit.transaction.prepareDerived({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "master_data",
		entity: input.entity,
		action: input.action,
		oldValue: input.oldValue,
		newValue: input.newValue,
		eventContext: {
			version: 1,
			outcome: "SUCCEEDED",
			source: CORE_MASTER_AUDIT_SOURCE,
			occurredAt: null,
			causationId: input.causationId ?? null,
			reasonCode: input.reasonCode,
		},
	});
}

function taxRegistrationOverlapConflict(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Active tax registration validity ranges overlap",
	});
}

function taxRegistrationValidityFailure(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}

function _codeConflict(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

function versionConflict(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

function resolveWarehouseUpdateState(
	record: WarehouseUpdateRecord,
	existing: Warehouse,
) {
	return {
		name: record.name ?? existing.name,
		locationType: record.locationType ?? existing.locationType,
		addressCountryId:
			record.addressCountryId === undefined
				? existing.addressCountryId
				: record.addressCountryId,
		addressLine1:
			record.addressLine1 === undefined
				? existing.addressLine1
				: record.addressLine1,
		addressLine2:
			record.addressLine2 === undefined
				? existing.addressLine2
				: record.addressLine2,
		addressCity:
			record.addressCity === undefined
				? existing.addressCity
				: record.addressCity,
		addressRegion:
			record.addressRegion === undefined
				? existing.addressRegion
				: record.addressRegion,
		addressPostalCode:
			record.addressPostalCode === undefined
				? existing.addressPostalCode
				: record.addressPostalCode,
	};
}

function normalizePaymentTermUpdateRule(
	record: PaymentTermUpdateRecord,
	existing: PaymentTerm,
) {
	return normalizePaymentTermRule({
		netDays: record.netDays ?? existing.netDays,
		discountDays:
			record.discountDays === undefined
				? existing.discountDays
				: record.discountDays,
		discountPercent:
			record.discountPercent === undefined
				? existing.discountPercent
				: record.discountPercent,
		dueDayRule: record.dueDayRule ?? existing.dueDayRule,
		endOfMonth: record.endOfMonth ?? existing.endOfMonth,
		installmentPolicy: record.installmentPolicy ?? existing.installmentPolicy,
		installmentCount:
			record.installmentCount === undefined
				? existing.installmentCount
				: record.installmentCount,
		validFrom:
			record.validFrom === undefined ? existing.validFrom : record.validFrom,
		validTo: record.validTo === undefined ? existing.validTo : record.validTo,
		currencyRestrictionId:
			record.currencyRestrictionId === undefined
				? existing.currencyRestrictionId
				: record.currencyRestrictionId,
	});
}

function resolveItemUpdateState(record: ItemUpdateRecord, existing: Item) {
	const itemType = record.itemType ?? existing.itemType;
	const itemTypeChanged = itemType !== existing.itemType;
	return {
		name: record.name ?? existing.name,
		description:
			record.description === undefined
				? existing.description
				: record.description,
		itemType,
		baseUomId: record.baseUomId ?? existing.baseUomId,
		itemGroupId: record.itemGroupId ?? existing.itemGroupId,
		profile: resolveItemOperationalProfile({
			itemType,
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
		}),
	};
}

function notFound(_message: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "The requested resource was not found",
	});
}

function validationFailed(_message: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
}

function invalidState(_message: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "The request conflicts with current state",
	});
}

interface PartySqlRow {
	activated_at: string | Date | null;
	activated_by: string | null;
	blocked_at: string | Date | null;
	blocked_by: string | null;
	code: string;
	created_at: string | Date;
	created_by: string;
	default_currency_id: string | null;
	id: string;
	legal_name: string | null;
	merged_into_id: string | null;
	name: string;
	normalized_code: string;
	organization_id: string;
	party_kind: string;
	preferred_language_id: string | null;
	registration_country_id: string | null;
	registration_number: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	status: string;
	trading_name: string | null;
	updated_at: string | Date;
	updated_by: string;
	version: number;
}

interface ItemGroupSqlRow {
	activated_at: string | Date | null;
	activated_by: string | null;
	code: string;
	created_at: string | Date;
	created_by: string;
	id: string;
	name: string;
	normalized_code: string;
	organization_id: string;
	parent_id: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	status: string;
	updated_at: string | Date;
	updated_by: string;
	version: number;
}

interface ItemSqlRow {
	activated_at: string | Date | null;
	activated_by: string | null;
	base_uom_id: string;
	code: string;
	created_at: string | Date;
	created_by: string;
	description: string | null;
	id: string;
	item_group_id: string;
	item_type: string;
	name: string;
	normalized_code: string;
	organization_id: string;
	purchasable: boolean;
	retired_at: string | Date | null;
	retired_by: string | null;
	sellable: boolean;
	service_indicator: boolean;
	status: string;
	stocked: boolean;
	tracking_policy: string;
	updated_at: string | Date;
	updated_by: string;
	version: number;
}

interface WarehouseSqlRow {
	activated_at: string | Date | null;
	activated_by: string | null;
	address_city: string | null;
	address_country_id: string | null;
	address_line1: string | null;
	address_line2: string | null;
	address_postal_code: string | null;
	address_region: string | null;
	code: string;
	created_at: string | Date;
	created_by: string;
	id: string;
	location_type: string;
	name: string;
	normalized_code: string;
	organization_id: string;
	parent_id: string | null;
	retired_at: string | Date | null;
	retired_by: string | null;
	status: string;
	updated_at: string | Date;
	updated_by: string;
	version: number;
}

interface PaymentTermSqlRow {
	activated_at: string | Date | null;
	activated_by: string | null;
	code: string;
	created_at: string | Date;
	created_by: string;
	currency_restriction_id: string | null;
	discount_days: number | null;
	discount_percent: string | null;
	due_day_rule: string;
	end_of_month: boolean;
	id: string;
	installment_count: number | null;
	installment_policy: string;
	name: string;
	net_days: number;
	normalized_code: string;
	organization_id: string;
	retired_at: string | Date | null;
	retired_by: string | null;
	status: string;
	updated_at: string | Date;
	updated_by: string;
	valid_from: string | Date | null;
	valid_to: string | Date | null;
	version: number;
}

interface TaxRegistrationSqlRow {
	activated_at: string | Date | null;
	activated_by: string | null;
	blocked_at: string | Date | null;
	blocked_by: string | null;
	created_at: string | Date;
	created_by: string;
	deleted_at: string | Date | null;
	deleted_by: string | null;
	id: string;
	jurisdiction_country_id: string;
	name: string | null;
	normalized_registration_number: string;
	organization_id: string;
	party_id: string;
	registration_number: string;
	registration_type: string;
	retired_at: string | Date | null;
	retired_by: string | null;
	status: string;
	updated_at: string | Date;
	updated_by: string;
	valid_from: string | Date | null;
	valid_to: string | Date | null;
	version: number;
}

function toDate(value: string | Date | null | undefined): Date | null {
	if (value === null || value === undefined) {
		return null;
	}
	return value instanceof Date ? value : new Date(value);
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
	_uniqueMessage: string,
	fallbackMessage: string,
): Result<never> {
	return failFromPersistence(error, fallbackMessage);
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

const IMPORT_BATCH_ENTITY_TYPES = [
	"party",
	"item",
	"item_group",
	"warehouse",
] as const satisfies readonly ImportBatchEntityType[];

function isImportBatchEntityType(
	value: string,
): value is ImportBatchEntityType {
	return IMPORT_BATCH_ENTITY_TYPES.some((candidate) => candidate === value);
}

function isImportBatchStatus(
	value: string,
): value is ImportBatchRecord["status"] {
	return IMPORT_BATCH_STATUSES.some((candidate) => candidate === value);
}

function isImportRowOperation(
	value: string,
): value is NonNullable<ImportBatchRowRecord["intendedOperation"]> {
	return IMPORT_ROW_OPERATIONS.some((candidate) => candidate === value);
}

function isImportBatchRowStatus(
	value: string,
): value is ImportBatchRowRecord["status"] {
	return ["pending", "applying", "applied", "failed", "skipped"].some(
		(candidate) => candidate === value,
	);
}

function importJsonObject(
	value: unknown,
	field: string,
): Readonly<Record<string, unknown>> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Import ${field} must be a JSON object`);
	}
	return Object.fromEntries(Object.entries(value));
}

function isImportClaimResult(value: unknown): boolean {
	if (!Array.isArray(value) || value.length === 0) {
		return false;
	}
	const [first] = value;
	return (
		typeof first === "object" &&
		first !== null &&
		"id" in first &&
		typeof first.id === "string"
	);
}

function mapImportBatchRow(
	row: typeof mdImportBatch.$inferSelect,
): ImportBatchRecord {
	if (!isImportBatchEntityType(row.entityType)) {
		throw new Error(`Unsupported import batch entity type: ${row.entityType}`);
	}
	if (!isImportBatchStatus(row.status)) {
		throw new Error(`Unsupported import batch status: ${row.status}`);
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		idempotencyKey: row.idempotencyKey,
		payloadHash: row.payloadHash,
		operationType: row.operationType,
		entityType: row.entityType,
		sourceSystem: row.sourceSystem,
		mode: row.mode,
		status: row.status,
		report: row.report,
		leaseOwner: row.leaseOwner,
		leaseExpiresAt: row.leaseExpiresAt,
		actorUserId: row.actorUserId,
		correlationId: row.correlationId,
		completedAt: row.completedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapImportBatchRowRecord(
	row: typeof mdImportBatchRow.$inferSelect,
): ImportBatchRowRecord {
	if (!isImportBatchRowStatus(row.status)) {
		throw new Error(`Unsupported import batch row status: ${row.status}`);
	}
	if (
		row.intendedOperation !== null &&
		!isImportRowOperation(row.intendedOperation)
	) {
		throw new Error(
			`Unsupported import batch row operation: ${row.intendedOperation}`,
		);
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		batchId: row.batchId,
		sourceRowNumber: row.sourceRowNumber,
		payloadHash: row.payloadHash,
		normalizedPayload: importJsonObject(
			row.normalizedPayload,
			"normalized payload",
		),
		intendedOperation: row.intendedOperation,
		matchedEntityId: row.matchedEntityId,
		status: row.status,
		errorCode: row.errorCode,
		errorDetails:
			row.errorDetails === null
				? null
				: importJsonObject(row.errorDetails, "error details"),
		resultEntityId: row.resultEntityId,
		resultVersion: row.resultVersion,
		attemptCount: row.attemptCount,
		leaseOwner: row.leaseOwner,
		leaseExpiresAt: row.leaseExpiresAt,
		startedAt: row.startedAt,
		completedAt: row.completedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function assertItemGroupParent(
	organizationId: string,
	selfId: string | null,
	parentId: string | null,
): Promise<Result<true>> {
	if (parentId === null) {
		return Promise.resolve(errorResult.ok(true));
	}
	if (selfId !== null && parentId === selfId) {
		return Promise.resolve(validationFailed("Item group cannot parent itself"));
	}
	const inspectParent = async (
		cursor: string,
		seen: Set<string>,
	): Promise<Result<true>> => {
		if (selfId !== null && cursor === selfId) {
			return invalidState("Item group parent would create a cycle");
		}
		if (seen.has(cursor)) {
			return invalidState("Item group parent would create a cycle");
		}
		seen.add(cursor);
		const [row] = await afendaDatabase.client
			.select({
				id: mdItemGroup.id,
				organizationId: mdItemGroup.organizationId,
				parentId: mdItemGroup.parentId,
				status: mdItemGroup.status,
				retiredAt: mdItemGroup.retiredAt,
			})
			.from(mdItemGroup)
			.where(
				afendaDatabase.tenancy.entity(
					{ id: mdItemGroup.id, organizationId: mdItemGroup.organizationId },
					{ id: cursor, organizationId },
				),
			)
			.limit(1);
		if (row === undefined) {
			return notFound("Item group parent not found");
		}
		if (
			cursor === parentId &&
			(row.status !== "active" || row.retiredAt !== null)
		) {
			return invalidState("Item group parent must be active");
		}
		return row.parentId === null
			? errorResult.ok(true)
			: inspectParent(row.parentId, seen);
	};
	return inspectParent(parentId, new Set<string>());
}

function assertWarehouseParent(
	organizationId: string,
	selfId: string | null,
	parentId: string | null,
	childLocationType: WarehouseLocationType,
): Promise<Result<true>> {
	if (parentId === null) {
		return Promise.resolve(errorResult.ok(true));
	}
	if (selfId !== null && parentId === selfId) {
		return Promise.resolve(validationFailed("Warehouse cannot parent itself"));
	}
	const inspectParent = async (
		cursor: string,
		seen: Set<string>,
	): Promise<Result<true>> => {
		if (selfId !== null && cursor === selfId) {
			return validationFailed("Warehouse parent would create a cycle");
		}
		if (seen.has(cursor)) {
			return validationFailed("Warehouse parent would create a cycle");
		}
		seen.add(cursor);
		const [rawRow] = await afendaDatabase.client
			.select()
			.from(mdWarehouse)
			.where(
				afendaDatabase.tenancy.entity(
					{ id: mdWarehouse.id, organizationId: mdWarehouse.organizationId },
					{ id: cursor, organizationId },
				),
			)
			.limit(1);
		if (rawRow === undefined) {
			return notFound("Warehouse parent not found");
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
		return row.parentId === null
			? errorResult.ok(true)
			: inspectParent(row.parentId, seen);
	};
	return inspectParent(parentId, new Set<string>());
}

/**
 * Production MasterDataStore.
 * Current simple mutations use Neon HTTP `runNeonHttpTransaction` CTEs so
 * entity, audit, and outbox commit atomically in one round-trip.
 */
export class DrizzleMasterDataStore implements MasterDataStore {
	private readonly organizationDimensions: OrganizationDimensionStore =
		createDrizzleOrganizationDimensionStore();
	private readonly generateId: () => string;

	constructor(options: DrizzleMasterDataStoreOptions = {}) {
		this.generateId = options.generateId ?? randomUUID;
	}

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
			const [row] = await afendaDatabase.client
				.select()
				.from(refCountry)
				.where(eq(refCountry.code, code.trim().toUpperCase()))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefCountry(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref country");
		}
	}

	async getRefCountryById(id: string): Promise<Result<RefCountry | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refCountry)
				.where(eq(refCountry.id, id))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefCountry(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref country");
		}
	}

	async getRefCurrencyByCode(
		code: string,
	): Promise<Result<RefCurrency | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refCurrency)
				.where(eq(refCurrency.code, code.trim().toUpperCase()))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefCurrency(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref currency");
		}
	}

	async getRefCurrencyById(id: string): Promise<Result<RefCurrency | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refCurrency)
				.where(eq(refCurrency.id, id))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefCurrency(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref currency");
		}
	}

	async getRefLanguageByCode(
		code: string,
	): Promise<Result<RefLanguage | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refLanguage)
				.where(eq(refLanguage.code, code.trim().toLowerCase()))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefLanguage(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref language");
		}
	}

	async getRefTimeZoneByIana(
		ianaName: string,
	): Promise<Result<RefTimeZone | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refTimeZone)
				.where(eq(refTimeZone.ianaName, ianaName.trim()))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefTimeZone(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref time zone");
		}
	}

	async getRefUomDimensionByCode(
		code: string,
	): Promise<Result<RefUomDimension | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refUomDimension)
				.where(eq(refUomDimension.code, code.trim().toLowerCase()))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefUomDimension(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref UoM dimension");
		}
	}

	async getRefUomById(id: string): Promise<Result<RefUom | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refUom)
				.where(eq(refUom.id, id))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefUom(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref UoM");
		}
	}

	async getRefUomByCode(code: string): Promise<Result<RefUom | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(refUom)
				.where(eq(refUom.code, code.trim().toUpperCase()))
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapRefUom(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load ref UoM by code");
		}
	}

	async listRefUoms(): Promise<Result<RefUom[]>> {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(refUom)
				.orderBy(asc(refUom.code));
			return errorResult.ok(rows.map(mapRefUom));
		} catch (error) {
			return failFromPersistence(error, "Failed to list ref UoMs");
		}
	}

	async getPartyById(
		organizationId: string,
		id: string,
	): Promise<Result<Party | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdParty)
				.where(
					and(eq(mdParty.id, id), eq(mdParty.organizationId, organizationId)),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapParty(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load party");
		}
	}

	async getPartyByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Party | null>> {
		try {
			const [row] = await afendaDatabase.client
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
			return errorResult.ok(row === undefined ? null : mapParty(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load party by code");
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdParty)
				.where(and(...predicates))
				.orderBy(asc(mdParty.normalizedCode), asc(mdParty.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapParty));
		} catch (error) {
			return failFromPersistence(error, "Failed to list parties");
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdParty)
				.where(and(...predicates))
				.orderBy(asc(mdParty.normalizedCode), asc(mdParty.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapParty));
		} catch (error) {
			return failFromPersistence(error, "Failed to list parties by role");
		}
	}

	async findPartyByTaxRegistration(
		filter: PartyTaxRegistrationLookup,
	): Promise<Result<Party | null>> {
		try {
			const [row] = await afendaDatabase.client
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
			return errorResult.ok(row === undefined ? null : mapParty(row.party));
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to find party by tax registration",
			);
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdParty)
				.where(and(...predicates))
				.orderBy(asc(mdParty.normalizedCode), asc(mdParty.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapParty));
		} catch (error) {
			return failFromPersistence(error, "Failed to search parties");
		}
	}

	async createParty(
		record: PartyCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Party>> {
		const partyId = this.generateId();
		const auditId = this.generateId();
		const eventId = this.generateId();
		const externalId = meta.importMutation?.partyExternalIds?.[0];
		const externalAuditId = this.generateId();
		const externalEventId = this.generateId();
		const preparedPartyAudit = prepareCoreMasterAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "party",
			entityId: partyId,
			newValue: {
				code: record.code,
				partyKind: record.partyKind,
				status: "draft",
			},
			organizationId: record.organizationId,
			reasonCode: "PARTY_CREATED",
		});
		if (!preparedPartyAudit.ok) {
			return preparedPartyAudit;
		}
		const partyAudit = preparedPartyAudit.data;
		const preparedExternalIdAudit = prepareDerivedCoreMasterAudit({
			action: "CREATE",
			actorUserId: externalId?.createdBy ?? record.createdBy,
			correlationId: meta.correlationId,
			entity: "party_external_id",
			newValue: externalId
				? {
						sourceSystem: externalId.sourceSystem,
						externalIdType: externalId.externalIdType,
						caseSensitivity: externalId.caseSensitivity,
						isPrimary: externalId.isPrimary,
					}
				: null,
			organizationId: record.organizationId,
			reasonCode: "PARTY_EXTERNAL_ID_ASSIGNED",
		});
		if (!preparedExternalIdAudit.ok) {
			return preparedExternalIdAudit;
		}
		const externalIdAudit = preparedExternalIdAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
					WITH mutated AS (
						INSERT INTO md_party (
							id, organization_id, code, normalized_code, name, party_kind,
							status, version, legal_name, trading_name, registration_number,
							registration_country_id, preferred_language_id, default_currency_id,
							created_by, updated_by
						) VALUES (
							${partyId}::uuid, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.name}, ${record.partyKind}, 'draft', 1,
							${record.legalName ?? null}::text, ${record.tradingName ?? null}::text,
							${record.registrationNumber ?? null}::text, ${record.registrationCountryId ?? null}::uuid,
							${record.preferredLanguageId ?? null}::uuid, ${record.defaultCurrencyId ?? null}::uuid,
							${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}::uuid, ${partyAudit.organizationId}, ${partyAudit.actorUserId},
							${partyAudit.correlationId}, ${partyAudit.module}, ${partyAudit.entity},
							${partyAudit.entityId}, ${partyAudit.action}, ${partyAudit.changesJson}::jsonb,
							${partyAudit.oldValueJson}::jsonb, ${partyAudit.newValueJson}::jsonb,
							${partyAudit.metadataJson}::jsonb, ${partyAudit.ipAddress}, ${partyAudit.userAgent}
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}::uuid, organization_id, 'master_data.party.created.v1', 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					),
					external_id_mutated AS (
						INSERT INTO md_party_external_id (
							id, organization_id, party_id, source_system, external_id_type,
							external_value, normalized_value, case_sensitivity, is_primary,
							version, created_by, updated_by
						)
						SELECT
							${externalId?.id ?? null}::uuid, organization_id, id,
							${externalId?.sourceSystem ?? null}::text, ${externalId?.externalIdType ?? null}::text,
							${externalId?.externalValue ?? null}::text, ${externalId?.normalizedValue ?? null}::text,
							${externalId?.caseSensitivity ?? null}::text, ${externalId?.isPrimary ?? false}::boolean,
							1, ${externalId?.createdBy ?? null}::text, ${externalId?.createdBy ?? null}::text
						FROM mutated
						WHERE ${externalId !== undefined}::boolean
						RETURNING *
					),
					external_id_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${externalAuditId}::uuid, ${externalIdAudit.organizationId},
							${externalIdAudit.actorUserId}, ${externalIdAudit.correlationId},
							${externalIdAudit.module}, ${externalIdAudit.entity}, id,
							${externalIdAudit.action}, ${externalIdAudit.changesJson}::jsonb,
							${externalIdAudit.oldValueJson}::jsonb, ${externalIdAudit.newValueJson}::jsonb,
							${externalIdAudit.metadataJson}::jsonb, ${externalIdAudit.ipAddress},
							${externalIdAudit.userAgent}
						FROM external_id_mutated
						RETURNING id
					),
					external_id_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${externalEventId}::uuid, organization_id,
							'master_data.party_external_id.assigned.v1', 'master_data',
							${meta.correlationId}, created_by,
							jsonb_build_object(
								'organizationId', organization_id,
								'entityType', 'party_external_id',
								'entityId', id,
								'parentEntityId', party_id,
								'version', version,
								'actorId', created_by,
								'correlationId', ${meta.correlationId}::text
							), 'pending', 0
						FROM external_id_mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE ${externalId === undefined}::boolean
						OR (
							EXISTS (SELECT 1 FROM external_id_mutated)
							AND EXISTS (SELECT 1 FROM external_id_audited)
							AND EXISTS (SELECT 1 FROM external_id_outboxed)
						)
				`,
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: partyId,
					resultVersion: 1,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok(mapPartySqlRow(row));
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
		meta: MutationMeta,
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
			record.legalName === undefined ? existing.legalName : record.legalName;
		const nextTradingName =
			record.tradingName === undefined
				? existing.tradingName
				: record.tradingName;
		const nextRegistrationNumber =
			record.registrationNumber === undefined
				? existing.registrationNumber
				: record.registrationNumber;
		const nextRegistrationCountryId =
			record.registrationCountryId === undefined
				? existing.registrationCountryId
				: record.registrationCountryId;
		const nextPreferredLanguageId =
			record.preferredLanguageId === undefined
				? existing.preferredLanguageId
				: record.preferredLanguageId;
		const nextDefaultCurrencyId =
			record.defaultCurrencyId === undefined
				? existing.defaultCurrencyId
				: record.defaultCurrencyId;
		const nextVersion = existing.version + 1;
		const preparedPartyAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "party",
			entityId: existing.id,
			oldValue: { version: existing.version },
			newValue: { version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "PARTY_PROFILE_UPDATED",
		});
		if (!preparedPartyAudit.ok) {
			return preparedPartyAudit;
		}
		const partyAudit = preparedPartyAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${partyAudit.organizationId}, ${partyAudit.actorUserId},
							${partyAudit.correlationId}, ${partyAudit.module}, ${partyAudit.entity},
							${partyAudit.entityId}, ${partyAudit.action}, ${partyAudit.changesJson}::jsonb,
							${partyAudit.oldValueJson}::jsonb, ${partyAudit.newValueJson}::jsonb,
							${partyAudit.metadataJson}::jsonb, ${partyAudit.ipAddress}, ${partyAudit.userAgent}
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
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: record.id,
					resultVersion: nextVersion,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Party version conflict");
			}
			return errorResult.ok(mapPartySqlRow(row));
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
		const partyLifecycleAuditInput = {
			action: "UPDATE" as const,
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "party",
			entityId: existing.id,
			oldValue: { status: existing.status, version: existing.version },
			newValue: { status: record.toStatus, version: nextVersion },
			organizationId: existing.organizationId,
		};
		const preparedPartyLifecycleAudit = prepareCoreMasterAudit({
			...partyLifecycleAuditInput,
			reasonCode: "PARTY_LIFECYCLE_TRANSITIONED",
		});
		if (!preparedPartyLifecycleAudit.ok) {
			return preparedPartyLifecycleAudit;
		}
		const partyLifecycleAudit = preparedPartyLifecycleAudit.data;
		const preparedApprovedPartyLifecycleAudit = prepareCoreMasterAudit({
			...partyLifecycleAuditInput,
			reasonCode: "APPROVED_PARTY_LIFECYCLE_TRANSITIONED",
		});
		if (!preparedApprovedPartyLifecycleAudit.ok) {
			return preparedApprovedPartyLifecycleAudit;
		}
		const approvedPartyLifecycleAudit =
			preparedApprovedPartyLifecycleAudit.data;
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
		const preparedChangeRequestAudit = prepareDerivedCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "change_request",
			oldValue: { status: "approved" },
			newValue: { status: "applied" },
			organizationId: record.organizationId,
			reasonCode: "PARTY_CHANGE_REQUEST_APPLIED",
		});
		if (!preparedChangeRequestAudit.ok) {
			return preparedChangeRequestAudit;
		}
		const changeRequestAudit = preparedChangeRequestAudit.data;

		try {
			// Serialize party lifecycle with role transitions. The active-role check
			// runs in the following statement, after this lock has been acquired, so
			// it cannot observe the pre-commit snapshot of a final-role transition.
			const [, rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
					SELECT id
					FROM md_party
					WHERE id = ${record.id}
						AND organization_id = ${record.organizationId}
						AND version = ${record.expectedVersion}
						AND status = ${existing.status}
					FOR UPDATE
				`,
				crId === null
					? transactionSql`
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${partyLifecycleAudit.organizationId},
							${partyLifecycleAudit.actorUserId}, ${partyLifecycleAudit.correlationId},
							${partyLifecycleAudit.module}, ${partyLifecycleAudit.entity},
							${partyLifecycleAudit.entityId}, ${partyLifecycleAudit.action},
							${partyLifecycleAudit.changesJson}::jsonb,
							${partyLifecycleAudit.oldValueJson}::jsonb,
							${partyLifecycleAudit.newValueJson}::jsonb,
							${partyLifecycleAudit.metadataJson}::jsonb,
							${partyLifecycleAudit.ipAddress}, ${partyLifecycleAudit.userAgent}
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
					: transactionSql`
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${approvedPartyLifecycleAudit.organizationId},
							${approvedPartyLifecycleAudit.actorUserId},
							${approvedPartyLifecycleAudit.correlationId},
							${approvedPartyLifecycleAudit.module}, ${approvedPartyLifecycleAudit.entity},
							${approvedPartyLifecycleAudit.entityId}, ${approvedPartyLifecycleAudit.action},
							${approvedPartyLifecycleAudit.changesJson}::jsonb,
							${approvedPartyLifecycleAudit.oldValueJson}::jsonb,
							${approvedPartyLifecycleAudit.newValueJson}::jsonb,
							${approvedPartyLifecycleAudit.metadataJson}::jsonb,
							${approvedPartyLifecycleAudit.ipAddress},
							${approvedPartyLifecycleAudit.userAgent}
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${crAuditId}, ${changeRequestAudit.organizationId},
							${changeRequestAudit.actorUserId}, ${changeRequestAudit.correlationId},
							${changeRequestAudit.module}, ${changeRequestAudit.entity}, id,
							${changeRequestAudit.action}, ${changeRequestAudit.changesJson}::jsonb,
							${changeRequestAudit.oldValueJson}::jsonb,
							${changeRequestAudit.newValueJson}::jsonb,
							${changeRequestAudit.metadataJson}::jsonb,
							${changeRequestAudit.ipAddress}, ${changeRequestAudit.userAgent}
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
								'correlationId', ${meta.correlationId}::text
							),
							'pending', 0
						FROM claimed
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed, claimed, cr_audited, cr_outboxed
				`,
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Party version conflict");
			}
			return errorResult.ok(mapPartySqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to transition party");
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
			return errorResult.fail("CONFLICT", {
				publicMessage: "Party already merged",
			});
		}
		if (source.partyKind !== target.partyKind) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Incompatible party kinds for merge",
			});
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
		const preparedPartyMergeAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "party",
			entityId: target.id,
			oldValue: {
				sourceId: source.id,
				sourceVersion: source.version,
				targetVersion: target.version,
			},
			newValue: {
				survivorId: target.id,
				mergedId: source.id,
				survivorVersion: nextSurvivorVersion,
				consolidation: {
					roles: "reassign_non_colliding_active_retire_colliding",
					addresses: "repoint_to_survivor",
					contacts: "repoint_to_survivor",
				},
			},
			organizationId: record.organizationId,
			reasonCode: "PARTIES_MERGED",
		});
		if (!preparedPartyMergeAudit.ok) {
			return preparedPartyMergeAudit;
		}
		const partyMergeAudit = preparedPartyMergeAudit.data;
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
		const preparedMergeChangeRequestAudit = prepareDerivedCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "change_request",
			oldValue: { status: "approved" },
			newValue: { status: "applied" },
			organizationId: record.organizationId,
			reasonCode: "PARTY_MERGE_CHANGE_REQUEST_APPLIED",
		});
		if (!preparedMergeChangeRequestAudit.ok) {
			return preparedMergeChangeRequestAudit;
		}
		const mergeChangeRequestAudit = preparedMergeChangeRequestAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${partyMergeAudit.organizationId}, ${partyMergeAudit.actorUserId},
							${partyMergeAudit.correlationId}, ${partyMergeAudit.module},
							${partyMergeAudit.entity}, ${partyMergeAudit.entityId},
							${partyMergeAudit.action}, ${partyMergeAudit.changesJson}::jsonb,
							${partyMergeAudit.oldValueJson}::jsonb, ${partyMergeAudit.newValueJson}::jsonb,
							${partyMergeAudit.metadataJson}::jsonb, ${partyMergeAudit.ipAddress},
							${partyMergeAudit.userAgent}
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${crAuditId}, ${mergeChangeRequestAudit.organizationId},
							${mergeChangeRequestAudit.actorUserId},
							${mergeChangeRequestAudit.correlationId},
							${mergeChangeRequestAudit.module}, ${mergeChangeRequestAudit.entity}, id,
							${mergeChangeRequestAudit.action},
							${mergeChangeRequestAudit.changesJson}::jsonb,
							${mergeChangeRequestAudit.oldValueJson}::jsonb,
							${mergeChangeRequestAudit.newValueJson}::jsonb,
							${mergeChangeRequestAudit.metadataJson}::jsonb,
							${mergeChangeRequestAudit.ipAddress}, ${mergeChangeRequestAudit.userAgent}
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
								'correlationId', ${meta.correlationId}::text
							),
							'pending', 0
						FROM claimed
						RETURNING id
					)
					SELECT survivor.* FROM survivor, merged, audited, outboxed, claimed, cr_audited, cr_outboxed
				`,
			]);
			const [survivorRow] = rows;
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
			return errorResult.ok({
				survivor: mapPartySqlRow(survivorRow),
				merged: mergedParty,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to merge parties");
		}
	}

	async getItemGroupById(
		organizationId: string,
		id: string,
	): Promise<Result<ItemGroup | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdItemGroup)
				.where(
					and(
						eq(mdItemGroup.id, id),
						eq(mdItemGroup.organizationId, organizationId),
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapItemGroup(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load item group");
		}
	}

	async getItemGroupByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<ItemGroup | null>> {
		try {
			const [row] = await afendaDatabase.client
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
			return errorResult.ok(row === undefined ? null : mapItemGroup(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load item group by code");
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdItemGroup)
				.where(and(...predicates))
				.orderBy(asc(mdItemGroup.normalizedCode), asc(mdItemGroup.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapItemGroup));
		} catch (error) {
			return failFromPersistence(error, "Failed to list item groups");
		}
	}

	async createItemGroup(
		record: ItemGroupCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
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
		const preparedItemGroupAudit = prepareCoreMasterAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "item_group",
			entityId,
			newValue: {
				code: record.code,
				parentId: record.parentId ?? null,
				status: "draft",
			},
			organizationId: record.organizationId,
			reasonCode: "ITEM_GROUP_CREATED",
		});
		if (!preparedItemGroupAudit.ok) {
			return preparedItemGroupAudit;
		}
		const itemGroupAudit = preparedItemGroupAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${itemGroupAudit.organizationId}, ${itemGroupAudit.actorUserId},
								${itemGroupAudit.correlationId}, ${itemGroupAudit.module}, ${itemGroupAudit.entity},
								${itemGroupAudit.entityId}, ${itemGroupAudit.action},
								${itemGroupAudit.changesJson}::jsonb, ${itemGroupAudit.oldValueJson}::jsonb,
								${itemGroupAudit.newValueJson}::jsonb, ${itemGroupAudit.metadataJson}::jsonb,
								${itemGroupAudit.ipAddress}, ${itemGroupAudit.userAgent}
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
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: entityId,
					resultVersion: 1,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return invalidState("Item group parent must be active");
			}
			return errorResult.ok(mapItemGroupSqlRow(row));
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
		meta: MutationMeta,
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
			record.parentId === undefined ? existing.parentId : record.parentId;
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
		const preparedItemGroupAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "item_group",
			entityId: existing.id,
			oldValue: { parentId: existing.parentId, version: existing.version },
			newValue: { parentId: nextParentId, version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "ITEM_GROUP_UPDATED",
		});
		if (!preparedItemGroupAudit.ok) {
			return preparedItemGroupAudit;
		}
		const itemGroupAudit = preparedItemGroupAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${itemGroupAudit.organizationId}, ${itemGroupAudit.actorUserId},
								${itemGroupAudit.correlationId}, ${itemGroupAudit.module}, ${itemGroupAudit.entity},
								${itemGroupAudit.entityId}, ${itemGroupAudit.action},
								${itemGroupAudit.changesJson}::jsonb, ${itemGroupAudit.oldValueJson}::jsonb,
								${itemGroupAudit.newValueJson}::jsonb, ${itemGroupAudit.metadataJson}::jsonb,
								${itemGroupAudit.ipAddress}, ${itemGroupAudit.userAgent}
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
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: record.id,
					resultVersion: nextVersion,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Item group version conflict");
			}
			return errorResult.ok(mapItemGroupSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to update item group");
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
		const preparedItemGroupLifecycleAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "item_group",
			entityId: existing.id,
			oldValue: { status: existing.status, version: existing.version },
			newValue: { status: record.toStatus, version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "ITEM_GROUP_LIFECYCLE_TRANSITIONED",
		});
		if (!preparedItemGroupLifecycleAudit.ok) {
			return preparedItemGroupLifecycleAudit;
		}
		const itemGroupLifecycleAudit = preparedItemGroupLifecycleAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditId}, ${itemGroupLifecycleAudit.organizationId},
								${itemGroupLifecycleAudit.actorUserId}, ${itemGroupLifecycleAudit.correlationId},
								${itemGroupLifecycleAudit.module}, ${itemGroupLifecycleAudit.entity},
								${itemGroupLifecycleAudit.entityId}, ${itemGroupLifecycleAudit.action},
								${itemGroupLifecycleAudit.changesJson}::jsonb,
								${itemGroupLifecycleAudit.oldValueJson}::jsonb,
								${itemGroupLifecycleAudit.newValueJson}::jsonb,
								${itemGroupLifecycleAudit.metadataJson}::jsonb,
								${itemGroupLifecycleAudit.ipAddress}, ${itemGroupLifecycleAudit.userAgent}
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
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Item group version conflict");
			}
			return errorResult.ok(mapItemGroupSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to transition item group");
		}
	}

	async getItemById(
		organizationId: string,
		id: string,
	): Promise<Result<Item | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdItem)
				.where(
					and(eq(mdItem.id, id), eq(mdItem.organizationId, organizationId)),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapItem(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load item");
		}
	}

	async getItemByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Item | null>> {
		try {
			const [row] = await afendaDatabase.client
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
			return errorResult.ok(row === undefined ? null : mapItem(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load item by code");
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdItem)
				.where(and(...predicates))
				.orderBy(asc(mdItem.normalizedCode), asc(mdItem.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapItem));
		} catch (error) {
			return failFromPersistence(error, "Failed to list items");
		}
	}

	async createItem(
		record: ItemCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
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
			return notFound("Item group not found");
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
		const preparedItemAudit = prepareCoreMasterAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "item",
			entityId,
			newValue: {
				code: record.code,
				itemType: record.itemType,
				trackingPolicy: profile.trackingPolicy,
				sellable: profile.sellable,
				purchasable: profile.purchasable,
				stocked: profile.stocked,
				serviceIndicator: profile.serviceIndicator,
				baseUomId: record.baseUomId,
				itemGroupId: record.itemGroupId,
			},
			organizationId: record.organizationId,
			reasonCode: "ITEM_CREATED",
		});
		if (!preparedItemAudit.ok) {
			return preparedItemAudit;
		}
		const itemAudit = preparedItemAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${itemAudit.organizationId}, ${itemAudit.actorUserId},
							${itemAudit.correlationId}, ${itemAudit.module}, ${itemAudit.entity},
							${itemAudit.entityId}, ${itemAudit.action}, ${itemAudit.changesJson}::jsonb,
							${itemAudit.oldValueJson}::jsonb, ${itemAudit.newValueJson}::jsonb,
							${itemAudit.metadataJson}::jsonb, ${itemAudit.ipAddress}, ${itemAudit.userAgent}
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
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: entityId,
					resultVersion: 1,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return invalidState(
					"Item requires an active item group and active platform UoM",
				);
			}
			return errorResult.ok(mapItemSqlRow(row));
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
		meta: MutationMeta,
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
		const state = resolveItemUpdateState(record, existing);
		const nextName = state.name;
		const nextDescription = state.description;
		const nextItemType = state.itemType;
		const nextBaseUomId = state.baseUomId;
		const nextGroupId = state.itemGroupId;
		const nextProfile = state.profile;
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
			return notFound("Item group not found");
		}
		if (group.data.status !== "active" || group.data.retiredAt !== null) {
			return invalidState("itemGroupId must reference an active item group");
		}
		const nextVersion = existing.version + 1;
		const preparedItemAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "item",
			entityId: existing.id,
			oldValue: {
				itemType: existing.itemType,
				baseUomId: existing.baseUomId,
				itemGroupId: existing.itemGroupId,
				trackingPolicy: existing.trackingPolicy,
				sellable: existing.sellable,
				purchasable: existing.purchasable,
				stocked: existing.stocked,
				serviceIndicator: existing.serviceIndicator,
				version: existing.version,
			},
			newValue: {
				itemType: nextItemType,
				baseUomId: nextBaseUomId,
				itemGroupId: nextGroupId,
				trackingPolicy: nextProfile.trackingPolicy,
				sellable: nextProfile.sellable,
				purchasable: nextProfile.purchasable,
				stocked: nextProfile.stocked,
				serviceIndicator: nextProfile.serviceIndicator,
				version: nextVersion,
			},
			organizationId: existing.organizationId,
			reasonCode: "ITEM_UPDATED",
		});
		if (!preparedItemAudit.ok) {
			return preparedItemAudit;
		}
		const itemAudit = preparedItemAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditId}, ${itemAudit.organizationId}, ${itemAudit.actorUserId},
							${itemAudit.correlationId}, ${itemAudit.module}, ${itemAudit.entity},
							${itemAudit.entityId}, ${itemAudit.action}, ${itemAudit.changesJson}::jsonb,
							${itemAudit.oldValueJson}::jsonb, ${itemAudit.newValueJson}::jsonb,
							${itemAudit.metadataJson}::jsonb, ${itemAudit.ipAddress}, ${itemAudit.userAgent}
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
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: record.id,
					resultVersion: nextVersion,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Item version conflict");
			}
			return errorResult.ok(mapItemSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to update item");
		}
	}

	transitionItem = drizzleTransitionItemWithVariantSideEffect;

	async getWarehouseById(
		organizationId: string,
		id: string,
	): Promise<Result<Warehouse | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdWarehouse)
				.where(
					and(
						eq(mdWarehouse.id, id),
						eq(mdWarehouse.organizationId, organizationId),
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapWarehouse(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load warehouse");
		}
	}

	async getWarehouseByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<Warehouse | null>> {
		try {
			const [row] = await afendaDatabase.client
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
			return errorResult.ok(row === undefined ? null : mapWarehouse(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load warehouse by code");
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdWarehouse)
				.where(and(...predicates))
				.orderBy(asc(mdWarehouse.normalizedCode), asc(mdWarehouse.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapWarehouse));
		} catch (error) {
			return failFromPersistence(error, "Failed to list warehouses");
		}
	}

	async createWarehouse(
		record: WarehouseCreateRecord,
		_ports: MutationPorts,
		meta: MutationMeta,
	): Promise<Result<Warehouse>> {
		if (
			record.addressCountryId !== undefined &&
			record.addressCountryId !== null
		) {
			const country = await this.getRefCountryById(record.addressCountryId);
			if (!country.ok) {
				return country;
			}
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
		const preparedWarehouseAudit = prepareCoreMasterAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "warehouse",
			entityId,
			newValue: {
				code: record.code,
				locationType: record.locationType,
				parentId: record.parentId ?? null,
				status: "draft",
			},
			organizationId: record.organizationId,
			reasonCode: "WAREHOUSE_CREATED",
		});
		if (!preparedWarehouseAudit.ok) {
			return preparedWarehouseAudit;
		}
		const warehouseAudit = preparedWarehouseAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${warehouseAudit.organizationId}, ${warehouseAudit.actorUserId},
								${warehouseAudit.correlationId}, ${warehouseAudit.module}, ${warehouseAudit.entity},
								${warehouseAudit.entityId}, ${warehouseAudit.action}, ${warehouseAudit.changesJson}::jsonb,
								${warehouseAudit.oldValueJson}::jsonb, ${warehouseAudit.newValueJson}::jsonb,
								${warehouseAudit.metadataJson}::jsonb, ${warehouseAudit.ipAddress}, ${warehouseAudit.userAgent}
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
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: entityId,
					resultVersion: 1,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return invalidState("Warehouse parent is not usable or compatible");
			}
			return errorResult.ok(mapWarehouseSqlRow(row));
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
		meta: MutationMeta,
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
		const {
			name: nextName,
			locationType: nextLocationType,
			addressCountryId: nextAddressCountryId,
			addressLine1: nextAddressLine1,
			addressLine2: nextAddressLine2,
			addressCity: nextAddressCity,
			addressRegion: nextAddressRegion,
			addressPostalCode: nextAddressPostalCode,
		} = resolveWarehouseUpdateState(record, existing);
		if (nextAddressCountryId !== null) {
			const country = await this.getRefCountryById(nextAddressCountryId);
			if (!country.ok) {
				return country;
			}
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
			if (!parentCheck.ok) {
				return parentCheck;
			}
		}
		const nextVersion = existing.version + 1;
		const preparedWarehouseAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "warehouse",
			entityId: existing.id,
			oldValue: {
				locationType: existing.locationType,
				version: existing.version,
			},
			newValue: { locationType: nextLocationType, version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "WAREHOUSE_UPDATED",
		});
		if (!preparedWarehouseAudit.ok) {
			return preparedWarehouseAudit;
		}
		const warehouseAudit = preparedWarehouseAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${warehouseAudit.organizationId}, ${warehouseAudit.actorUserId},
								${warehouseAudit.correlationId}, ${warehouseAudit.module}, ${warehouseAudit.entity},
								${warehouseAudit.entityId}, ${warehouseAudit.action}, ${warehouseAudit.changesJson}::jsonb,
								${warehouseAudit.oldValueJson}::jsonb, ${warehouseAudit.newValueJson}::jsonb,
								${warehouseAudit.metadataJson}::jsonb, ${warehouseAudit.ipAddress}, ${warehouseAudit.userAgent}
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
				importRowAppliedQuery(transactionSql, meta, {
					auditId,
					eventId,
					resultEntityId: record.id,
					resultVersion: nextVersion,
				}),
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Warehouse version conflict");
			}
			return errorResult.ok(mapWarehouseSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to update warehouse");
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
		const preparedWarehouseMoveAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "warehouse",
			entityId: existing.id,
			oldValue: { parentId: existing.parentId, version: existing.version },
			newValue: { parentId: record.parentId, version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "WAREHOUSE_MOVED",
		});
		if (!preparedWarehouseMoveAudit.ok) {
			return preparedWarehouseMoveAudit;
		}
		const warehouseMoveAudit = preparedWarehouseMoveAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${warehouseMoveAudit.organizationId}, ${warehouseMoveAudit.actorUserId},
								${warehouseMoveAudit.correlationId}, ${warehouseMoveAudit.module}, ${warehouseMoveAudit.entity},
								${warehouseMoveAudit.entityId}, ${warehouseMoveAudit.action},
								${warehouseMoveAudit.changesJson}::jsonb, ${warehouseMoveAudit.oldValueJson}::jsonb,
								${warehouseMoveAudit.newValueJson}::jsonb, ${warehouseMoveAudit.metadataJson}::jsonb,
								${warehouseMoveAudit.ipAddress}, ${warehouseMoveAudit.userAgent}
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
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Warehouse version conflict");
			}
			return errorResult.ok(mapWarehouseSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to move warehouse");
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
		if (!lifecycle.ok) {
			return lifecycle;
		}
		const eventType = `master_data.warehouse.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const preparedWarehouseLifecycleAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "warehouse",
			entityId: existing.id,
			oldValue: { status: existing.status, version: existing.version },
			newValue: { status: record.toStatus, version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "WAREHOUSE_LIFECYCLE_TRANSITIONED",
		});
		if (!preparedWarehouseLifecycleAudit.ok) {
			return preparedWarehouseLifecycleAudit;
		}
		const warehouseLifecycleAudit = preparedWarehouseLifecycleAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${warehouseLifecycleAudit.organizationId},
								${warehouseLifecycleAudit.actorUserId}, ${warehouseLifecycleAudit.correlationId},
								${warehouseLifecycleAudit.module}, ${warehouseLifecycleAudit.entity},
								${warehouseLifecycleAudit.entityId}, ${warehouseLifecycleAudit.action},
								${warehouseLifecycleAudit.changesJson}::jsonb,
								${warehouseLifecycleAudit.oldValueJson}::jsonb,
								${warehouseLifecycleAudit.newValueJson}::jsonb,
								${warehouseLifecycleAudit.metadataJson}::jsonb,
								${warehouseLifecycleAudit.ipAddress}, ${warehouseLifecycleAudit.userAgent}
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
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Warehouse version conflict");
			}
			return errorResult.ok(mapWarehouseSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to transition warehouse");
		}
	}

	async getPaymentTermById(
		organizationId: string,
		id: string,
	): Promise<Result<PaymentTerm | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdPaymentTerm)
				.where(
					and(
						eq(mdPaymentTerm.id, id),
						eq(mdPaymentTerm.organizationId, organizationId),
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapPaymentTerm(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load payment term");
		}
	}

	async getPaymentTermByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<PaymentTerm | null>> {
		try {
			const [row] = await afendaDatabase.client
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
			return errorResult.ok(row === undefined ? null : mapPaymentTerm(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load payment term by code");
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdPaymentTerm)
				.where(and(...predicates))
				.orderBy(asc(mdPaymentTerm.normalizedCode), asc(mdPaymentTerm.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapPaymentTerm));
		} catch (error) {
			return failFromPersistence(error, "Failed to list payment terms");
		}
	}

	async createPaymentTerm(
		record: PaymentTermCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PaymentTerm>> {
		const ruleResult = normalizePaymentTermRule(record);
		if (!ruleResult.ok) {
			return ruleResult;
		}
		const rule = ruleResult.data;
		if (rule.currencyRestrictionId !== null) {
			const currency = await this.getRefCurrencyById(
				rule.currencyRestrictionId,
			);
			if (!currency.ok) {
				return currency;
			}
			if (currency.data === null || !currency.data.active) {
				return validationFailed(
					"Payment term currency restriction must be active",
				);
			}
		}
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const preparedPaymentTermAudit = prepareCoreMasterAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "payment_term",
			entityId,
			newValue: { code: record.code, ...rule, status: "draft" },
			organizationId: record.organizationId,
			reasonCode: "PAYMENT_TERM_CREATED",
		});
		if (!preparedPaymentTermAudit.ok) {
			return preparedPaymentTermAudit;
		}
		const paymentTermAudit = preparedPaymentTermAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${paymentTermAudit.organizationId}, ${paymentTermAudit.actorUserId},
								${paymentTermAudit.correlationId}, ${paymentTermAudit.module}, ${paymentTermAudit.entity},
								${paymentTermAudit.entityId}, ${paymentTermAudit.action}, ${paymentTermAudit.changesJson}::jsonb,
								${paymentTermAudit.oldValueJson}::jsonb, ${paymentTermAudit.newValueJson}::jsonb,
								${paymentTermAudit.metadataJson}::jsonb, ${paymentTermAudit.ipAddress}, ${paymentTermAudit.userAgent}
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
			]);
			const [row] = rows;
			if (row === undefined) {
				return validationFailed(
					`netDays must be between 0 and ${MAX_PAYMENT_TERM_NET_DAYS}`,
				);
			}
			return errorResult.ok(mapPaymentTermSqlRow(row));
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
		const ruleResult = normalizePaymentTermUpdateRule(record, existing);
		if (!ruleResult.ok) {
			return ruleResult;
		}
		const rule = ruleResult.data;
		if (rule.currencyRestrictionId !== null) {
			const currency = await this.getRefCurrencyById(
				rule.currencyRestrictionId,
			);
			if (!currency.ok) {
				return currency;
			}
			if (currency.data === null || !currency.data.active) {
				return validationFailed(
					"Payment term currency restriction must be active",
				);
			}
		}
		const nextVersion = existing.version + 1;
		const preparedPaymentTermAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "payment_term",
			entityId: existing.id,
			oldValue: {
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
			},
			newValue: {
				...rule,
				version: nextVersion,
			},
			organizationId: existing.organizationId,
			reasonCode: "PAYMENT_TERM_UPDATED",
		});
		if (!preparedPaymentTermAudit.ok) {
			return preparedPaymentTermAudit;
		}
		const paymentTermAudit = preparedPaymentTermAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${paymentTermAudit.organizationId}, ${paymentTermAudit.actorUserId},
								${paymentTermAudit.correlationId}, ${paymentTermAudit.module}, ${paymentTermAudit.entity},
								${paymentTermAudit.entityId}, ${paymentTermAudit.action}, ${paymentTermAudit.changesJson}::jsonb,
								${paymentTermAudit.oldValueJson}::jsonb, ${paymentTermAudit.newValueJson}::jsonb,
								${paymentTermAudit.metadataJson}::jsonb, ${paymentTermAudit.ipAddress}, ${paymentTermAudit.userAgent}
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
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Payment term version conflict");
			}
			return errorResult.ok(mapPaymentTermSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to update payment term");
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
		if (!lifecycle.ok) {
			return lifecycle;
		}
		const eventType = `master_data.payment_term.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const preparedPaymentTermLifecycleAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "payment_term",
			entityId: existing.id,
			oldValue: { status: existing.status, version: existing.version },
			newValue: { status: record.toStatus, version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "PAYMENT_TERM_LIFECYCLE_TRANSITIONED",
		});
		if (!preparedPaymentTermLifecycleAudit.ok) {
			return preparedPaymentTermLifecycleAudit;
		}
		const paymentTermLifecycleAudit = preparedPaymentTermLifecycleAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${paymentTermLifecycleAudit.organizationId},
								${paymentTermLifecycleAudit.actorUserId}, ${paymentTermLifecycleAudit.correlationId},
								${paymentTermLifecycleAudit.module}, ${paymentTermLifecycleAudit.entity},
								${paymentTermLifecycleAudit.entityId}, ${paymentTermLifecycleAudit.action},
								${paymentTermLifecycleAudit.changesJson}::jsonb,
								${paymentTermLifecycleAudit.oldValueJson}::jsonb,
								${paymentTermLifecycleAudit.newValueJson}::jsonb,
								${paymentTermLifecycleAudit.metadataJson}::jsonb,
								${paymentTermLifecycleAudit.ipAddress}, ${paymentTermLifecycleAudit.userAgent}
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
			]);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Payment term version conflict");
			}
			return errorResult.ok(mapPaymentTermSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to transition payment term");
		}
	}

	async getTaxRegistrationById(
		organizationId: string,
		id: string,
	): Promise<Result<TaxRegistration | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdTaxRegistration)
				.where(
					and(
						eq(mdTaxRegistration.id, id),
						eq(mdTaxRegistration.organizationId, organizationId),
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapTaxRegistration(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load tax registration");
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
			const rows = await afendaDatabase.client
				.select()
				.from(mdTaxRegistration)
				.where(and(...predicates))
				.orderBy(
					asc(mdTaxRegistration.normalizedRegistrationNumber),
					asc(mdTaxRegistration.id),
				)
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			return errorResult.ok(rows.map(mapTaxRegistration));
		} catch (error) {
			return failFromPersistence(error, "Failed to list tax registrations");
		}
	}

	findTaxRegistrationsByParty(
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
			const [row] = await afendaDatabase.client
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
			return errorResult.ok(row === undefined ? null : mapTaxRegistration(row));
		} catch (error) {
			return failFromPersistence(
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
		const preparedTaxRegistrationAudit = prepareCoreMasterAudit({
			action: "CREATE",
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "tax_registration",
			entityId,
			newValue: {
				partyId: record.partyId,
				jurisdictionCountryId: record.jurisdictionCountryId,
				registrationType: record.registrationType,
				status: "draft",
			},
			organizationId: record.organizationId,
			reasonCode: "TAX_REGISTRATION_CREATED",
		});
		if (!preparedTaxRegistrationAudit.ok) {
			return preparedTaxRegistrationAudit;
		}
		const taxRegistrationAudit = preparedTaxRegistrationAudit.data;
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
			const [rows] = await afendaDatabase.transaction((transactionSql) => [
				transactionSql`
						WITH mutated AS (
							INSERT INTO md_tax_registration (
								id, organization_id, party_id, jurisdiction_country_id,
								registration_type, registration_number, normalized_registration_number,
								name, status, version, valid_from, valid_to, created_by, updated_by
							)
							SELECT
								${entityId}::uuid, ${record.organizationId}, ${record.partyId}::uuid,
								${record.jurisdictionCountryId}::uuid, ${record.registrationType},
								${record.registrationNumber}, ${record.normalizedRegistrationNumber},
								${record.name}::text, 'draft', 1, ${record.validFrom}::date, ${record.validTo}::date,
								${record.createdBy}, ${record.createdBy}
							FROM md_party AS party
							JOIN ref_country AS country
								ON country.id = ${record.jurisdictionCountryId}::uuid
								AND country.active = true
							WHERE party.id = ${record.partyId}::uuid
								AND party.organization_id = ${record.organizationId}
								AND party.status <> 'retired'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}::uuid, ${taxRegistrationAudit.organizationId},
								${taxRegistrationAudit.actorUserId}, ${taxRegistrationAudit.correlationId},
								${taxRegistrationAudit.module}, ${taxRegistrationAudit.entity},
								${taxRegistrationAudit.entityId}, ${taxRegistrationAudit.action},
								${taxRegistrationAudit.changesJson}::jsonb,
								${taxRegistrationAudit.oldValueJson}::jsonb,
								${taxRegistrationAudit.newValueJson}::jsonb,
								${taxRegistrationAudit.metadataJson}::jsonb,
								${taxRegistrationAudit.ipAddress}, ${taxRegistrationAudit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}::uuid, organization_id, 'master_data.tax_registration.created.v1', 'master_data',
								${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (row === undefined) {
				return taxRegistrationValidityFailure(
					"Party or active jurisdiction country is unavailable",
				);
			}
			return errorResult.ok(mapTaxRegistrationSqlRow(row));
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
		const nextName = record.name === undefined ? existing.name : record.name;
		const nextValidFrom =
			record.validFrom === undefined ? existing.validFrom : record.validFrom;
		const nextValidTo =
			record.validTo === undefined ? existing.validTo : record.validTo;
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
			if (!overlap.ok) {
				return overlap;
			}
			if (overlap.data !== null) {
				return taxRegistrationOverlapConflict();
			}
		}
		const nextVersion = existing.version + 1;
		const preparedTaxRegistrationAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.updatedBy,
			correlationId: meta.correlationId,
			entity: "tax_registration",
			entityId: existing.id,
			oldValue: {
				validFrom: existing.validFrom,
				validTo: existing.validTo,
				version: existing.version,
			},
			newValue: {
				validFrom: nextValidFrom,
				validTo: nextValidTo,
				version: nextVersion,
			},
			organizationId: existing.organizationId,
			reasonCode: "TAX_REGISTRATION_UPDATED",
		});
		if (!preparedTaxRegistrationAudit.ok) {
			return preparedTaxRegistrationAudit;
		}
		const taxRegistrationAudit = preparedTaxRegistrationAudit.data;
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
			const [rows] = await afendaDatabase.transaction(
				(transactionSql) => [
					transactionSql`
						WITH mutated AS (
							UPDATE md_tax_registration
							SET
								name = ${nextName}::text,
								valid_from = ${nextValidFrom}::timestamptz,
								valid_to = ${nextValidTo}::timestamptz,
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
									${nextValidFrom}::timestamptz IS NOT NULL
										AND EXISTS (
											SELECT 1 FROM ref_country AS country
											WHERE country.id = ${existing.jurisdictionCountryId}::uuid
												AND country.active = true
										)
										AND EXISTS (
											SELECT 1 FROM md_party AS party
											WHERE party.id = ${existing.partyId}::uuid
												AND party.organization_id = ${existing.organizationId}
												AND party.status <> 'retired'
										)
										AND NOT EXISTS (
											SELECT 1
											FROM md_tax_registration AS sibling
											WHERE sibling.organization_id = ${existing.organizationId}
												AND sibling.party_id = ${existing.partyId}::uuid
												AND sibling.jurisdiction_country_id = ${existing.jurisdictionCountryId}::uuid
												AND sibling.registration_type = ${existing.registrationType}
												AND sibling.status = 'active'
												AND sibling.deleted_at IS NULL
												AND sibling.id <> ${existing.id}::uuid
												AND sibling.valid_from IS NOT NULL
												AND sibling.valid_from < COALESCE(${nextValidTo}::timestamptz, 'infinity'::timestamptz)
												AND ${nextValidFrom}::timestamptz < COALESCE(sibling.valid_to, 'infinity'::timestamptz)
										)
									)
								)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}::uuid, ${taxRegistrationAudit.organizationId},
								${taxRegistrationAudit.actorUserId}, ${taxRegistrationAudit.correlationId},
								${taxRegistrationAudit.module}, ${taxRegistrationAudit.entity},
								${taxRegistrationAudit.entityId}, ${taxRegistrationAudit.action},
								${taxRegistrationAudit.changesJson}::jsonb,
								${taxRegistrationAudit.oldValueJson}::jsonb,
								${taxRegistrationAudit.newValueJson}::jsonb,
								${taxRegistrationAudit.metadataJson}::jsonb,
								${taxRegistrationAudit.ipAddress}, ${taxRegistrationAudit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}::uuid, organization_id, 'master_data.tax_registration.updated.v1', 'master_data',
								${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
				{ isolationLevel: "Serializable" },
			);
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Tax registration version conflict");
			}
			return errorResult.ok(mapTaxRegistrationSqlRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to update tax registration");
		}
	}

	private async assertTaxRegistrationActivation(
		existing: TaxRegistration,
	): Promise<Result<true>> {
		if (existing.validFrom === null) {
			return invalidState("Active tax registration requires validFrom");
		}
		if (
			isInvalidValidityRange({
				validFrom: existing.validFrom,
				validTo: existing.validTo,
			})
		) {
			return taxRegistrationValidityFailure("validTo must be after validFrom");
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
		if (!overlap.ok) {
			return overlap;
		}
		return overlap.data === null
			? errorResult.ok(true)
			: taxRegistrationOverlapConflict();
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
		if (!lifecycle.ok) {
			return lifecycle;
		}
		if (record.toStatus === "active") {
			const activatable = await this.assertTaxRegistrationActivation(existing);
			if (!activatable.ok) {
				return activatable;
			}
		}
		const eventType = `master_data.tax_registration.${meta.eventSuffix}.v1`;
		const nextVersion = existing.version + 1;
		const preparedTaxRegistrationLifecycleAudit = prepareCoreMasterAudit({
			action: "UPDATE",
			actorUserId: record.actorUserId,
			correlationId: meta.correlationId,
			entity: "tax_registration",
			entityId: existing.id,
			oldValue: { status: existing.status, version: existing.version },
			newValue: { status: record.toStatus, version: nextVersion },
			organizationId: existing.organizationId,
			reasonCode: "TAX_REGISTRATION_LIFECYCLE_TRANSITIONED",
		});
		if (!preparedTaxRegistrationLifecycleAudit.ok) {
			return preparedTaxRegistrationLifecycleAudit;
		}
		const taxRegistrationLifecycleAudit =
			preparedTaxRegistrationLifecycleAudit.data;
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
			const [rows] = await afendaDatabase.transaction(
				(transactionSql) => [
					transactionSql`
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
								entity_id, action, changes, old_value, new_value, metadata, ip_address, user_agent
							)
							SELECT
								${auditId}, ${taxRegistrationLifecycleAudit.organizationId},
								${taxRegistrationLifecycleAudit.actorUserId},
								${taxRegistrationLifecycleAudit.correlationId},
								${taxRegistrationLifecycleAudit.module}, ${taxRegistrationLifecycleAudit.entity},
								${taxRegistrationLifecycleAudit.entityId}, ${taxRegistrationLifecycleAudit.action},
								${taxRegistrationLifecycleAudit.changesJson}::jsonb,
								${taxRegistrationLifecycleAudit.oldValueJson}::jsonb,
								${taxRegistrationLifecycleAudit.newValueJson}::jsonb,
								${taxRegistrationLifecycleAudit.metadataJson}::jsonb,
								${taxRegistrationLifecycleAudit.ipAddress},
								${taxRegistrationLifecycleAudit.userAgent}
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
			const [row] = rows;
			if (row === undefined) {
				return versionConflict("Tax registration version conflict");
			}
			return errorResult.ok(mapTaxRegistrationSqlRow(row));
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to transition tax registration",
			);
		}
	}

	private async loadPartyForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<Party>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdParty)
				.where(
					afendaDatabase.tenancy.entity(
						{ id: mdParty.id, organizationId: mdParty.organizationId },
						{ id, organizationId },
					),
				)
				.limit(1);
			if (row === undefined) {
				return notFound("Party not found");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Party version conflict");
			}
			return errorResult.ok(mapParty(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load party for mutation");
		}
	}

	private async loadItemGroupForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<ItemGroup>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdItemGroup)
				.where(
					afendaDatabase.tenancy.entity(
						{ id: mdItemGroup.id, organizationId: mdItemGroup.organizationId },
						{ id, organizationId },
					),
				)
				.limit(1);
			if (row === undefined) {
				return notFound("Item group not found");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Item group version conflict");
			}
			return errorResult.ok(mapItemGroup(row));
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to load item group for mutation",
			);
		}
	}

	private async loadItemForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<Item>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdItem)
				.where(
					afendaDatabase.tenancy.entity(
						{ id: mdItem.id, organizationId: mdItem.organizationId },
						{ id, organizationId },
					),
				)
				.limit(1);
			if (row === undefined) {
				return notFound("Item not found");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Item version conflict");
			}
			return errorResult.ok(mapItem(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load item for mutation");
		}
	}

	private async loadWarehouseForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<Warehouse>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdWarehouse)
				.where(
					afendaDatabase.tenancy.entity(
						{ id: mdWarehouse.id, organizationId: mdWarehouse.organizationId },
						{ id, organizationId },
					),
				)
				.limit(1);
			if (row === undefined) {
				return notFound("Warehouse not found");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Warehouse version conflict");
			}
			return errorResult.ok(mapWarehouse(row));
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to load warehouse for mutation",
			);
		}
	}

	private async loadPaymentTermForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<PaymentTerm>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdPaymentTerm)
				.where(
					afendaDatabase.tenancy.entity(
						{
							id: mdPaymentTerm.id,
							organizationId: mdPaymentTerm.organizationId,
						},
						{ id, organizationId },
					),
				)
				.limit(1);
			if (row === undefined) {
				return notFound("Payment term not found");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Payment term version conflict");
			}
			return errorResult.ok(mapPaymentTerm(row));
		} catch (error) {
			return failFromPersistence(
				error,
				"Failed to load payment term for mutation",
			);
		}
	}

	private async loadTaxRegistrationForMutation(
		organizationId: string,
		id: string,
		expectedVersion: number,
	): Promise<Result<TaxRegistration>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdTaxRegistration)
				.where(
					afendaDatabase.tenancy.entity(
						{
							id: mdTaxRegistration.id,
							organizationId: mdTaxRegistration.organizationId,
						},
						{ id, organizationId },
					),
				)
				.limit(1);
			if (row === undefined) {
				return notFound("Tax registration not found");
			}
			if (row.version !== expectedVersion) {
				return versionConflict("Tax registration version conflict");
			}
			return errorResult.ok(mapTaxRegistration(row));
		} catch (error) {
			return failFromPersistence(
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
			const [row] = await afendaDatabase.client
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
				return errorResult.ok(null);
			}
			return errorResult.ok(mapImportBatchRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load import batch");
		}
	}

	async claimImportBatch(
		record: ImportBatchClaimRecord,
	): Promise<Result<ImportBatchClaimResult>> {
		try {
			const transactionResults = await afendaDatabase.transaction(
				(transactionSql) => [
					transactionSql`
						INSERT INTO md_import_batch (
							id, organization_id, idempotency_key, payload_hash,
							operation_type, entity_type, source_system, mode, status,
							report, actor_user_id, correlation_id
						) VALUES (
							${record.id}, ${record.organizationId}, ${record.idempotencyKey},
							${record.payloadHash}, ${record.operationType}, ${record.entityType},
							${record.sourceSystem}, ${record.mode}, 'claimed', '{}'::jsonb,
							${record.actorUserId}, ${record.correlationId}
						)
						ON CONFLICT (organization_id, idempotency_key) DO NOTHING
						RETURNING id
					`,
					...record.rows.map(
						(row) => transactionSql`
							INSERT INTO md_import_batch_row (
								id, organization_id, batch_id, source_row_number,
								payload_hash, normalized_payload, status
							)
							SELECT
								${row.id}, ${record.organizationId}, ${record.id},
								${row.sourceRowNumber}, ${row.payloadHash},
								${JSON.stringify(row.normalizedPayload)}::jsonb, 'pending'
							WHERE EXISTS (
								SELECT 1 FROM md_import_batch
								WHERE id = ${record.id}
									AND organization_id = ${record.organizationId}
									AND payload_hash = ${record.payloadHash}
							)
							ON CONFLICT (organization_id, batch_id, source_row_number)
							DO NOTHING
						`,
					),
				],
			);
			const claimed = isImportClaimResult(transactionResults[0]);
			const batch = await this.getImportBatchByIdempotencyKey(
				record.organizationId,
				record.idempotencyKey,
			);
			if (!batch.ok) {
				return batch;
			}
			if (batch.data === null) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return errorResult.ok({
				kind: claimed ? "claimed" : "existing",
				batch: batch.data,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to claim import batch");
		}
	}

	async acquireImportBatchLease(
		record: ImportBatchLeaseRequest,
	): Promise<Result<ImportBatchLeaseResult>> {
		try {
			const [row] = await afendaDatabase.client
				.update(mdImportBatch)
				.set({
					status: "applying",
					leaseOwner: record.leaseOwner,
					leaseExpiresAt: record.leaseExpiresAt,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(mdImportBatch.organizationId, record.organizationId),
						eq(mdImportBatch.id, record.batchId),
						sql`(
							${mdImportBatch.status} IN ('claimed', 'approved', 'failed', 'partially_applied')
							OR (
								${mdImportBatch.status} = 'applying'
								AND ${mdImportBatch.leaseExpiresAt} <= now()
							)
						)`,
					),
				)
				.returning();
			if (row !== undefined) {
				return errorResult.ok({
					kind: "acquired",
					batch: mapImportBatchRow(row),
				});
			}
			const current = await this.getImportBatchById(
				record.organizationId,
				record.batchId,
			);
			if (!current.ok) {
				return current;
			}
			if (current.data === null) {
				return notFound("Import batch not found");
			}
			return errorResult.ok({
				kind: current.data.status === "applied" ? "completed" : "busy",
				batch: current.data,
			});
		} catch (error) {
			return failFromPersistence(error, "Failed to acquire import batch lease");
		}
	}

	async listImportBatchRows(
		organizationId: string,
		batchId: string,
	): Promise<Result<ImportBatchRowRecord[]>> {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(mdImportBatchRow)
				.where(
					and(
						eq(mdImportBatchRow.organizationId, organizationId),
						eq(mdImportBatchRow.batchId, batchId),
					),
				)
				.orderBy(asc(mdImportBatchRow.sourceRowNumber));
			return errorResult.ok(rows.map(mapImportBatchRowRecord));
		} catch (error) {
			return failFromPersistence(error, "Failed to list import batch rows");
		}
	}

	async completeImportBatch(
		record: ImportBatchCompletionRecord,
	): Promise<Result<ImportBatchRecord>> {
		try {
			const transactionResults = await afendaDatabase.transaction(
				(transactionSql) => [
					...record.rows.map(
						(row) => transactionSql`
						UPDATE md_import_batch_row
						SET
							intended_operation = ${row.intendedOperation},
							matched_entity_id = ${row.matchedEntityId},
							status = ${row.status},
							error_code = ${row.errorCode},
							error_details = ${
								row.errorDetails === null
									? null
									: JSON.stringify(row.errorDetails)
							}::jsonb,
							result_entity_id = ${row.resultEntityId},
							result_version = ${row.resultVersion},
							lease_owner = NULL,
							lease_expires_at = NULL,
							completed_at = now(),
							updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND batch_id = ${record.batchId}
							AND source_row_number = ${row.sourceRowNumber}
							AND (status <> 'applied' OR ${row.status} = 'applied')
							AND EXISTS (
								SELECT 1 FROM md_import_batch
								WHERE organization_id = ${record.organizationId}
									AND id = ${record.batchId}
									AND lease_owner = ${record.leaseOwner}
							)
					`,
					),
					transactionSql`
					UPDATE md_import_batch
					SET
						status = ${record.status},
						report = ${JSON.stringify(record.report)}::jsonb,
						lease_owner = NULL,
						lease_expires_at = NULL,
						completed_at = now(),
						updated_at = now()
					WHERE organization_id = ${record.organizationId}
						AND id = ${record.batchId}
						AND lease_owner = ${record.leaseOwner}
					RETURNING id
				`,
				],
			);
			if (!isImportClaimResult(transactionResults[record.rows.length])) {
				return versionConflict("Import batch lease was lost");
			}
			const completed = await this.getImportBatchById(
				record.organizationId,
				record.batchId,
			);
			if (!completed.ok) {
				return completed;
			}
			if (completed.data === null) {
				return notFound("Import batch not found");
			}
			return errorResult.ok(completed.data);
		} catch (error) {
			return failFromPersistence(error, "Failed to complete import batch");
		}
	}

	private async getImportBatchById(
		organizationId: string,
		batchId: string,
	): Promise<Result<ImportBatchRecord | null>> {
		try {
			const [row] = await afendaDatabase.client
				.select()
				.from(mdImportBatch)
				.where(
					afendaDatabase.tenancy.entity(
						{
							id: mdImportBatch.id,
							organizationId: mdImportBatch.organizationId,
						},
						{ id: batchId, organizationId },
					),
				)
				.limit(1);
			return errorResult.ok(row === undefined ? null : mapImportBatchRow(row));
		} catch (error) {
			return failFromPersistence(error, "Failed to load import batch");
		}
	}
}

export interface DrizzleMasterDataStoreOptions {
	/** Injectable UUID source for deterministic transaction-failure verification. */
	generateId?: () => string;
}

export function createDrizzleMasterDataStore(
	options: DrizzleMasterDataStoreOptions = {},
): MasterDataStore {
	return new DrizzleMasterDataStore(options);
}
