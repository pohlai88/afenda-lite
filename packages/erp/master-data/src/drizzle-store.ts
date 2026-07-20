import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	eq,
	isNull,
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
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";
import type { MasterFailureDetails } from "./contracts/reasons";
import {
	drizzleCreateChangeRequest,
	drizzleGetChangeRequestById,
	drizzleListChangeRequests,
	drizzleTransitionChangeRequest,
} from "./drizzle-change-request";
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
	drizzleFindItemByExternalId,
	drizzleFindPartyByExternalId,
	drizzleFindWarehouseByExternalId,
	drizzleListItemUoms,
	drizzleListPartyAddresses,
	drizzleListPartyContacts,
	drizzleListPartyRoles,
	drizzleTransitionPartyRole,
	drizzleUpdatePartyAddress,
	drizzleUpdatePartyContact,
} from "./drizzle-extension-mutations";
import {
	drizzleAddItemTemplateAttribute,
	drizzleAddItemTemplateAttributeOption,
	drizzleCreateItemTemplate,
	drizzleCreateItemVariant,
	drizzleGetItemTemplateByCode,
	drizzleGetItemTemplateById,
	drizzleGetItemVariantById,
	drizzleListItemTemplateAttributeOptions,
	drizzleListItemTemplateAttributes,
	drizzleListItemTemplates,
	drizzleListItemVariantsByTemplate,
	drizzleTransitionItemTemplate,
	drizzleTransitionItemWithVariantSideEffect,
	drizzleUpdateItemTemplate,
} from "./drizzle-variant-mutations";
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
} from "./map-row";
import type { MutationPorts } from "./ports";
import type {
	ItemCreateRecord,
	ItemGroupCreateRecord,
	ItemGroupUpdateRecord,
	ItemUpdateRecord,
	LifecycleRecord,
	ListFilter,
	MasterDataStore,
	PartyCreateRecord,
	PartyMergeRecord,
	PartyUpdateRecord,
	PaymentTermCreateRecord,
	PaymentTermUpdateRecord,
	TaxRegistrationCreateRecord,
	TaxRegistrationListFilter,
	TaxRegistrationUpdateRecord,
	WarehouseCreateRecord,
	WarehouseMoveRecord,
	WarehouseUpdateRecord,
} from "./store";
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
} from "./types";

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

function eventPayloadJson(input: {
	organizationId: string;
	entityType: string;
	entityId: string;
	code: string;
	version: number;
	actorId: string;
	correlationId: string;
}): string {
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
		status: row.status,
		version: row.version,
		baseUomId: row.base_uom_id,
		itemGroupId: row.item_group_id,
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
			return validationFailed("Item group parent would create a cycle");
		}
		if (seen.has(cursor)) {
			return validationFailed("Item group parent would create a cycle");
		}
		seen.add(cursor);
		const [row] = await db
			.select({
				id: mdItemGroup.id,
				organizationId: mdItemGroup.organizationId,
				parentId: mdItemGroup.parentId,
			})
			.from(mdItemGroup)
			.where(eq(mdItemGroup.id, cursor))
			.limit(1);
		if (row === undefined || row.organizationId !== organizationId) {
			return crossOrg("Item group parent must exist in the same organization");
		}
		cursor = row.parentId;
	}
	return ok(true);
}

async function assertWarehouseParent(
	organizationId: string,
	selfId: string | null,
	parentId: string | null,
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
		const [row] = await db
			.select({
				id: mdWarehouse.id,
				organizationId: mdWarehouse.organizationId,
				parentId: mdWarehouse.parentId,
			})
			.from(mdWarehouse)
			.where(eq(mdWarehouse.id, cursor))
			.limit(1);
		if (row === undefined || row.organizationId !== organizationId) {
			return crossOrg("Warehouse parent must exist in the same organization");
		}
		cursor = row.parentId;
	}
	return ok(true);
}

/**
 * Production MasterDataStore.
 * Mutations use Neon HTTP `runNeonHttpTransaction` CTE so entity + audit +
 * outbox commit in one round-trip (neon-http has no interactive TX).
 */
export class DrizzleMasterDataStore implements MasterDataStore {
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
		record: LifecycleRecord,
		_ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
			const [rows] = await runNeonHttpTransaction<[PartySqlRow[]]>((sql) => [
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
							AND EXISTS (SELECT 1 FROM claimed)
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
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party",
			entityId: target.id,
			code: target.code,
			version: nextSurvivorVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
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
					moved_ext AS (
						UPDATE md_party_external_id e
						SET party_id = ${target.id}
						WHERE e.party_id = ${source.id}
							AND e.organization_id = ${record.organizationId}
							AND NOT EXISTS (
								SELECT 1
								FROM md_party_external_id o
								WHERE o.organization_id = e.organization_id
									AND o.system = e.system
									AND o.namespace = e.namespace
									AND o.external_id = e.external_id
									AND o.party_id = ${target.id}
							)
						RETURNING e.id
					),
					former_code AS (
						INSERT INTO md_party_external_id (
							id, organization_id, party_id, system, namespace, external_id,
							version, created_by, updated_by
						)
						SELECT
							${formerExtId}, ${record.organizationId}, ${target.id},
							'afenda.former_code', '', ${source.code}, 1,
							${record.actorUserId}, ${record.actorUserId}
						WHERE NOT EXISTS (
							SELECT 1 FROM md_party_external_id o
							WHERE o.organization_id = ${record.organizationId}
								AND o.system = 'afenda.former_code'
								AND o.namespace = ''
								AND o.external_id = ${source.code}
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
						WITH mutated AS (
							INSERT INTO md_item_group (
								id, organization_id, code, normalized_code, name, parent_id,
								status, version, created_by, updated_by
							) VALUES (
								${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
								${record.name}, ${record.parentId ?? null}, 'draft', 1,
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
				return fail("INTERNAL_ERROR", "Item group create returned no row");
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
			entityType: "item_group",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ItemGroupSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
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
								${eventId}, organization_id, 'master_data.item_group.updated.v1', 'master_data',
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
		record: LifecycleRecord,
		_ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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

	async listItems(filter: ListFilter): Promise<Result<Item[]>> {
		try {
			const predicates = [eq(mdItem.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				predicates.push(eq(mdItem.status, filter.status));
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
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
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
					WITH mutated AS (
						INSERT INTO md_item (
							id, organization_id, code, normalized_code, name, item_type,
							base_uom_id, item_group_id, status, version, created_by, updated_by
						) VALUES (
							${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.name}, ${record.itemType}, ${record.baseUomId}, ${record.itemGroupId},
							'draft', 1, ${record.createdBy}, ${record.createdBy}
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
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Item create returned no row");
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
		const nextItemType = record.itemType ?? existing.itemType;
		const nextBaseUomId = record.baseUomId ?? existing.baseUomId;
		const nextGroupId = record.itemGroupId ?? existing.itemGroupId;
		const uom = await this.getRefUomById(nextBaseUomId);
		if (!uom.ok) {
			return uom;
		}
		if (uom.data === null) {
			return validationFailed("baseUomId is not a known platform UoM");
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
							item_type = ${nextItemType},
							base_uom_id = ${nextBaseUomId},
							item_group_id = ${nextGroupId},
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
		const parentCheck = await assertWarehouseParent(
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
						WITH mutated AS (
							INSERT INTO md_warehouse (
								id, organization_id, code, normalized_code, name, location_type,
								parent_id, status, version, created_by, updated_by
							) VALUES (
								${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
								${record.name}, ${record.locationType}, ${record.parentId ?? null},
								'draft', 1, ${record.createdBy}, ${record.createdBy}
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
				return fail("INTERNAL_ERROR", "Warehouse create returned no row");
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
		const parentCheck = await assertWarehouseParent(
			record.organizationId,
			existing.id,
			record.parentId,
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
						WITH mutated AS (
							UPDATE md_warehouse
							SET
								parent_id = ${record.parentId},
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
		record: LifecycleRecord,
		_ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("code", null, record.code);
		const newValueJson = valueSnapshotJson({
			code: record.code,
			netDays: record.netDays,
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
								status, version, created_by, updated_by
							) VALUES (
								${entityId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
								${record.name}, ${record.netDays},
								'draft', 1, ${record.createdBy}, ${record.createdBy}
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
				return fail("INTERNAL_ERROR", "Payment term create returned no row");
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
		const nextName = record.name ?? existing.name;
		const nextNetDays = record.netDays ?? existing.netDays;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson("name", existing.name, nextName);
		const oldValueJson = valueSnapshotJson({
			name: existing.name,
			netDays: existing.netDays,
			version: existing.version,
		});
		const newValueJson = valueSnapshotJson({
			name: nextName,
			netDays: nextNetDays,
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
								net_days = ${nextNetDays},
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
		record: LifecycleRecord,
		_ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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

	async createTaxRegistration(
		record: TaxRegistrationCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<TaxRegistration>> {
		const entityId = randomUUID();
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson(
			"registrationNumber",
			null,
			record.registrationNumber,
		);
		const newValueJson = valueSnapshotJson({
			partyId: record.partyId,
			registrationType: record.registrationType,
			normalizedRegistrationNumber: record.normalizedRegistrationNumber,
			status: "draft",
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "tax_registration",
			entityId,
			code: record.normalizedRegistrationNumber,
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
							) VALUES (
								${entityId}, ${record.organizationId}, ${record.partyId},
								${record.jurisdictionCountryId}, ${record.registrationType},
								${record.registrationNumber}, ${record.normalizedRegistrationNumber},
								${record.name}, 'draft', 1, ${record.validFrom}, ${record.validTo},
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
				return fail(
					"INTERNAL_ERROR",
					"Tax registration create returned no row",
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
		const nextName = record.name !== undefined ? record.name : existing.name;
		const nextValidFrom =
			record.validFrom !== undefined ? record.validFrom : existing.validFrom;
		const nextValidTo =
			record.validTo !== undefined ? record.validTo : existing.validTo;
		const nextVersion = existing.version + 1;
		const changesJson = fieldChangeJson("name", existing.name, nextName);
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
			code: existing.normalizedRegistrationNumber,
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
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Tax registration version conflict");
			}
			return ok(mapTaxRegistrationSqlRow(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to update tax registration");
		}
	}

	async transitionTaxRegistration(
		record: LifecycleRecord,
		_ports: MutationPorts,
		meta: { correlationId: string; eventSuffix: string },
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
			code: existing.normalizedRegistrationNumber,
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
			);
			const row = rows[0];
			if (row === undefined) {
				return versionConflict("Tax registration version conflict");
			}
			return ok(mapTaxRegistrationSqlRow(row));
		} catch (error) {
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
	createPartyRole = drizzleCreatePartyRole;
	transitionPartyRole = drizzleTransitionPartyRole;
	listPartyAddresses = drizzleListPartyAddresses;
	createPartyAddress = drizzleCreatePartyAddress;
	updatePartyAddress = drizzleUpdatePartyAddress;
	listPartyContacts = drizzleListPartyContacts;
	createPartyContact = drizzleCreatePartyContact;
	updatePartyContact = drizzleUpdatePartyContact;
	createPartyExternalId = drizzleCreatePartyExternalId;
	findPartyByExternalId = drizzleFindPartyByExternalId;
	createPartyRelationship = drizzleCreatePartyRelationship;
	listItemUoms = drizzleListItemUoms;
	createItemUom = drizzleCreateItemUom;
	createItemBarcode = drizzleCreateItemBarcode;
	createItemExternalId = drizzleCreateItemExternalId;
	findItemByExternalId = drizzleFindItemByExternalId;
	createItemAlias = drizzleCreateItemAlias;
	findItemByAlias = drizzleFindItemByAlias;
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
	listItemTemplateAttributeOptions = drizzleListItemTemplateAttributeOptions;
	addItemTemplateAttribute = drizzleAddItemTemplateAttribute;
	addItemTemplateAttributeOption = drizzleAddItemTemplateAttributeOption;
	getItemVariantById = drizzleGetItemVariantById;
	listItemVariantsByTemplate = drizzleListItemVariantsByTemplate;
	createItemVariant = drizzleCreateItemVariant;
}

export function createDrizzleMasterDataStore(): MasterDataStore {
	return new DrizzleMasterDataStore();
}
