/**
 * Same-TX CTE helpers for aggregate extension mutations.
 * Neon HTTP: entity + audit + outbox in one round-trip.
 */
import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	eq,
	isNull,
	mdItem,
	mdItemAlias,
	mdItemBarcode,
	mdItemExternalId,
	mdItemUom,
	mdParty,
	mdPartyAddress,
	mdPartyContact,
	mdPartyExternalId,
	mdPartyRelationship,
	mdPartyRole,
	mdWarehouse,
	mdWarehouseExternalId,
	or,
	refCountry,
	refUom,
	refUomDimension,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";
import type { MasterFailureDetails } from "../../../../contracts/reasons";
import type { MutationPorts } from "../../../../ports";
import type {
	Item,
	ItemAlias,
	ItemBarcode,
	ItemExternalId,
	ItemUom,
	Party,
	PartyAddress,
	PartyContact,
	PartyExternalId,
	PartyRelationship,
	PartyRelationshipDirection,
	PartyRelationshipType,
	PartyRole,
	PartyRoleCode,
	Warehouse,
	WarehouseExternalId,
} from "../../../../types";
import {
	PARTY_RELATIONSHIP_DIRECTIONS,
	PARTY_RELATIONSHIP_TYPES,
} from "../../../../types";
import {
	mapItem,
	mapParty,
	mapWarehouse,
} from "../../../core-organization-masters/map-row";
import {
	assertExtensionTransitionReason,
	assertStandardChildLifecycleStatus,
	resolveExtensionLifecycleTransition,
} from "../../extension-lifecycle";
import {
	createExtensionEventPayload,
	EXTENSION_EVENT_TYPES,
	type ExtensionEventPayload,
	extensionEventClassification,
	type PartyRoleLifecycleEventSuffix,
	partyRoleLifecycleEventType,
} from "../../extension-transaction-contract";
import { assertExpectedExtensionVersion } from "../../extension-version-cas";
import {
	normalizeBarcodePackQuantity,
	normalizeItemBarcode,
} from "../../item-barcode-policy";
import {
	assertItemUomCompatibility,
	normalizeItemUomConversionFactor,
} from "../../item-uom-policy";
import type {
	ExtensionListPage,
	ItemAliasCreateRecord,
	ItemAliasListFilter,
	ItemAliasLookup,
	ItemAliasSearchFilter,
	ItemBarcodeCreateRecord,
	ItemBarcodeLookup,
	ItemExternalIdCreateRecord,
	ItemExternalIdLookup,
	ItemUomCompatibilityContext,
	ItemUomCompatibilityContextFilter,
	ItemUomCreateRecord,
	ItemUomDefaultFilter,
	ItemUomListFilter,
	ParentListFilter,
	PartyAddressCreateRecord,
	PartyAddressUpdateRecord,
	PartyContactCreateRecord,
	PartyContactUpdateRecord,
	PartyContactVerificationRecord,
	PartyExternalIdCreateRecord,
	PartyExternalIdLookup,
	PartyRelationshipCreateRecord,
	PartyRelationshipListFilter,
	PartyRoleCreateRecord,
	PartyRoleLifecycleContext,
	PartyRoleLifecycleRecord,
	PartyRoleListFilter,
	PartyRoleUpdateRecord,
	WarehouseExternalIdCreateRecord,
} from "../../store";

function parsePartyRelationshipDirection(
	value: string,
): PartyRelationshipDirection | null {
	for (const candidate of PARTY_RELATIONSHIP_DIRECTIONS) {
		if (candidate === value) return candidate;
	}
	return null;
}

function parsePartyRelationshipType(
	value: string,
): PartyRelationshipType | null {
	for (const candidate of PARTY_RELATIONSHIP_TYPES) {
		if (candidate === value) {
			return candidate;
		}
	}
	return null;
}

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

function mapWriteError(
	error: unknown,
	uniqueMessage: string,
	fallbackMessage: string,
	reason: MasterFailureDetails["reason"] = "MASTER_CODE_CONFLICT",
): Result<never> {
	if (isUniqueViolation(error)) {
		return fail("CONFLICT", uniqueMessage, {
			reason,
		} satisfies MasterFailureDetails);
	}
	return failFromUnknown(error, fallbackMessage);
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

function eventPayloadJson(input: ExtensionEventPayload): string {
	return JSON.stringify(createExtensionEventPayload(input));
}

async function requireUsablePartyMutationParent(
	organizationId: string,
	partyId: string,
): Promise<Result<true>> {
	const [party] = await db
		.select({
			status: mdParty.status,
			retiredAt: mdParty.retiredAt,
			mergedIntoId: mdParty.mergedIntoId,
		})
		.from(mdParty)
		.where(
			and(eq(mdParty.organizationId, organizationId), eq(mdParty.id, partyId)),
		)
		.limit(1);
	if (party === undefined) {
		return fail("NOT_FOUND", "Party not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	if (
		party.status === "retired" ||
		party.retiredAt !== null ||
		party.mergedIntoId !== null
	) {
		return fail("CONFLICT", "Party cannot accept extension mutations", {
			reason: "MASTER_INVALID_STATE",
		} satisfies MasterFailureDetails);
	}
	return ok(true);
}

async function requireActiveAddressCountry(
	countryId: string,
): Promise<Result<true>> {
	const [country] = await db
		.select({ active: refCountry.active })
		.from(refCountry)
		.where(eq(refCountry.id, countryId))
		.limit(1);
	if (country === undefined) {
		return fail("BAD_REQUEST", "Referenced country does not exist", {
			reason: "MASTER_VALIDATION_FAILED",
			field: "countryId",
		} satisfies MasterFailureDetails);
	}
	if (!country.active) {
		return fail("CONFLICT", "New active addresses require an active country", {
			reason: "MASTER_INVALID_STATE",
			field: "countryId",
		} satisfies MasterFailureDetails);
	}
	return ok(true);
}

async function requireUsableItemMutationParent(
	organizationId: string,
	itemId: string,
): Promise<Result<true>> {
	const [item] = await db
		.select({ status: mdItem.status, retiredAt: mdItem.retiredAt })
		.from(mdItem)
		.where(
			and(eq(mdItem.organizationId, organizationId), eq(mdItem.id, itemId)),
		)
		.limit(1);
	if (item === undefined) {
		return fail("NOT_FOUND", "Item not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	if (item.status === "retired" || item.retiredAt !== null) {
		return fail("CONFLICT", "Item cannot accept extension mutations", {
			reason: "MASTER_INVALID_STATE",
		} satisfies MasterFailureDetails);
	}
	return ok(true);
}

type WithOptionalArchive<
	T extends { archivedAt: unknown; archivedBy: unknown },
> = Omit<T, "archivedAt" | "archivedBy"> &
	Partial<Pick<T, "archivedAt" | "archivedBy">>;

type WithOptionalExtensionLifecycle<
	T extends { status: unknown; archivedAt: unknown; archivedBy: unknown },
> = Omit<T, "status" | "archivedAt" | "archivedBy"> &
	Partial<Pick<T, "status" | "archivedAt" | "archivedBy">>;

function mapPartyRole(
	row: WithOptionalArchive<typeof mdPartyRole.$inferSelect>,
): PartyRole {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		roleCode: row.roleCode as PartyRoleCode,
		status: assertStandardChildLifecycleStatus(row.status),
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyAddress(
	row: WithOptionalExtensionLifecycle<typeof mdPartyAddress.$inferSelect>,
): PartyAddress {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		addressType: row.addressType as PartyAddress["addressType"],
		purpose: row.purpose as PartyAddress["purpose"],
		line1: row.line1,
		line2: row.line2,
		line3: row.line3,
		city: row.city,
		administrativeArea: row.administrativeArea,
		postalCode: row.postalCode,
		countryId: row.countryId,
		attention: row.attention,
		isPrimary: row.isPrimary,
		validationStatus: row.validationStatus as PartyAddress["validationStatus"],
		version: row.version,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: row.status as PartyAddress["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyContact(
	row: WithOptionalExtensionLifecycle<typeof mdPartyContact.$inferSelect>,
): PartyContact {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		contactType: row.contactType as PartyContact["contactType"],
		value: row.value,
		normalizedValue: row.normalizedValue,
		label: row.label,
		purpose: row.purpose,
		isPrimary: row.isPrimary,
		verificationStatus:
			row.verificationStatus as PartyContact["verificationStatus"],
		verifiedAt: row.verifiedAt,
		version: row.version,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: row.status as PartyContact["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyExternalIdRow(
	row: WithOptionalExtensionLifecycle<typeof mdPartyExternalId.$inferSelect>,
): PartyExternalId {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		sourceSystem: row.sourceSystem,
		externalIdType: row.externalIdType,
		externalValue: row.externalValue,
		normalizedValue: row.normalizedValue,
		caseSensitivity: row.caseSensitivity as PartyExternalId["caseSensitivity"],
		isPrimary: row.isPrimary,
		status: row.status as PartyExternalId["status"],
		version: row.version,
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyRelationshipRow(
	row: WithOptionalArchive<typeof mdPartyRelationship.$inferSelect>,
): Result<PartyRelationship> {
	const relationshipType = parsePartyRelationshipType(row.relationshipType);
	const direction = parsePartyRelationshipDirection(row.direction);
	if (relationshipType === null || direction === null) {
		return fail(
			"INTERNAL_ERROR",
			"Stored party relationship type is not in the controlled catalog",
			{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
		);
	}
	return ok({
		id: row.id,
		organizationId: row.organizationId,
		sourcePartyId: row.sourcePartyId,
		targetPartyId: row.targetPartyId,
		relationshipType,
		direction,
		status: row.status as PartyRelationship["status"],
		version: row.version,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapItemUomRow(
	row: WithOptionalExtensionLifecycle<typeof mdItemUom.$inferSelect>,
): Result<ItemUom> {
	return ok({
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		alternateUomId: row.alternateUomId,
		conversionFactor: String(row.conversionFactor),
		roundingScale: row.roundingScale,
		isPurchaseUom: row.isPurchaseUom,
		isSalesUom: row.isSalesUom,
		isInventoryUom: row.isInventoryUom,
		isDefaultPurchaseUom: row.isDefaultPurchaseUom,
		isDefaultSalesUom: row.isDefaultSalesUom,
		compatibilityMode: row.compatibilityMode as ItemUom["compatibilityMode"],
		packagingApprovalReference: row.packagingApprovalReference,
		status: row.status as ItemUom["status"],
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapItemBarcodeRow(
	row: WithOptionalExtensionLifecycle<typeof mdItemBarcode.$inferSelect>,
): ItemBarcode {
	return {
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		barcodeValue: row.barcodeValue,
		normalizedValue: row.normalizedValue,
		symbology: row.symbology as ItemBarcode["symbology"],
		uomId: row.uomId,
		packQuantity: row.packQuantity,
		isPrimary: row.isPrimary,
		status: (row.status ?? "active") as ItemBarcode["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemExternalIdRow(
	row: WithOptionalExtensionLifecycle<typeof mdItemExternalId.$inferSelect>,
): ItemExternalId {
	return {
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		sourceSystem: row.sourceSystem,
		externalIdType: row.externalIdType,
		externalValue: row.externalValue,
		normalizedValue: row.normalizedValue,
		caseSensitivity: row.caseSensitivity as ItemExternalId["caseSensitivity"],
		isPrimary: row.isPrimary,
		status: (row.status ?? "active") as ItemExternalId["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemAliasRow(
	row: WithOptionalExtensionLifecycle<typeof mdItemAlias.$inferSelect>,
): ItemAlias {
	return {
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		aliasType: row.aliasType as ItemAlias["aliasType"],
		aliasValue: row.aliasValue,
		normalizedValue: row.normalizedValue,
		languageId: row.languageId,
		source: row.source,
		isSearchable: row.isSearchable,
		status: (row.status ?? "active") as ItemAlias["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapWarehouseExternalIdRow(
	row: WithOptionalExtensionLifecycle<
		typeof mdWarehouseExternalId.$inferSelect
	>,
): WarehouseExternalId {
	return {
		id: row.id,
		organizationId: row.organizationId,
		warehouseId: row.warehouseId,
		sourceSystem: row.sourceSystem,
		externalIdType: row.externalIdType,
		externalValue: row.externalValue,
		normalizedValue: row.normalizedValue,
		caseSensitivity:
			row.caseSensitivity as WarehouseExternalId["caseSensitivity"],
		status: (row.status ?? "active") as WarehouseExternalId["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export async function drizzleCountActivePartyRoles(
	organizationId: string,
	partyId: string,
): Promise<Result<number>> {
	try {
		const rows = await db
			.select({ id: mdPartyRole.id })
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.organizationId, organizationId),
					eq(mdPartyRole.partyId, partyId),
					eq(mdPartyRole.status, "active"),
					isNull(mdPartyRole.archivedAt),
				),
			);
		return ok(rows.length);
	} catch (error) {
		return failFromUnknown(error, "Failed to count active party roles");
	}
}

export async function drizzleListPartyRoles(
	filter: PartyRoleListFilter,
): Promise<Result<ExtensionListPage<PartyRole>>> {
	try {
		const rows = await db
			.select()
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.organizationId, filter.organizationId),
					eq(mdPartyRole.partyId, filter.partyId),
				),
			)
			.orderBy(asc(mdPartyRole.roleCode), asc(mdPartyRole.id))
			.limit(filter.pageSize + 1)
			.offset((filter.page - 1) * filter.pageSize);
		return ok({
			items: rows.slice(0, filter.pageSize).map(mapPartyRole),
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.pageSize,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to list party roles");
	}
}

export async function drizzleListActivePartyRoles(
	filter: PartyRoleListFilter,
): Promise<Result<ExtensionListPage<PartyRole>>> {
	try {
		const rows = await db
			.select()
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.organizationId, filter.organizationId),
					eq(mdPartyRole.partyId, filter.partyId),
					eq(mdPartyRole.status, "active"),
					isNull(mdPartyRole.archivedAt),
				),
			)
			.orderBy(asc(mdPartyRole.roleCode), asc(mdPartyRole.id))
			.limit(filter.pageSize + 1)
			.offset((filter.page - 1) * filter.pageSize);
		return ok({
			items: rows.slice(0, filter.pageSize).map(mapPartyRole),
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.pageSize,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to list active party roles");
	}
}

export async function drizzleGetPartyRoleById(
	organizationId: string,
	partyId: string,
	id: string,
): Promise<Result<PartyRole | null>> {
	try {
		const [row] = await db
			.select()
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.organizationId, organizationId),
					eq(mdPartyRole.partyId, partyId),
					eq(mdPartyRole.id, id),
				),
			)
			.limit(1);
		return ok(row === undefined ? null : mapPartyRole(row));
	} catch (error) {
		return failFromUnknown(error, "Failed to get party role");
	}
}

export async function drizzleGetPartyRoleLifecycleContext(
	organizationId: string,
	id: string,
): Promise<Result<PartyRoleLifecycleContext>> {
	try {
		const [roleRow] = await db
			.select()
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.organizationId, organizationId),
					eq(mdPartyRole.id, id),
				),
			)
			.limit(1);
		if (roleRow === undefined) {
			return ok({ role: null, party: null, activeRoleCount: 0 });
		}
		const role = mapPartyRole(roleRow);
		const [partyRow] = await db
			.select()
			.from(mdParty)
			.where(
				and(
					eq(mdParty.organizationId, organizationId),
					eq(mdParty.id, role.partyId),
				),
			)
			.limit(1);
		const activeRoleCount = await drizzleCountActivePartyRoles(
			organizationId,
			role.partyId,
		);
		if (!activeRoleCount.ok) return activeRoleCount;
		return ok({
			role,
			party: partyRow === undefined ? null : mapParty(partyRow),
			activeRoleCount: activeRoleCount.data,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to get party role lifecycle context");
	}
}

export async function drizzleCreatePartyRole(
	record: PartyRoleCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyRole>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("roleCode", null, record.roleCode);
	const newValueJson = valueSnapshotJson({
		roleCode: record.roleCode,
		status: "draft",
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_role",
		entityId: id,
		parentEntityId: record.partyId,
		classification: extensionEventClassification("party_role", record.roleCode),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
				WITH mutated AS (
					INSERT INTO md_party_role (
						id, organization_id, party_id, role_code, status, version,
						valid_from, valid_to, created_by, updated_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.partyId}, ${record.roleCode},
						'draft', 1, ${record.validFrom ?? null}, ${record.validTo ?? null},
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
						'master_data', 'party_role', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
					FROM mutated
					RETURNING id
				),
				outboxed AS (
					INSERT INTO platform_domain_event (
						id, organization_id, type, source_module, correlation_id, actor_user_id,
						payload, status, attempts
					)
					SELECT
						${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyRoleCreated}, 'master_data',
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
			return fail("INTERNAL_ERROR", "Party role create returned no row");
		}
		return ok(
			mapPartyRole({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				roleCode: row.role_code as string,
				status: row.status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				activatedAt: (row.activated_at as Date | null) ?? null,
				activatedBy: (row.activated_by as string | null) ?? null,
				retiredAt: (row.retired_at as Date | null) ?? null,
				retiredBy: (row.retired_by as string | null) ?? null,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party role already exists",
			"Failed to create party role",
		);
	}
}

export async function drizzleUpdatePartyRole(
	record: PartyRoleUpdateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyRole>> {
	try {
		const [existing] = await db
			.select()
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.id, record.id),
					eq(mdPartyRole.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Party role not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		const version = assertExpectedExtensionVersion(
			existing,
			record.expectedVersion,
			"party_role",
		);
		if (!version.ok) return version;
		if (existing.status !== "draft" && existing.status !== "inactive") {
			return fail(
				"CONFLICT",
				"Only draft or inactive party roles can be updated",
				{
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails,
			);
		}
		const parent = await requireUsablePartyMutationParent(
			record.organizationId,
			existing.partyId,
		);
		if (!parent.ok) return parent;
		const nextRoleCode = record.roleCode ?? existing.roleCode;
		const nextValidFrom =
			record.validFrom !== undefined ? record.validFrom : existing.validFrom;
		const nextValidTo =
			record.validTo !== undefined ? record.validTo : existing.validTo;
		if (
			nextValidFrom !== null &&
			nextValidTo !== null &&
			nextValidTo < nextValidFrom
		) {
			return fail("BAD_REQUEST", "validTo must not precede validFrom", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson(
			"roleCode",
			existing.roleCode,
			nextRoleCode,
		);
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party_role",
			entityId: record.id,
			parentEntityId: existing.partyId,
			classification: extensionEventClassification("party_role", nextRoleCode),
			version: existing.version + 1,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						UPDATE md_party_role
						SET role_code = ${nextRoleCode},
							valid_from = ${nextValidFrom},
							valid_to = ${nextValidTo},
							version = version + 1,
							updated_by = ${record.updatedBy},
							updated_at = now()
						WHERE id = ${record.id}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status IN ('draft', 'inactive')
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT ${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
							'master_data', 'party_role', id, 'UPDATE', ${changesJson}::jsonb,
							${valueSnapshotJson({ roleCode: nextRoleCode })}::jsonb
						FROM mutated RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyRoleUpdated},
							'master_data', ${meta.correlationId}, ${record.updatedBy},
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			return fail("CONFLICT", "Party role update conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapPartyRole({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				roleCode: row.role_code as string,
				status: row.status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				activatedAt: (row.activated_at as Date | null) ?? null,
				activatedBy: (row.activated_by as string | null) ?? null,
				retiredAt: (row.retired_at as Date | null) ?? null,
				retiredBy: (row.retired_by as string | null) ?? null,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party role update conflict",
			"Failed to update party role",
		);
	}
}

export async function drizzleTransitionPartyRole(
	record: PartyRoleLifecycleRecord,
	_ports: MutationPorts,
	meta: {
		correlationId: string;
		eventSuffix: PartyRoleLifecycleEventSuffix;
	},
): Promise<Result<PartyRole>> {
	const auditId = randomUUID();
	const eventId = randomUUID();
	const eventType = partyRoleLifecycleEventType(meta.eventSuffix);
	try {
		const [existing] = await db
			.select()
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.id, record.id),
					eq(mdPartyRole.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Party role not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		const version = assertExpectedExtensionVersion(
			existing,
			record.expectedVersion,
			"party_role",
		);
		if (!version.ok) return version;
		const currentStatus = assertStandardChildLifecycleStatus(existing.status);
		const transition = resolveExtensionLifecycleTransition(
			"party_role",
			currentStatus,
			record.toStatus,
		);
		if (!transition.ok) return transition;
		const reason = assertExtensionTransitionReason(
			transition.data,
			record.reason,
		);
		if (!reason.ok) return reason;
		const parent = await requireUsablePartyMutationParent(
			record.organizationId,
			existing.partyId,
		);
		if (!parent.ok) return parent;
		if (transition.data.parentStateRequirement === "parent_active") {
			const [party] = await db
				.select({ status: mdParty.status })
				.from(mdParty)
				.where(
					and(
						eq(mdParty.organizationId, record.organizationId),
						eq(mdParty.id, existing.partyId),
					),
				)
				.limit(1);
			if (party?.status !== "active") {
				return fail("CONFLICT", "Party must be active for this transition", {
					reason: "MASTER_INVALID_STATE",
				} satisfies MasterFailureDetails);
			}
		}
		// Active party cannot lose its final active role (reverse of activation invariant).
		if (
			record.toStatus !== "active" &&
			existing.status === "active" &&
			existing.archivedAt === null
		) {
			const [partyRow] = await db
				.select({ status: mdParty.status })
				.from(mdParty)
				.where(
					and(
						eq(mdParty.id, existing.partyId),
						eq(mdParty.organizationId, record.organizationId),
					),
				)
				.limit(1);
			if (partyRow?.status === "active") {
				const activeCount = await drizzleCountActivePartyRoles(
					record.organizationId,
					existing.partyId,
				);
				if (!activeCount.ok) {
					return activeCount;
				}
				if (activeCount.data <= 1) {
					return fail(
						"CONFLICT",
						"An active party cannot lose its final active role",
						{
							reason: "MASTER_FINAL_ACTIVE_ROLE",
						} satisfies MasterFailureDetails,
					);
				}
			}
		}
		const changesJson = fieldChangeJson(
			"status",
			existing.status,
			record.toStatus,
		);
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party_role",
			entityId: record.id,
			parentEntityId: existing.partyId,
			classification: extensionEventClassification(
				"party_role",
				existing.roleCode,
			),
			version: existing.version + 1,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});
		const activatedAt =
			record.toStatus === "active" ? new Date() : existing.activatedAt;
		const activatedBy =
			record.toStatus === "active" ? record.actorUserId : existing.activatedBy;
		const retiredAt =
			record.toStatus === "retired" ? new Date() : existing.retiredAt;
		const retiredBy =
			record.toStatus === "retired" ? record.actorUserId : existing.retiredBy;
		const archivedAt =
			record.toStatus === "archived" ? new Date() : existing.archivedAt;
		const archivedBy =
			record.toStatus === "archived" ? record.actorUserId : existing.archivedBy;
		const [, rows] = await runNeonHttpTransaction<
			[Record<string, unknown>[], Record<string, unknown>[]]
		>((sql) => [
			sql`
					SELECT party.id
					FROM md_party AS party
					JOIN md_party_role AS role
						ON role.organization_id = party.organization_id
						AND role.party_id = party.id
					WHERE role.id = ${record.id}
						AND role.organization_id = ${record.organizationId}
					FOR UPDATE OF party
				`,
			sql`
				WITH mutated AS (
					UPDATE md_party_role
					SET status = ${record.toStatus},
						version = version + 1,
						updated_by = ${record.actorUserId},
						updated_at = now(),
						activated_at = ${activatedAt},
						activated_by = ${activatedBy},
						retired_at = ${retiredAt},
						retired_by = ${retiredBy},
						archived_at = ${archivedAt},
						archived_by = ${archivedBy}
					WHERE id = ${record.id}
						AND organization_id = ${record.organizationId}
						AND version = ${record.expectedVersion}
						AND (
							${record.toStatus} = 'active'
							OR status <> 'active'
							OR archived_at IS NOT NULL
							OR NOT EXISTS (
								SELECT 1
								FROM md_party AS party
								WHERE party.organization_id = md_party_role.organization_id
									AND party.id = md_party_role.party_id
									AND party.status = 'active'
							)
							OR (
								SELECT count(*)
								FROM md_party_role AS sibling
								WHERE sibling.organization_id = md_party_role.organization_id
									AND sibling.party_id = md_party_role.party_id
									AND sibling.status = 'active'
									AND sibling.archived_at IS NULL
							) > 1
						)
					RETURNING *
				),
				audited AS (
					INSERT INTO platform_audit_log (
						id, organization_id, actor_user_id, correlation_id, module, entity,
						entity_id, action, changes, new_value
					)
					SELECT
						${auditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
						'master_data', 'party_role', id, 'UPDATE', ${changesJson}::jsonb,
						${valueSnapshotJson({ status: record.toStatus, reason: reason.data })}::jsonb
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
		const row = rows[0];
		if (row === undefined) {
			if (record.toStatus !== "active") {
				const [current] = await db
					.select({
						partyId: mdPartyRole.partyId,
						status: mdPartyRole.status,
						archivedAt: mdPartyRole.archivedAt,
					})
					.from(mdPartyRole)
					.where(
						and(
							eq(mdPartyRole.id, record.id),
							eq(mdPartyRole.organizationId, record.organizationId),
						),
					)
					.limit(1);
				if (current?.status === "active" && current.archivedAt === null) {
					const [party] = await db
						.select({ status: mdParty.status })
						.from(mdParty)
						.where(
							and(
								eq(mdParty.id, current.partyId),
								eq(mdParty.organizationId, record.organizationId),
							),
						)
						.limit(1);
					if (party?.status === "active") {
						const activeCount = await drizzleCountActivePartyRoles(
							record.organizationId,
							current.partyId,
						);
						if (!activeCount.ok) return activeCount;
						if (activeCount.data <= 1) {
							return fail(
								"CONFLICT",
								"An active party cannot lose its final active role",
								{
									reason: "MASTER_FINAL_ACTIVE_ROLE",
								} satisfies MasterFailureDetails,
							);
						}
					}
				}
			}
			return fail("CONFLICT", "Party role version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapPartyRole({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				roleCode: row.role_code as string,
				status: row.status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				activatedAt: (row.activated_at as Date | null) ?? null,
				activatedBy: (row.activated_by as string | null) ?? null,
				retiredAt: (row.retired_at as Date | null) ?? null,
				retiredBy: (row.retired_by as string | null) ?? null,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party role conflict",
			"Failed to transition party role",
		);
	}
}

export async function drizzleCreatePartyAddress(
	record: PartyAddressCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyAddress>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const demotionAuditId = randomUUID();
	const demotionEventId = randomUUID();
	const changesJson = fieldChangeJson("line1", null, record.line1);
	const newValueJson = valueSnapshotJson({ line1: record.line1 });
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_address",
		entityId: id,
		parentEntityId: record.partyId,
		classification: extensionEventClassification(
			"party_address",
			record.addressType,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const country = await requireActiveAddressCountry(record.countryId);
		if (!country.ok) return country;
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT party.id AS parent_id
						FROM md_party AS party
						WHERE party.organization_id = ${record.organizationId}
							AND party.id = ${record.partyId}
							AND party.status <> 'retired'
							AND party.retired_at IS NULL
							AND party.merged_into_id IS NULL
						FOR UPDATE
					),
					country_valid AS MATERIALIZED (
						SELECT country.id
						FROM ref_country AS country
						WHERE country.id = ${record.countryId} AND country.active = true
						FOR SHARE
					),
					demoted AS (
						UPDATE md_party_address
						SET is_primary = false,
							version = version + 1,
							updated_by = ${record.createdBy},
							updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND party_id = ${record.partyId}
							AND purpose = ${record.purpose}
							AND is_primary = true
							AND status = 'active'
							AND archived_at IS NULL
							AND ${record.isPrimary ?? false} = true
							AND EXISTS (SELECT 1 FROM parent_locked)
						RETURNING *
					),
					mutated AS (
						INSERT INTO md_party_address (
							id, organization_id, party_id, address_type, purpose, line1, line2, line3,
							city, administrative_area, postal_code, country_id, attention, is_primary,
							validation_status, status, version, effective_from, effective_to,
							created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.partyId}, ${record.addressType}, ${record.purpose},
							${record.line1}, ${record.line2 ?? null}, ${record.line3 ?? null}, ${record.city},
							${record.administrativeArea ?? null}, ${record.postalCode ?? null}, ${record.countryId},
							${record.attention ?? null}, ${record.isPrimary ?? false},
							${record.validationStatus ?? "unvalidated"}, 'active', 1,
							${record.effectiveFrom ?? null}, ${record.effectiveTo ?? null},
							${record.createdBy}, ${record.createdBy}
						FROM parent_locked, country_valid
						WHERE (SELECT count(*) FROM demoted) >= 0
						RETURNING *
					),
					demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT ${demotionAuditId}, organization_id, ${record.createdBy}, ${meta.correlationId},
							'master_data', 'party_address', id, 'UPDATE',
							${fieldChangeJson("isPrimary", true, false)}::jsonb,
							${valueSnapshotJson({ isPrimary: false })}::jsonb
						FROM demoted RETURNING id
					),
					demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${demotionEventId}, organization_id,
							${EXTENSION_EVENT_TYPES.partyAddressPrimaryChanged}, 'master_data',
							${meta.correlationId}, ${record.createdBy},
							jsonb_build_object('organizationId', organization_id, 'entityType', 'party_address',
								'entityId', id,
								'classification', jsonb_build_object('type', 'address_type', 'code', address_type),
								'version', version,
								'actorId', ${record.createdBy}, 'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'party_address', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyAddressCreated}, 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM demotion_audited) >= 0
						AND (SELECT count(*) FROM demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			const parent = await requireUsablePartyMutationParent(
				record.organizationId,
				record.partyId,
			);
			if (!parent.ok) return parent;
			const activeCountry = await requireActiveAddressCountry(record.countryId);
			if (!activeCountry.ok) return activeCountry;
			return fail("INTERNAL_ERROR", "Party address create returned no row");
		}
		return ok(
			mapPartyAddress({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				addressType: row.address_type as string,
				purpose: row.purpose as string,
				line1: row.line1 as string,
				line2: (row.line2 as string | null) ?? null,
				line3: (row.line3 as string | null) ?? null,
				city: row.city as string,
				administrativeArea: (row.administrative_area as string | null) ?? null,
				postalCode: (row.postal_code as string | null) ?? null,
				countryId: row.country_id as string,
				attention: (row.attention as string | null) ?? null,
				isPrimary: Boolean(row.is_primary),
				validationStatus: row.validation_status as string,
				status: row.status as string,
				version: Number(row.version),
				effectiveFrom: (row.effective_from as Date | null) ?? null,
				effectiveTo: (row.effective_to as Date | null) ?? null,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party address conflict",
			"Failed to create party address",
		);
	}
}

export async function drizzleUpdatePartyAddress(
	record: PartyAddressUpdateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyAddress>> {
	try {
		const [existing] = await db
			.select()
			.from(mdPartyAddress)
			.where(
				and(
					eq(mdPartyAddress.id, record.id),
					eq(mdPartyAddress.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Party address not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		const version = assertExpectedExtensionVersion(
			existing,
			record.expectedVersion,
			"party_address",
		);
		if (!version.ok) return version;
		const nextLine1 = record.line1 ?? existing.line1;
		const nextType = record.addressType ?? existing.addressType;
		const nextPurpose = record.purpose ?? existing.purpose;
		const nextCountryId = record.countryId ?? existing.countryId;
		const nextEffectiveFrom =
			record.effectiveFrom !== undefined
				? record.effectiveFrom
				: existing.effectiveFrom;
		const nextEffectiveTo =
			record.effectiveTo !== undefined
				? record.effectiveTo
				: existing.effectiveTo;
		if (
			nextEffectiveFrom !== null &&
			nextEffectiveTo !== null &&
			nextEffectiveFrom > nextEffectiveTo
		) {
			return fail(
				"BAD_REQUEST",
				"effectiveTo must be on or after effectiveFrom",
				{
					reason: "MASTER_VALIDATION_FAILED",
					field: "effectiveTo",
				} satisfies MasterFailureDetails,
			);
		}
		const country = await requireActiveAddressCountry(nextCountryId);
		if (!country.ok) return country;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const demotionAuditId = randomUUID();
		const demotionEventId = randomUUID();
		const changesJson = fieldChangeJson("line1", existing.line1, nextLine1);
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party_address",
			entityId: record.id,
			parentEntityId: existing.partyId,
			classification: extensionEventClassification("party_address", nextType),
			version: existing.version + 1,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT party.id AS parent_id
						FROM md_party AS party
						WHERE party.organization_id = ${record.organizationId}
							AND party.id = ${existing.partyId}
							AND party.status <> 'retired'
							AND party.retired_at IS NULL
							AND party.merged_into_id IS NULL
						FOR UPDATE
					),
					target_locked AS MATERIALIZED (
						SELECT address.id
						FROM md_party_address AS address
						WHERE address.organization_id = ${record.organizationId}
							AND address.id = ${record.id}
							AND address.version = ${record.expectedVersion}
						FOR UPDATE
					),
					country_valid AS MATERIALIZED (
						SELECT country.id
						FROM ref_country AS country
						WHERE country.id = ${nextCountryId} AND country.active = true
						FOR SHARE
					),
					demoted AS (
						UPDATE md_party_address
						SET is_primary = false,
							version = version + 1,
							updated_by = ${record.updatedBy},
							updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND party_id = ${existing.partyId}
							AND purpose = ${nextPurpose}
							AND id <> ${record.id}
							AND is_primary = true
							AND status = 'active'
							AND archived_at IS NULL
							AND ${record.isPrimary ?? existing.isPrimary} = true
							AND EXISTS (SELECT 1 FROM parent_locked)
							AND EXISTS (SELECT 1 FROM target_locked)
						RETURNING *
					),
					mutated AS (
						UPDATE md_party_address
						SET address_type = ${nextType},
							purpose = ${nextPurpose},
							line1 = ${nextLine1},
							line2 = ${record.line2 !== undefined ? record.line2 : existing.line2},
							line3 = ${record.line3 !== undefined ? record.line3 : existing.line3},
							city = ${record.city ?? existing.city},
							administrative_area = ${
								record.administrativeArea !== undefined
									? record.administrativeArea
									: existing.administrativeArea
							},
							postal_code = ${
								record.postalCode !== undefined
									? record.postalCode
									: existing.postalCode
							},
							country_id = ${nextCountryId},
							attention = ${record.attention !== undefined ? record.attention : existing.attention},
							is_primary = ${record.isPrimary ?? existing.isPrimary},
							validation_status = ${record.validationStatus ?? existing.validationStatus},
							effective_from = ${nextEffectiveFrom},
							effective_to = ${nextEffectiveTo},
							version = version + 1,
							updated_by = ${record.updatedBy},
							updated_at = now()
						FROM parent_locked, country_valid, target_locked
						WHERE md_party_address.id = ${record.id}
							AND md_party_address.organization_id = ${record.organizationId}
							AND md_party_address.version = ${record.expectedVersion}
							AND (SELECT count(*) FROM demoted) >= 0
						RETURNING *
					),
					demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT ${demotionAuditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
							'master_data', 'party_address', id, 'UPDATE',
							${fieldChangeJson("isPrimary", true, false)}::jsonb,
							${valueSnapshotJson({ isPrimary: false })}::jsonb
						FROM demoted RETURNING id
					),
					demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${demotionEventId}, organization_id,
							${EXTENSION_EVENT_TYPES.partyAddressPrimaryChanged}, 'master_data',
							${meta.correlationId}, ${record.updatedBy},
							jsonb_build_object('organizationId', organization_id, 'entityType', 'party_address',
								'entityId', id,
								'classification', jsonb_build_object('type', 'address_type', 'code', address_type),
								'version', version,
								'actorId', ${record.updatedBy}, 'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
							'master_data', 'party_address', id, 'UPDATE', ${changesJson}::jsonb,
							${valueSnapshotJson({ line1: nextLine1 })}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyAddressUpdated}, 'master_data',
							${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM demotion_audited) >= 0
						AND (SELECT count(*) FROM demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			const parent = await requireUsablePartyMutationParent(
				record.organizationId,
				existing.partyId,
			);
			if (!parent.ok) return parent;
			const activeCountry = await requireActiveAddressCountry(nextCountryId);
			if (!activeCountry.ok) return activeCountry;
			return fail("CONFLICT", "Party address version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapPartyAddress({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				addressType: row.address_type as string,
				purpose: row.purpose as string,
				line1: row.line1 as string,
				line2: (row.line2 as string | null) ?? null,
				line3: (row.line3 as string | null) ?? null,
				city: row.city as string,
				administrativeArea: (row.administrative_area as string | null) ?? null,
				postalCode: (row.postal_code as string | null) ?? null,
				countryId: row.country_id as string,
				attention: (row.attention as string | null) ?? null,
				isPrimary: Boolean(row.is_primary),
				validationStatus: row.validation_status as string,
				status: row.status as string,
				version: Number(row.version),
				effectiveFrom: (row.effective_from as Date | null) ?? null,
				effectiveTo: (row.effective_to as Date | null) ?? null,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party address conflict",
			"Failed to update party address",
		);
	}
}

export async function drizzleListPartyAddresses(
	filter: ParentListFilter,
): Promise<Result<PartyAddress[]>> {
	try {
		const rows = await db
			.select()
			.from(mdPartyAddress)
			.where(
				and(
					eq(mdPartyAddress.organizationId, filter.organizationId),
					eq(mdPartyAddress.partyId, filter.parentId),
				),
			)
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);
		return ok(rows.map(mapPartyAddress));
	} catch (error) {
		return failFromUnknown(error, "Failed to list party addresses");
	}
}

export async function drizzleGetPartyAddressById(
	organizationId: string,
	partyId: string,
	id: string,
): Promise<Result<PartyAddress | null>> {
	try {
		const [row] = await db
			.select()
			.from(mdPartyAddress)
			.where(
				and(
					eq(mdPartyAddress.organizationId, organizationId),
					eq(mdPartyAddress.partyId, partyId),
					eq(mdPartyAddress.id, id),
				),
			)
			.limit(1);
		return ok(row ? mapPartyAddress(row) : null);
	} catch (error) {
		return failFromUnknown(error, "Failed to get party address");
	}
}

export async function drizzleGetPrimaryPartyAddress(
	organizationId: string,
	partyId: string,
	purpose: PartyAddress["purpose"],
): Promise<Result<PartyAddress | null>> {
	try {
		const [row] = await db
			.select()
			.from(mdPartyAddress)
			.where(
				and(
					eq(mdPartyAddress.organizationId, organizationId),
					eq(mdPartyAddress.partyId, partyId),
					eq(mdPartyAddress.purpose, purpose),
					eq(mdPartyAddress.isPrimary, true),
					eq(mdPartyAddress.status, "active"),
					isNull(mdPartyAddress.archivedAt),
				),
			)
			.limit(1);
		return ok(row ? mapPartyAddress(row) : null);
	} catch (error) {
		return failFromUnknown(error, "Failed to get primary party address");
	}
}

export async function drizzleListPartyContacts(
	filter: ParentListFilter,
): Promise<Result<PartyContact[]>> {
	try {
		const rows = await db
			.select()
			.from(mdPartyContact)
			.where(
				and(
					eq(mdPartyContact.organizationId, filter.organizationId),
					eq(mdPartyContact.partyId, filter.parentId),
				),
			)
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);
		return ok(rows.map(mapPartyContact));
	} catch (error) {
		return failFromUnknown(error, "Failed to list party contacts");
	}
}

export async function drizzleGetPrimaryPartyContact(
	organizationId: string,
	partyId: string,
	contactType: PartyContact["contactType"],
	purpose: string | null,
): Promise<Result<PartyContact | null>> {
	try {
		const [row] = await db
			.select()
			.from(mdPartyContact)
			.where(
				and(
					eq(mdPartyContact.organizationId, organizationId),
					eq(mdPartyContact.partyId, partyId),
					eq(mdPartyContact.contactType, contactType),
					purpose === null
						? isNull(mdPartyContact.purpose)
						: eq(mdPartyContact.purpose, purpose),
					eq(mdPartyContact.isPrimary, true),
					eq(mdPartyContact.status, "active"),
					isNull(mdPartyContact.archivedAt),
				),
			)
			.limit(1);
		return ok(row ? mapPartyContact(row) : null);
	} catch (error) {
		return failFromUnknown(error, "Failed to get primary party contact");
	}
}

export async function drizzleCreatePartyContact(
	record: PartyContactCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyContact>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const demotionAuditId = randomUUID();
	const demotionEventId = randomUUID();
	const changesJson = fieldChangeJson("value", null, "[protected]");
	const newValueJson = valueSnapshotJson({ contactType: record.contactType });
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_contact",
		entityId: id,
		parentEntityId: record.partyId,
		classification: extensionEventClassification(
			"party_contact",
			record.contactType,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT party.id AS parent_id
						FROM md_party AS party
						WHERE party.organization_id = ${record.organizationId}
							AND party.id = ${record.partyId}
							AND party.status <> 'retired'
							AND party.retired_at IS NULL
							AND party.merged_into_id IS NULL
						FOR UPDATE
					),
					demoted AS (
						UPDATE md_party_contact
						SET is_primary = false,
							version = version + 1,
							updated_by = ${record.createdBy},
							updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND party_id = ${record.partyId}
							AND contact_type = ${record.contactType}
							AND coalesce(purpose, '') = ${record.purpose ?? ""}
							AND is_primary = true
							AND status = 'active'
							AND archived_at IS NULL
							AND ${record.isPrimary ?? false} = true
							AND EXISTS (SELECT 1 FROM parent_locked)
						RETURNING *
					),
					mutated AS (
						INSERT INTO md_party_contact (
							id, organization_id, party_id, contact_type, value, normalized_value,
							label, purpose, is_primary, verification_status, verified_at, status,
							version, effective_from, effective_to, created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.partyId}, ${record.contactType},
							${record.value}, ${record.normalizedValue}, ${record.label ?? null},
							${record.purpose ?? null}, ${record.isPrimary ?? false},
							'unverified', null, 'active', 1,
							${record.effectiveFrom ?? null}, ${record.effectiveTo ?? null},
							${record.createdBy}, ${record.createdBy}
						FROM parent_locked
						WHERE (SELECT count(*) FROM demoted) >= 0
						RETURNING *
					),
					demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT ${demotionAuditId}, organization_id, ${record.createdBy}, ${meta.correlationId},
							'master_data', 'party_contact', id, 'UPDATE',
							${fieldChangeJson("isPrimary", true, false)}::jsonb,
							${valueSnapshotJson({ isPrimary: false })}::jsonb
						FROM demoted RETURNING id
					),
					demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${demotionEventId}, organization_id,
							${EXTENSION_EVENT_TYPES.partyContactPrimaryChanged}, 'master_data',
							${meta.correlationId}, ${record.createdBy},
							jsonb_build_object('organizationId', organization_id, 'entityType', 'party_contact',
								'entityId', id,
								'classification', jsonb_build_object('type', 'contact_type', 'code', contact_type),
								'version', version,
								'actorId', ${record.createdBy}, 'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'party_contact', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyContactCreated}, 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM demotion_audited) >= 0
						AND (SELECT count(*) FROM demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			const parent = await requireUsablePartyMutationParent(
				record.organizationId,
				record.partyId,
			);
			if (!parent.ok) return parent;
			return fail("INTERNAL_ERROR", "Party contact create returned no row");
		}
		return ok(
			mapPartyContact({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				contactType: row.contact_type as string,
				value: row.value as string,
				normalizedValue: row.normalized_value as string,
				label: (row.label as string | null) ?? null,
				purpose: (row.purpose as string | null) ?? null,
				isPrimary: Boolean(row.is_primary),
				verificationStatus: row.verification_status as string,
				verifiedAt: (row.verified_at as Date | null) ?? null,
				status: row.status as string,
				version: Number(row.version),
				effectiveFrom: (row.effective_from as Date | null) ?? null,
				effectiveTo: (row.effective_to as Date | null) ?? null,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party contact conflict",
			"Failed to create party contact",
		);
	}
}

export async function drizzleUpdatePartyContact(
	record: PartyContactUpdateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyContact>> {
	try {
		const [existing] = await db
			.select()
			.from(mdPartyContact)
			.where(
				and(
					eq(mdPartyContact.id, record.id),
					eq(mdPartyContact.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Party contact not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		const version = assertExpectedExtensionVersion(
			existing,
			record.expectedVersion,
			"party_contact",
		);
		if (!version.ok) return version;
		if (
			record.verificationStatus !== undefined &&
			((record.verificationStatus === "verified" &&
				record.verifiedAt == null) ||
				(record.verificationStatus !== "verified" && record.verifiedAt != null))
		) {
			return fail(
				"BAD_REQUEST",
				"Invalid party contact verification evidence",
				{
					reason: "MASTER_VALIDATION_FAILED",
					field: "verificationStatus",
				} satisfies MasterFailureDetails,
			);
		}
		if (
			(record.contactType === undefined) !== (record.value === undefined) ||
			(record.value === undefined) !== (record.normalizedValue === undefined)
		) {
			return fail(
				"BAD_REQUEST",
				"Contact type, value, and normalized value must change together",
				{
					reason: "MASTER_VALIDATION_FAILED",
					field: "value",
				} satisfies MasterFailureDetails,
			);
		}
		const nextValue = record.value ?? existing.value;
		const nextType = record.contactType ?? existing.contactType;
		const nextNormalizedValue =
			record.normalizedValue ?? existing.normalizedValue;
		const nextPurpose =
			record.purpose !== undefined ? record.purpose : existing.purpose;
		const nextEffectiveFrom =
			record.effectiveFrom !== undefined
				? record.effectiveFrom
				: existing.effectiveFrom;
		const nextEffectiveTo =
			record.effectiveTo !== undefined
				? record.effectiveTo
				: existing.effectiveTo;
		if (
			nextEffectiveFrom !== null &&
			nextEffectiveTo !== null &&
			nextEffectiveFrom > nextEffectiveTo
		) {
			return fail(
				"BAD_REQUEST",
				"effectiveTo must be on or after effectiveFrom",
				{
					reason: "MASTER_VALIDATION_FAILED",
					field: "effectiveTo",
				} satisfies MasterFailureDetails,
			);
		}
		const contactIdentityChanged =
			record.value !== undefined || record.contactType !== undefined;
		const nextVerificationStatus = contactIdentityChanged
			? "unverified"
			: (record.verificationStatus ?? existing.verificationStatus);
		const nextVerifiedAt = contactIdentityChanged
			? null
			: record.verificationStatus !== undefined
				? (record.verifiedAt ?? null)
				: existing.verifiedAt;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const demotionAuditId = randomUUID();
		const demotionEventId = randomUUID();
		const changesJson = contactIdentityChanged
			? fieldChangeJson("value", "[protected]", "[protected]")
			: record.verificationStatus !== undefined
				? fieldChangeJson(
						"verificationStatus",
						existing.verificationStatus,
						nextVerificationStatus,
					)
				: fieldChangeJson("contact", "unchanged", "updated");
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party_contact",
			entityId: record.id,
			parentEntityId: existing.partyId,
			classification: extensionEventClassification("party_contact", nextType),
			version: existing.version + 1,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT party.id AS parent_id
						FROM md_party AS party
						WHERE party.organization_id = ${record.organizationId}
							AND party.id = ${existing.partyId}
							AND party.status <> 'retired'
							AND party.retired_at IS NULL
							AND party.merged_into_id IS NULL
						FOR UPDATE
					),
					target_locked AS MATERIALIZED (
						SELECT contact.id
						FROM md_party_contact AS contact
						WHERE contact.organization_id = ${record.organizationId}
							AND contact.id = ${record.id}
							AND contact.version = ${record.expectedVersion}
						FOR UPDATE
					),
					demoted AS (
						UPDATE md_party_contact
						SET is_primary = false,
							version = version + 1,
							updated_by = ${record.updatedBy},
							updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND party_id = ${existing.partyId}
							AND contact_type = ${nextType}
							AND coalesce(purpose, '') = ${nextPurpose ?? ""}
							AND id <> ${record.id}
							AND is_primary = true
							AND status = 'active'
							AND archived_at IS NULL
							AND ${record.isPrimary ?? existing.isPrimary} = true
							AND EXISTS (SELECT 1 FROM parent_locked)
							AND EXISTS (SELECT 1 FROM target_locked)
						RETURNING *
					),
					mutated AS (
						UPDATE md_party_contact
						SET contact_type = ${nextType},
							value = ${nextValue},
							normalized_value = ${nextNormalizedValue},
							label = ${record.label !== undefined ? record.label : existing.label},
							purpose = ${nextPurpose},
							is_primary = ${record.isPrimary ?? existing.isPrimary},
							verification_status = ${nextVerificationStatus},
							verified_at = ${nextVerifiedAt},
							effective_from = ${nextEffectiveFrom},
							effective_to = ${nextEffectiveTo},
							version = version + 1,
							updated_by = ${record.updatedBy},
							updated_at = now()
						FROM parent_locked, target_locked
						WHERE md_party_contact.id = ${record.id}
							AND md_party_contact.organization_id = ${record.organizationId}
							AND md_party_contact.version = ${record.expectedVersion}
							AND (SELECT count(*) FROM demoted) >= 0
						RETURNING *
					),
					demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT ${demotionAuditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
							'master_data', 'party_contact', id, 'UPDATE',
							${fieldChangeJson("isPrimary", true, false)}::jsonb,
							${valueSnapshotJson({ isPrimary: false })}::jsonb
						FROM demoted RETURNING id
					),
					demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${demotionEventId}, organization_id,
							${EXTENSION_EVENT_TYPES.partyContactPrimaryChanged}, 'master_data',
							${meta.correlationId}, ${record.updatedBy},
							jsonb_build_object('organizationId', organization_id, 'entityType', 'party_contact',
								'entityId', id,
								'classification', jsonb_build_object('type', 'contact_type', 'code', contact_type),
								'version', version,
								'actorId', ${record.updatedBy}, 'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, ${record.updatedBy}, ${meta.correlationId},
							'master_data', 'party_contact', id, 'UPDATE', ${changesJson}::jsonb,
							${valueSnapshotJson({ value: nextValue })}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyContactUpdated}, 'master_data',
							${meta.correlationId}, ${record.updatedBy}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM demotion_audited) >= 0
						AND (SELECT count(*) FROM demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			const parent = await requireUsablePartyMutationParent(
				record.organizationId,
				existing.partyId,
			);
			if (!parent.ok) return parent;
			return fail("CONFLICT", "Party contact version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapPartyContact({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				contactType: row.contact_type as string,
				value: row.value as string,
				normalizedValue: row.normalized_value as string,
				label: (row.label as string | null) ?? null,
				purpose: (row.purpose as string | null) ?? null,
				isPrimary: Boolean(row.is_primary),
				verificationStatus: row.verification_status as string,
				verifiedAt: (row.verified_at as Date | null) ?? null,
				status: row.status as string,
				version: Number(row.version),
				effectiveFrom: (row.effective_from as Date | null) ?? null,
				effectiveTo: (row.effective_to as Date | null) ?? null,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party contact conflict",
			"Failed to update party contact",
		);
	}
}

export async function drizzleCreatePartyExternalId(
	record: PartyExternalIdCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyExternalId>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const demotionAuditId = randomUUID();
	const demotionEventId = randomUUID();
	const changesJson = fieldChangeJson("externalIdentity", null, "[protected]");
	const newValueJson = valueSnapshotJson({
		sourceSystem: record.sourceSystem,
		externalIdType: record.externalIdType,
		caseSensitivity: record.caseSensitivity,
		isPrimary: record.isPrimary,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_external_id",
		entityId: id,
		parentEntityId: record.partyId,
		classification: extensionEventClassification(
			"party_external_id",
			`${record.sourceSystem}:${record.externalIdType}`,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT party.id AS parent_id
						FROM md_party AS party
						WHERE party.organization_id = ${record.organizationId}
							AND party.id = ${record.partyId}
							AND party.status <> 'retired'
							AND party.retired_at IS NULL
							AND party.merged_into_id IS NULL
						FOR UPDATE
					), demoted AS (
						UPDATE md_party_external_id
						SET is_primary = false, version = version + 1,
							updated_at = now(), updated_by = ${record.createdBy}
						WHERE ${record.isPrimary} = true
							AND organization_id = ${record.organizationId}
							AND party_id = ${record.partyId}
							AND source_system = ${record.sourceSystem}
							AND external_id_type = ${record.externalIdType}
							AND is_primary = true AND status = 'active' AND archived_at IS NULL
							AND EXISTS (SELECT 1 FROM parent_locked)
						RETURNING id, organization_id, version
					), mutated AS (
						INSERT INTO md_party_external_id (
							id, organization_id, party_id, source_system, external_id_type,
							external_value, normalized_value, case_sensitivity, is_primary, version,
							created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.partyId}, ${record.sourceSystem},
							${record.externalIdType}, ${record.externalValue}, ${record.normalizedValue},
							${record.caseSensitivity}, ${record.isPrimary}, 1,
							${record.createdBy}, ${record.createdBy}
						FROM parent_locked
						WHERE (SELECT count(*) FROM demoted) >= 0
						RETURNING *
					),
					demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT ${demotionAuditId}, organization_id, ${record.createdBy},
							${meta.correlationId}, 'master_data', 'party_external_id', id, 'UPDATE',
							${fieldChangeJson("isPrimary", true, false)}::jsonb,
							${valueSnapshotJson({ isPrimary: false })}::jsonb
						FROM demoted RETURNING id
					),
					demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT ${demotionEventId}, organization_id,
							${EXTENSION_EVENT_TYPES.partyExternalIdPrimaryChanged}, 'master_data',
							${meta.correlationId}, ${record.createdBy},
							jsonb_build_object('organizationId', organization_id,
								'entityType', 'party_external_id', 'entityId', id,
								'classification', jsonb_build_object(
									'type', 'external_id_type',
									'code', ${`${record.sourceSystem}:${record.externalIdType}`}
								),
								'version', version, 'actorId', ${record.createdBy},
								'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'party_external_id', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyExternalIdAssigned}, 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM demotion_audited) >= 0
						AND (SELECT count(*) FROM demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			return fail("INTERNAL_ERROR", "Party external id create returned no row");
		}
		return ok(
			mapPartyExternalIdRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				sourceSystem: row.source_system as string,
				externalIdType: row.external_id_type as string,
				externalValue: row.external_value as string,
				normalizedValue: row.normalized_value as string,
				caseSensitivity:
					row.case_sensitivity as PartyExternalId["caseSensitivity"],
				isPrimary: row.is_primary as boolean,
				status: row.status as PartyExternalId["status"],
				version: Number(row.version),
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"External id already exists",
			"Failed to create party external id",
			"MASTER_EXTERNAL_ID_CONFLICT",
		);
	}
}

export async function drizzleFindPartyByExternalId(
	filter: PartyExternalIdLookup,
): Promise<Result<Party | null>> {
	try {
		const matches = await db
			.select()
			.from(mdPartyExternalId)
			.where(
				and(
					eq(mdPartyExternalId.organizationId, filter.organizationId),
					eq(mdPartyExternalId.sourceSystem, filter.sourceSystem),
					eq(mdPartyExternalId.externalIdType, filter.externalIdType),
					eq(mdPartyExternalId.normalizedValue, filter.normalizedValue),
					eq(mdPartyExternalId.caseSensitivity, filter.caseSensitivity),
					eq(mdPartyExternalId.status, "active"),
					isNull(mdPartyExternalId.archivedAt),
				),
			)
			.limit(2);
		if (matches.length > 1) {
			return fail("CONFLICT", "External id resolves to multiple parties", {
				reason: "MASTER_EXTERNAL_ID_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		const ext = matches[0];
		if (ext === undefined) {
			return ok(null);
		}
		const [party] = await db
			.select()
			.from(mdParty)
			.where(
				and(
					eq(mdParty.id, ext.partyId),
					eq(mdParty.organizationId, filter.organizationId),
				),
			)
			.limit(1);
		return ok(party === undefined ? null : mapParty(party));
	} catch (error) {
		return failFromUnknown(error, "Failed to find party by external id");
	}
}

export async function drizzleUpdatePartyContactVerification(
	record: PartyContactVerificationRecord,
	ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyContact>> {
	return drizzleUpdatePartyContact(record, ports, meta);
}

export async function drizzleCreatePartyRelationship(
	record: PartyRelationshipCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyRelationship>> {
	if (record.sourcePartyId === record.targetPartyId) {
		return fail("BAD_REQUEST", "Party relationship cannot be reflexive", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson(
		"relationshipType",
		null,
		record.relationshipType,
	);
	const newValueJson = valueSnapshotJson({
		sourcePartyId: record.sourcePartyId,
		targetPartyId: record.targetPartyId,
		relationshipType: record.relationshipType,
		direction: record.direction,
		effectiveFrom: record.effectiveFrom,
		effectiveTo: record.effectiveTo,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_relationship",
		entityId: id,
		parentEntityId: record.sourcePartyId,
		classification: extensionEventClassification(
			"party_relationship",
			record.relationshipType,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH RECURSIVE hierarchy_guard AS MATERIALIZED (
						SELECT pg_advisory_xact_lock(
							hashtextextended(${`${record.organizationId}:party_relationship_hierarchy`}, 0)
						)
					), parents_locked AS MATERIALIZED (
						SELECT party.id
						FROM md_party AS party
						WHERE party.organization_id = ${record.organizationId}
							AND party.id IN (${record.sourcePartyId}, ${record.targetPartyId})
							AND party.status <> 'retired'
							AND party.retired_at IS NULL
							AND party.merged_into_id IS NULL
							AND EXISTS (SELECT 1 FROM hierarchy_guard)
						FOR UPDATE
					), hierarchy_walk(party_id) AS (
						SELECT relationship.target_party_id
						FROM md_party_relationship AS relationship
						WHERE relationship.organization_id = ${record.organizationId}
							AND relationship.source_party_id = ${record.targetPartyId}
							AND relationship.direction = 'hierarchical'
							AND relationship.relationship_type = 'parent_of'
							AND relationship.status = 'active'
							AND relationship.archived_at IS NULL
							AND EXISTS (SELECT 1 FROM hierarchy_guard)
						UNION
						SELECT relationship.target_party_id
						FROM md_party_relationship AS relationship
						INNER JOIN hierarchy_walk
							ON relationship.source_party_id = hierarchy_walk.party_id
						WHERE relationship.organization_id = ${record.organizationId}
							AND relationship.direction = 'hierarchical'
							AND relationship.relationship_type = 'parent_of'
							AND relationship.status = 'active'
							AND relationship.archived_at IS NULL
					), mutated AS (
						INSERT INTO md_party_relationship (
							id, organization_id, source_party_id, target_party_id, relationship_type,
							direction, effective_from, effective_to, status, version, created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.sourcePartyId}, ${record.targetPartyId},
							${record.relationshipType}, ${record.direction}, ${record.effectiveFrom},
							${record.effectiveTo}, 'active', 1, ${record.createdBy}, ${record.createdBy}
						WHERE (SELECT count(*) FROM parents_locked) = 2
							AND (${record.direction} <> 'hierarchical' OR NOT EXISTS (
								SELECT 1 FROM hierarchy_walk WHERE party_id = ${record.sourcePartyId}
							))
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'party_relationship', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.partyRelationshipCreated}, 'master_data',
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
			if (record.direction === "hierarchical") {
				return fail("CONFLICT", "Party relationship would create a cycle", {
					reason: "MASTER_RELATIONSHIP_CYCLE",
				} satisfies MasterFailureDetails);
			}
			return fail(
				"INTERNAL_ERROR",
				"Party relationship create returned no row",
			);
		}
		return mapPartyRelationshipRow({
			id: row.id as string,
			organizationId: row.organization_id as string,
			sourcePartyId: row.source_party_id as string,
			targetPartyId: row.target_party_id as string,
			relationshipType: row.relationship_type as string,
			direction: row.direction as string,
			status: row.status as string,
			version: Number(row.version),
			effectiveFrom: (row.effective_from as Date | null) ?? null,
			effectiveTo: (row.effective_to as Date | null) ?? null,
			archivedAt: (row.archived_at as Date | null) ?? null,
			archivedBy: (row.archived_by as string | null) ?? null,
			createdBy: row.created_by as string,
			updatedBy: row.updated_by as string,
			createdAt: row.created_at as Date,
			updatedAt: row.updated_at as Date,
		});
	} catch (error) {
		return mapWriteError(
			error,
			"Party relationship already exists",
			"Failed to create party relationship",
			"MASTER_DUPLICATE",
		);
	}
}

export async function drizzleListPartyRelationships(
	filter: PartyRelationshipListFilter,
): Promise<Result<ExtensionListPage<PartyRelationship>>> {
	try {
		const rows = await db
			.select()
			.from(mdPartyRelationship)
			.where(
				and(
					eq(mdPartyRelationship.organizationId, filter.organizationId),
					or(
						eq(mdPartyRelationship.sourcePartyId, filter.partyId),
						eq(mdPartyRelationship.targetPartyId, filter.partyId),
					),
				),
			)
			.orderBy(asc(mdPartyRelationship.createdAt), asc(mdPartyRelationship.id))
			.limit(filter.pageSize + 1)
			.offset((filter.page - 1) * filter.pageSize);
		const mapped: PartyRelationship[] = [];
		for (const row of rows.slice(0, filter.pageSize)) {
			const relationship = mapPartyRelationshipRow(row);
			if (!relationship.ok) return relationship;
			mapped.push(relationship.data);
		}
		return ok({
			items: mapped,
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.pageSize,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to list party relationships");
	}
}

export async function drizzleResolveItemUomCompatibilityContext(
	filter: ItemUomCompatibilityContextFilter,
): Promise<Result<ItemUomCompatibilityContext>> {
	try {
		const [row] = await db
			.select({
				itemId: mdItem.id,
				baseUomId: mdItem.baseUomId,
				alternateUomId: refUom.id,
				baseUomActive: refUom.active,
				alternateUomActive: refUom.active,
				baseDimensionCode: refUomDimension.code,
				alternateDimensionCode: refUomDimension.code,
			})
			.from(mdItem)
			.innerJoin(refUom, eq(refUom.id, mdItem.baseUomId))
			.innerJoin(refUomDimension, eq(refUomDimension.id, refUom.dimensionId))
			.where(
				and(
					eq(mdItem.id, filter.itemId),
					eq(mdItem.organizationId, filter.organizationId),
				),
			)
			.limit(1);
		if (row === undefined) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (filter.alternateUomId === row.baseUomId) {
			return fail("BAD_REQUEST", "Item UoM conversion duplicates base UoM", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
				field: "alternateUomId",
			} satisfies MasterFailureDetails);
		}
		const [alternate] = await db
			.select({
				id: refUom.id,
				active: refUom.active,
				dimensionCode: refUomDimension.code,
			})
			.from(refUom)
			.innerJoin(refUomDimension, eq(refUomDimension.id, refUom.dimensionId))
			.where(eq(refUom.id, filter.alternateUomId))
			.limit(1);
		if (alternate === undefined) {
			return fail("BAD_REQUEST", "UoM not found", {
				reason: "MASTER_VALIDATION_FAILED",
				field: "alternateUomId",
			} satisfies MasterFailureDetails);
		}
		if (!row.baseUomActive || !alternate.active) {
			return fail("BAD_REQUEST", "UoM must be active", {
				reason: "MASTER_VALIDATION_FAILED",
				field: "alternateUomId",
			} satisfies MasterFailureDetails);
		}
		return ok({
			itemId: row.itemId,
			baseUomId: row.baseUomId,
			alternateUomId: alternate.id,
			baseDimensionCode: row.baseDimensionCode,
			alternateDimensionCode: alternate.dimensionCode,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to resolve item UoM context");
	}
}

export async function drizzleListItemUoms(
	filter: ItemUomListFilter,
): Promise<Result<ExtensionListPage<ItemUom>>> {
	try {
		const rows = await db
			.select()
			.from(mdItemUom)
			.where(
				and(
					eq(mdItemUom.organizationId, filter.organizationId),
					eq(mdItemUom.itemId, filter.itemId),
				),
			)
			.limit(filter.pageSize + 1)
			.offset((filter.page - 1) * filter.pageSize);
		const mapped: ItemUom[] = [];
		for (const row of rows.slice(0, filter.pageSize)) {
			const item = mapItemUomRow(row);
			if (!item.ok) {
				return item;
			}
			mapped.push(item.data);
		}
		return ok({
			items: mapped,
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.pageSize,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to list item UoMs");
	}
}

async function drizzleGetDefaultItemUom(
	filter: ItemUomDefaultFilter,
	usage: "sales" | "purchase",
): Promise<Result<ItemUom | null>> {
	try {
		const defaultCondition =
			usage === "sales"
				? eq(mdItemUom.isDefaultSalesUom, true)
				: eq(mdItemUom.isDefaultPurchaseUom, true);
		const [row] = await db
			.select()
			.from(mdItemUom)
			.where(
				and(
					eq(mdItemUom.organizationId, filter.organizationId),
					eq(mdItemUom.itemId, filter.itemId),
					defaultCondition,
					eq(mdItemUom.status, "active"),
					isNull(mdItemUom.archivedAt),
				),
			)
			.limit(1);
		if (row === undefined) return ok(null);
		return mapItemUomRow(row);
	} catch (error) {
		return failFromUnknown(error, `Failed to get default item ${usage} UoM`);
	}
}

export function drizzleGetDefaultItemSalesUom(
	filter: ItemUomDefaultFilter,
): Promise<Result<ItemUom | null>> {
	return drizzleGetDefaultItemUom(filter, "sales");
}

export function drizzleGetDefaultItemPurchaseUom(
	filter: ItemUomDefaultFilter,
): Promise<Result<ItemUom | null>> {
	return drizzleGetDefaultItemUom(filter, "purchase");
}

export async function drizzleCreateItemUom(
	record: ItemUomCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemUom>> {
	const factor = normalizeItemUomConversionFactor(record.conversionFactor);
	if (!factor.ok) return factor;
	if (
		(record.isDefaultPurchaseUom && !record.isPurchaseUom) ||
		(record.isDefaultSalesUom && !record.isSalesUom)
	) {
		return fail("BAD_REQUEST", "Default UoM usage is inconsistent", {
			reason: "MASTER_INVALID_UOM_CONVERSION",
		} satisfies MasterFailureDetails);
	}
	try {
		const [item] = await db
			.select()
			.from(mdItem)
			.where(
				and(
					eq(mdItem.id, record.itemId),
					eq(mdItem.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (item === undefined) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		const [baseUom] = await db
			.select()
			.from(refUom)
			.where(eq(refUom.id, item.baseUomId))
			.limit(1);
		const [altUom] = await db
			.select()
			.from(refUom)
			.where(eq(refUom.id, record.alternateUomId))
			.limit(1);
		if (baseUom === undefined || altUom === undefined) {
			return fail("BAD_REQUEST", "UoM not found", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (!baseUom.active || !altUom.active) {
			return fail("BAD_REQUEST", "UoM must be active", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (record.alternateUomId === item.baseUomId) {
			return fail("BAD_REQUEST", "Item UoM conversion duplicates base UoM", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
				field: "alternateUomId",
			} satisfies MasterFailureDetails);
		}
		const [baseDimension] = await db
			.select()
			.from(refUomDimension)
			.where(eq(refUomDimension.id, baseUom.dimensionId))
			.limit(1);
		const [alternateDimension] = await db
			.select()
			.from(refUomDimension)
			.where(eq(refUomDimension.id, altUom.dimensionId))
			.limit(1);
		if (baseDimension === undefined || alternateDimension === undefined) {
			return fail("BAD_REQUEST", "UoM dimension not found", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		const compatible = assertItemUomCompatibility({
			baseDimensionCode: baseDimension.code,
			alternateDimensionCode: alternateDimension.code,
			compatibilityMode: record.compatibilityMode,
			packagingApprovalReference: record.packagingApprovalReference,
		});
		if (!compatible.ok) return compatible;
	} catch (error) {
		return failFromUnknown(error, "Failed to validate item UoM");
	}

	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson(
		"alternateUomId",
		null,
		record.alternateUomId,
	);
	const newValueJson = valueSnapshotJson({
		conversionFactor: factor.data,
		isPurchaseUom: record.isPurchaseUom,
		isSalesUom: record.isSalesUom,
		isInventoryUom: record.isInventoryUom,
		isDefaultPurchaseUom: record.isDefaultPurchaseUom,
		isDefaultSalesUom: record.isDefaultSalesUom,
		compatibilityMode: record.compatibilityMode,
		packagingApprovalReference: record.packagingApprovalReference,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_uom",
		entityId: id,
		parentEntityId: record.itemId,
		classification: extensionEventClassification(
			"item_uom",
			record.alternateUomId,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH item_locked AS MATERIALIZED (
						SELECT item.id, item.base_uom_id
						FROM md_item AS item
						WHERE item.organization_id = ${record.organizationId}
							AND item.id = ${record.itemId}
							AND item.status <> 'retired'
							AND item.retired_at IS NULL
						FOR UPDATE
					), eligible AS MATERIALIZED (
						SELECT item_locked.id
						FROM item_locked
						INNER JOIN ref_uom AS base_uom ON base_uom.id = item_locked.base_uom_id
						INNER JOIN ref_uom AS alternate_uom ON alternate_uom.id = ${record.alternateUomId}
						INNER JOIN ref_uom_dimension AS base_dimension
							ON base_dimension.id = base_uom.dimension_id
						INNER JOIN ref_uom_dimension AS alternate_dimension
							ON alternate_dimension.id = alternate_uom.dimension_id
						WHERE base_uom.active = true
							AND alternate_uom.active = true
							AND base_dimension.code = alternate_dimension.code
							AND (${record.alternateUomId} <> item_locked.base_uom_id OR ${factor.data} = 1)
							AND (
								(${record.compatibilityMode} = 'physical_dimension' AND ${record.packagingApprovalReference} IS NULL)
								OR (${record.compatibilityMode} = 'packaging_count'
									AND base_dimension.code = 'count'
									AND ${record.packagingApprovalReference} IS NOT NULL)
							)
					), defaults_demoted AS (
						UPDATE md_item_uom
						SET is_default_purchase_uom = CASE
								WHEN ${record.isDefaultPurchaseUom} THEN false
								ELSE is_default_purchase_uom
							END,
							is_default_sales_uom = CASE
								WHEN ${record.isDefaultSalesUom} THEN false
								ELSE is_default_sales_uom
							END,
							version = version + 1,
							updated_by = ${record.createdBy}, updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND item_id = ${record.itemId}
							AND status = 'active' AND archived_at IS NULL
							AND (
								(${record.isDefaultPurchaseUom} = true AND is_default_purchase_uom = true)
								OR (${record.isDefaultSalesUom} = true AND is_default_sales_uom = true)
							)
							AND EXISTS (SELECT 1 FROM eligible)
						RETURNING id, organization_id, version,
							is_default_purchase_uom, is_default_sales_uom
					), mutated AS (
						INSERT INTO md_item_uom (
							id, organization_id, item_id, alternate_uom_id, conversion_factor,
							rounding_scale, is_purchase_uom, is_sales_uom, is_inventory_uom,
							is_default_purchase_uom, is_default_sales_uom, compatibility_mode,
							packaging_approval_reference, status, version, created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.itemId}, ${record.alternateUomId},
							${factor.data}, ${record.roundingScale}, ${record.isPurchaseUom},
							${record.isSalesUom}, ${record.isInventoryUom}, ${record.isDefaultPurchaseUom},
							${record.isDefaultSalesUom}, ${record.compatibilityMode},
							${record.packagingApprovalReference}, 'active', 1,
							${record.createdBy}, ${record.createdBy}
						FROM eligible
						WHERE (SELECT count(*) FROM defaults_demoted) >= 0
						RETURNING *
					),
					defaults_demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT gen_random_uuid(), organization_id, ${record.createdBy},
							${meta.correlationId}, 'master_data', 'item_uom', id, 'UPDATE',
							${fieldChangeJson("defaultUom", true, false)}::jsonb,
							jsonb_build_object(
								'isDefaultPurchaseUom', is_default_purchase_uom,
								'isDefaultSalesUom', is_default_sales_uom
							)
						FROM defaults_demoted RETURNING id
					), defaults_demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT gen_random_uuid(), organization_id,
							${EXTENSION_EVENT_TYPES.itemUomDefaultsChanged}, 'master_data',
							${meta.correlationId}, ${record.createdBy},
							jsonb_build_object('organizationId', organization_id, 'entityType', 'item_uom',
								'entityId', id,
								'classification', jsonb_build_object('type', 'alternate_uom', 'code', 'defaults'),
								'version', version,
								'actorId', ${record.createdBy}, 'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM defaults_demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'item_uom', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.itemUomCreated}, 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM defaults_demotion_audited) >= 0
						AND (SELECT count(*) FROM defaults_demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			return fail("BAD_REQUEST", "Item UoM conversion is not eligible", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
			} satisfies MasterFailureDetails);
		}
		const mapped = mapItemUomRow({
			id: row.id as string,
			organizationId: row.organization_id as string,
			itemId: row.item_id as string,
			alternateUomId: row.alternate_uom_id as string,
			conversionFactor: row.conversion_factor as string,
			roundingScale: Number(row.rounding_scale),
			isPurchaseUom: Boolean(row.is_purchase_uom),
			isSalesUom: Boolean(row.is_sales_uom),
			isInventoryUom: Boolean(row.is_inventory_uom),
			isDefaultPurchaseUom: Boolean(row.is_default_purchase_uom),
			isDefaultSalesUom: Boolean(row.is_default_sales_uom),
			compatibilityMode: row.compatibility_mode as ItemUom["compatibilityMode"],
			packagingApprovalReference:
				(row.packaging_approval_reference as string | null) ?? null,
			status: row.status as ItemUom["status"],
			version: Number(row.version),
			validFrom: (row.valid_from as Date | null) ?? null,
			validTo: (row.valid_to as Date | null) ?? null,
			archivedAt: (row.archived_at as Date | null) ?? null,
			archivedBy: (row.archived_by as string | null) ?? null,
			createdBy: row.created_by as string,
			updatedBy: row.updated_by as string,
			createdAt: row.created_at as Date,
			updatedAt: row.updated_at as Date,
		} as typeof mdItemUom.$inferSelect);
		return mapped;
	} catch (error) {
		return mapWriteError(
			error,
			"Item UoM conflict",
			"Failed to create item UoM",
			"MASTER_DUPLICATE",
		);
	}
}

export async function drizzleCreateItemBarcode(
	record: ItemBarcodeCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemBarcode>> {
	const normalized = normalizeItemBarcode({
		rawValue: record.barcodeValue,
		symbology: record.symbology,
	});
	if (!normalized.ok) return normalized;
	const packQuantity =
		record.packQuantity === null
			? null
			: normalizeBarcodePackQuantity(record.packQuantity);
	if (packQuantity !== null && !packQuantity.ok) return packQuantity;
	if ((record.uomId === null) !== (packQuantity === null)) {
		return fail(
			"BAD_REQUEST",
			"uomId and packQuantity must be provided together",
			{
				reason: "MASTER_INVALID_BARCODE",
			} satisfies MasterFailureDetails,
		);
	}
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson(
		"barcodeValue",
		null,
		normalized.data.barcodeValue,
	);
	const newValueJson = valueSnapshotJson({
		normalizedValue: normalized.data.normalizedValue,
		symbology: record.symbology,
		uomId: record.uomId,
		packQuantity: packQuantity?.data ?? null,
		isPrimary: record.isPrimary,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_barcode",
		entityId: id,
		parentEntityId: record.itemId,
		classification: extensionEventClassification(
			"item_barcode",
			record.symbology,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT item.id AS parent_id, item.base_uom_id
						FROM md_item AS item
						WHERE item.organization_id = ${record.organizationId}
							AND item.id = ${record.itemId}
							AND item.status <> 'retired'
							AND item.retired_at IS NULL
						FOR UPDATE
					), eligible AS MATERIALIZED (
						SELECT parent_locked.parent_id
						FROM parent_locked
						WHERE (
							(${record.uomId} IS NULL AND ${packQuantity?.data ?? null} IS NULL)
							OR (
								${record.uomId} IS NOT NULL
								AND ${packQuantity?.data ?? null}::numeric > 0
								AND EXISTS (
									SELECT 1 FROM ref_uom AS barcode_uom
									WHERE barcode_uom.id = ${record.uomId}::uuid
										AND barcode_uom.active = true
										AND (
											barcode_uom.id = parent_locked.base_uom_id
											OR EXISTS (
												SELECT 1 FROM md_item_uom AS conversion
												WHERE conversion.organization_id = ${record.organizationId}
													AND conversion.item_id = parent_locked.parent_id
													AND conversion.alternate_uom_id = barcode_uom.id
													AND conversion.status = 'active'
													AND conversion.archived_at IS NULL
											)
										)
								)
							)
						)
					), primary_demoted AS (
						UPDATE md_item_barcode
						SET is_primary = false, version = version + 1,
							updated_by = ${record.createdBy}, updated_at = now()
						WHERE organization_id = ${record.organizationId}
							AND item_id = ${record.itemId}
							AND uom_id IS NOT DISTINCT FROM ${record.uomId}::uuid
							AND is_primary = true
							AND status = 'active' AND archived_at IS NULL
							AND ${record.isPrimary} = true
							AND EXISTS (SELECT 1 FROM eligible)
						RETURNING id, organization_id, version
					),
					mutated AS (
						INSERT INTO md_item_barcode (
							id, organization_id, item_id, barcode_value, normalized_value,
							symbology, uom_id, pack_quantity, is_primary, status, version,
							created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.itemId}, ${normalized.data.barcodeValue},
							${normalized.data.normalizedValue}, ${record.symbology}, ${record.uomId},
							${packQuantity?.data ?? null}, ${record.isPrimary}, 'active', 1,
							${record.createdBy}, ${record.createdBy}
						FROM eligible
						WHERE (SELECT count(*) FROM primary_demoted) >= 0
						RETURNING *
					),
					primary_demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT gen_random_uuid(), organization_id, ${record.createdBy},
							${meta.correlationId}, 'master_data', 'item_barcode', id, 'UPDATE',
							${fieldChangeJson("isPrimary", true, false)}::jsonb,
							${valueSnapshotJson({ isPrimary: false })}::jsonb
						FROM primary_demoted RETURNING id
					), primary_demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT gen_random_uuid(), organization_id,
							${EXTENSION_EVENT_TYPES.itemBarcodePrimaryChanged}, 'master_data',
							${meta.correlationId}, ${record.createdBy},
							jsonb_build_object('organizationId', organization_id, 'entityType', 'item_barcode',
								'entityId', id,
								'classification', jsonb_build_object('type', 'symbology', 'code', 'primary'),
								'version', version,
								'actorId', ${record.createdBy}, 'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM primary_demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'item_barcode', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.itemBarcodeAssigned}, 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM primary_demotion_audited) >= 0
						AND (SELECT count(*) FROM primary_demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			const parent = await requireUsableItemMutationParent(
				record.organizationId,
				record.itemId,
			);
			if (!parent.ok) return parent;
			return fail("BAD_REQUEST", "Item barcode packaging UoM is not eligible", {
				reason: "MASTER_INVALID_BARCODE",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapItemBarcodeRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				itemId: row.item_id as string,
				barcodeValue: row.barcode_value as string,
				normalizedValue: row.normalized_value as string,
				symbology: row.symbology as string,
				uomId: (row.uom_id as string | null) ?? null,
				packQuantity: (row.pack_quantity as string | null) ?? null,
				isPrimary: Boolean(row.is_primary),
				status: row.status as string,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				version: Number(row.version),
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Barcode already exists",
			"Failed to create item barcode",
			"MASTER_DUPLICATE",
		);
	}
}

export async function drizzleFindItemByBarcode(
	filter: ItemBarcodeLookup,
): Promise<Result<Item | null>> {
	try {
		const predicates = [
			eq(mdItemBarcode.organizationId, filter.organizationId),
			eq(mdItemBarcode.symbology, filter.symbology),
			eq(mdItemBarcode.normalizedValue, filter.normalizedValue),
		];
		if (!filter.includeArchived) {
			predicates.push(eq(mdItemBarcode.status, "active"));
			predicates.push(isNull(mdItemBarcode.archivedAt));
		}
		const barcodes = await db
			.select()
			.from(mdItemBarcode)
			.where(and(...predicates))
			.limit(2);
		if (barcodes.length > 1) {
			return fail("CONFLICT", "Barcode resolves to multiple items", {
				reason: "MASTER_DUPLICATE",
				candidateCount: barcodes.length,
			} satisfies MasterFailureDetails);
		}
		const barcode = barcodes[0];
		if (barcode === undefined) return ok(null);

		const [item] = await db
			.select()
			.from(mdItem)
			.where(
				and(
					eq(mdItem.organizationId, filter.organizationId),
					eq(mdItem.id, barcode.itemId),
				),
			)
			.limit(1);
		return ok(item === undefined ? null : mapItem(item));
	} catch (error) {
		return failFromUnknown(error, "Failed to find item by barcode");
	}
}

export async function drizzleCreateItemExternalId(
	record: ItemExternalIdCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemExternalId>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("externalIdentity", null, "[protected]");
	const newValueJson = valueSnapshotJson({
		sourceSystem: record.sourceSystem,
		externalIdType: record.externalIdType,
		caseSensitivity: record.caseSensitivity,
		isPrimary: record.isPrimary,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_external_id",
		entityId: id,
		parentEntityId: record.itemId,
		classification: extensionEventClassification(
			"item_external_id",
			`${record.sourceSystem}:${record.externalIdType}`,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT item.id AS parent_id
						FROM md_item AS item
						WHERE item.organization_id = ${record.organizationId}
							AND item.id = ${record.itemId}
							AND item.status <> 'retired'
							AND item.retired_at IS NULL
						FOR UPDATE
					), demoted AS (
						UPDATE md_item_external_id
						SET is_primary = false, version = version + 1,
							updated_at = now(), updated_by = ${record.createdBy}
						WHERE ${record.isPrimary} = true
							AND organization_id = ${record.organizationId}
							AND item_id = ${record.itemId}
							AND source_system = ${record.sourceSystem}
							AND external_id_type = ${record.externalIdType}
							AND is_primary = true AND status = 'active' AND archived_at IS NULL
							AND EXISTS (SELECT 1 FROM parent_locked)
						RETURNING id, organization_id, version
					), mutated AS (
						INSERT INTO md_item_external_id (
							id, organization_id, item_id, source_system, external_id_type,
							external_value, normalized_value, case_sensitivity, is_primary,
							status, version, created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.itemId}, ${record.sourceSystem},
							${record.externalIdType}, ${record.externalValue}, ${record.normalizedValue},
							${record.caseSensitivity}, ${record.isPrimary}, 'active', 1,
							${record.createdBy}, ${record.createdBy}
						FROM parent_locked
						WHERE (SELECT count(*) FROM demoted) >= 0
						RETURNING *
					),
					demotion_audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT gen_random_uuid(), organization_id, ${record.createdBy},
							${meta.correlationId}, 'master_data', 'item_external_id', id, 'UPDATE',
							${fieldChangeJson("isPrimary", true, false)}::jsonb,
							${valueSnapshotJson({ isPrimary: false })}::jsonb
						FROM demoted RETURNING id
					), demotion_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT gen_random_uuid(), organization_id,
							${EXTENSION_EVENT_TYPES.itemExternalIdPrimaryChanged}, 'master_data',
							${meta.correlationId}, ${record.createdBy},
							jsonb_build_object('organizationId', organization_id,
								'entityType', 'item_external_id', 'entityId', id,
								'classification', jsonb_build_object(
									'type', 'external_id_type',
									'code', ${`${record.sourceSystem}:${record.externalIdType}`}
								),
								'version', version, 'actorId', ${record.createdBy},
								'correlationId', ${meta.correlationId}),
							'pending', 0
						FROM demoted RETURNING id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'item_external_id', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.itemExternalIdAssigned}, 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
					WHERE (SELECT count(*) FROM demotion_audited) >= 0
						AND (SELECT count(*) FROM demotion_outboxed) >= 0
				`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapItemExternalIdRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				itemId: row.item_id as string,
				sourceSystem: row.source_system as string,
				externalIdType: row.external_id_type as string,
				externalValue: row.external_value as string,
				normalizedValue: row.normalized_value as string,
				caseSensitivity: row.case_sensitivity as string,
				isPrimary: Boolean(row.is_primary),
				status: row.status as string,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				version: Number(row.version),
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"External id already exists",
			"Failed to create item external id",
			"MASTER_EXTERNAL_ID_CONFLICT",
		);
	}
}

export async function drizzleFindItemByExternalId(
	filter: ItemExternalIdLookup,
): Promise<Result<Item | null>> {
	try {
		const rows = await db
			.select()
			.from(mdItemExternalId)
			.where(
				and(
					eq(mdItemExternalId.organizationId, filter.organizationId),
					eq(mdItemExternalId.sourceSystem, filter.sourceSystem),
					eq(mdItemExternalId.externalIdType, filter.externalIdType),
					eq(mdItemExternalId.normalizedValue, filter.normalizedValue),
					eq(mdItemExternalId.caseSensitivity, filter.caseSensitivity),
					eq(mdItemExternalId.status, "active"),
					isNull(mdItemExternalId.archivedAt),
				),
			)
			.limit(2);
		if (rows.length > 1) {
			return fail("CONFLICT", "External id resolves to multiple items", {
				reason: "MASTER_DUPLICATE",
				candidateCount: rows.length,
			} satisfies MasterFailureDetails);
		}
		const ext = rows[0];
		if (ext === undefined) {
			return ok(null);
		}
		const [item] = await db
			.select()
			.from(mdItem)
			.where(
				and(
					eq(mdItem.id, ext.itemId),
					eq(mdItem.organizationId, filter.organizationId),
				),
			)
			.limit(1);
		return ok(item === undefined ? null : mapItem(item));
	} catch (error) {
		return failFromUnknown(error, "Failed to find item by external id");
	}
}

export async function drizzleCreateItemAlias(
	record: ItemAliasCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemAlias>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("aliasValue", null, record.aliasValue);
	const newValueJson = valueSnapshotJson({
		aliasType: record.aliasType,
		normalizedValue: record.normalizedValue,
		languageId: record.languageId,
		source: record.source,
		isSearchable: record.isSearchable,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_alias",
		entityId: id,
		parentEntityId: record.itemId,
		classification: extensionEventClassification(
			"item_alias",
			record.aliasType,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT item.id AS parent_id
						FROM md_item AS item
						WHERE item.organization_id = ${record.organizationId}
							AND item.id = ${record.itemId}
							AND item.status <> 'retired'
							AND item.retired_at IS NULL
						FOR UPDATE
					), eligible AS MATERIALIZED (
						SELECT parent_locked.parent_id
						FROM parent_locked
						WHERE ${record.languageId} IS NULL OR EXISTS (
							SELECT 1 FROM ref_language AS language
							WHERE language.id = ${record.languageId}::uuid
								AND language.active = true
						)
					), mutated AS (
						INSERT INTO md_item_alias (
							id, organization_id, item_id, alias_type, alias_value,
							normalized_value, language_id, source, is_searchable,
							status, version, created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.itemId}, ${record.aliasType},
							${record.aliasValue}, ${record.normalizedValue}, ${record.languageId},
							${record.source}, ${record.isSearchable}, 'active', 1,
							${record.createdBy}, ${record.createdBy}
						FROM eligible
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'item_alias', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.itemAliasCreated}, 'master_data',
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
			const parent = await requireUsableItemMutationParent(
				record.organizationId,
				record.itemId,
			);
			if (!parent.ok) return parent;
			return fail("BAD_REQUEST", "Alias language is not active", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapItemAliasRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				itemId: row.item_id as string,
				aliasType: row.alias_type as string,
				aliasValue: row.alias_value as string,
				normalizedValue: row.normalized_value as string,
				languageId: (row.language_id as string | null) ?? null,
				source: row.source as string,
				isSearchable: Boolean(row.is_searchable),
				status: row.status as string,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				legacyRetiredAt: (row.legacy_retired_at as Date | null) ?? null,
				version: Number(row.version),
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Alias already exists",
			"Failed to create item alias",
		);
	}
}

export async function drizzleListItemAliases(
	filter: ItemAliasListFilter,
): Promise<Result<ExtensionListPage<ItemAlias>>> {
	try {
		const rows = await db
			.select()
			.from(mdItemAlias)
			.where(
				and(
					eq(mdItemAlias.organizationId, filter.organizationId),
					eq(mdItemAlias.itemId, filter.itemId),
				),
			)
			.orderBy(asc(mdItemAlias.aliasValue), asc(mdItemAlias.id))
			.limit(filter.pageSize + 1)
			.offset((filter.page - 1) * filter.pageSize);
		return ok({
			items: rows.slice(0, filter.pageSize).map(mapItemAliasRow),
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.pageSize,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to list item aliases");
	}
}

export async function drizzleListItemsByAlias(
	filter: ItemAliasSearchFilter,
): Promise<Result<ExtensionListPage<Item>>> {
	try {
		const predicates = [
			eq(mdItemAlias.organizationId, filter.organizationId),
			eq(mdItemAlias.normalizedValue, filter.normalizedValue),
			eq(mdItemAlias.isSearchable, true),
			eq(mdItemAlias.status, "active"),
			isNull(mdItemAlias.archivedAt),
			eq(mdItem.organizationId, filter.organizationId),
			eq(mdItem.status, "active"),
			isNull(mdItem.retiredAt),
		];
		if (filter.aliasType !== undefined) {
			predicates.push(eq(mdItemAlias.aliasType, filter.aliasType));
		}
		if (filter.languageId !== undefined) {
			predicates.push(
				filter.languageId === null
					? isNull(mdItemAlias.languageId)
					: eq(mdItemAlias.languageId, filter.languageId),
			);
		}
		const rows = await db
			.selectDistinct({ item: mdItem })
			.from(mdItemAlias)
			.innerJoin(
				mdItem,
				and(
					eq(mdItem.id, mdItemAlias.itemId),
					eq(mdItem.organizationId, mdItemAlias.organizationId),
				),
			)
			.where(and(...predicates))
			.orderBy(asc(mdItem.code), asc(mdItem.id))
			.limit(filter.pageSize + 1)
			.offset((filter.page - 1) * filter.pageSize);
		return ok({
			items: rows.slice(0, filter.pageSize).map((row) => mapItem(row.item)),
			page: filter.page,
			pageSize: filter.pageSize,
			hasNextPage: rows.length > filter.pageSize,
		});
	} catch (error) {
		return failFromUnknown(error, "Failed to list items by alias");
	}
}

export async function drizzleFindItemByAlias(
	filter: ItemAliasLookup,
): Promise<Result<Item | null>> {
	const matches = await drizzleListItemsByAlias({
		...filter,
		page: 1,
		pageSize: 2,
	});
	if (!matches.ok) return matches;
	if (matches.data.items.length > 1) {
		return fail("CONFLICT", "Alias resolves to multiple active items", {
			reason: "MASTER_DUPLICATE",
			candidateCount: matches.data.items.length,
		} satisfies MasterFailureDetails);
	}
	return ok(matches.data.items[0] ?? null);
}

export async function drizzleCreateWarehouseExternalId(
	record: WarehouseExternalIdCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<WarehouseExternalId>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("externalIdentity", null, "[protected]");
	const newValueJson = valueSnapshotJson({
		sourceSystem: record.sourceSystem,
		externalIdType: record.externalIdType,
		caseSensitivity: record.caseSensitivity,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "warehouse_external_id",
		entityId: id,
		parentEntityId: record.warehouseId,
		classification: extensionEventClassification(
			"warehouse_external_id",
			`${record.sourceSystem}:${record.externalIdType}`,
		),
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH parent_locked AS MATERIALIZED (
						SELECT warehouse.id AS parent_id
						FROM md_warehouse AS warehouse
						WHERE warehouse.organization_id = ${record.organizationId}
							AND warehouse.id = ${record.warehouseId}
							AND warehouse.status <> 'retired'
							AND warehouse.retired_at IS NULL
						FOR UPDATE
					), mutated AS (
						INSERT INTO md_warehouse_external_id (
							id, organization_id, warehouse_id, source_system, external_id_type,
							external_value, normalized_value, case_sensitivity, status, version,
							created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.warehouseId}, ${record.sourceSystem},
							${record.externalIdType}, ${record.externalValue}, ${record.normalizedValue},
							${record.caseSensitivity}, 'active', 1, ${record.createdBy}, ${record.createdBy}
						FROM parent_locked
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'warehouse_external_id', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.warehouseExternalIdAssigned}, 'master_data',
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
			return fail("NOT_FOUND", "Warehouse not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		return ok(
			mapWarehouseExternalIdRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				warehouseId: row.warehouse_id as string,
				sourceSystem: row.source_system as string,
				externalIdType: row.external_id_type as string,
				externalValue: row.external_value as string,
				normalizedValue: row.normalized_value as string,
				caseSensitivity: row.case_sensitivity as string,
				status: row.status as string,
				archivedAt: (row.archived_at as Date | null) ?? null,
				archivedBy: (row.archived_by as string | null) ?? null,
				version: Number(row.version),
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"External ID already exists",
			"Failed to create warehouse external ID",
			"MASTER_EXTERNAL_ID_CONFLICT",
		);
	}
}

export async function drizzleFindWarehouseByExternalId(
	organizationId: string,
	sourceSystem: string,
	externalIdType: string,
	normalizedValue: string,
): Promise<Result<Warehouse | null>> {
	try {
		const matches = await db
			.select()
			.from(mdWarehouseExternalId)
			.where(
				and(
					eq(mdWarehouseExternalId.organizationId, organizationId),
					eq(mdWarehouseExternalId.sourceSystem, sourceSystem),
					eq(mdWarehouseExternalId.externalIdType, externalIdType),
					eq(mdWarehouseExternalId.normalizedValue, normalizedValue),
					eq(mdWarehouseExternalId.status, "active"),
					isNull(mdWarehouseExternalId.archivedAt),
				),
			)
			.limit(2);
		if (matches.length > 1) {
			return fail("CONFLICT", "External ID resolves to multiple warehouses", {
				reason: "MASTER_EXTERNAL_ID_CONFLICT",
				candidateCount: matches.length,
			} satisfies MasterFailureDetails);
		}
		const ext = matches[0];
		if (ext === undefined) {
			return ok(null);
		}
		const [warehouse] = await db
			.select()
			.from(mdWarehouse)
			.where(
				and(
					eq(mdWarehouse.id, ext.warehouseId),
					eq(mdWarehouse.organizationId, organizationId),
					eq(mdWarehouse.status, "active"),
					isNull(mdWarehouse.retiredAt),
				),
			)
			.limit(1);
		return ok(warehouse === undefined ? null : mapWarehouse(warehouse));
	} catch (error) {
		return failFromUnknown(error, "Failed to find warehouse by external ID");
	}
}
