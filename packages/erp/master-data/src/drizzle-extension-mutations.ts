/**
 * Same-TX CTE helpers for aggregate extension mutations.
 * Neon HTTP: entity + audit + outbox in one round-trip.
 */
import { randomUUID } from "node:crypto";

import {
	and,
	db,
	eq,
	isNull,
	mdItem,
	mdItemAlias,
	type mdItemBarcode,
	mdItemExternalId,
	mdItemUom,
	mdParty,
	mdPartyAddress,
	mdPartyContact,
	mdPartyExternalId,
	type mdPartyRelationship,
	mdPartyRole,
	mdWarehouse,
	mdWarehouseExternalId,
	refUom,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "./contracts/reasons";
import { mapItem, mapParty, mapWarehouse } from "./map-row";
import type { MutationPorts } from "./ports";
import type { LifecycleRecord } from "./store";
import type {
	ItemAliasCreateRecord,
	ItemBarcodeCreateRecord,
	ItemExternalIdCreateRecord,
	ItemUomCreateRecord,
	ParentListFilter,
	PartyAddressCreateRecord,
	PartyAddressUpdateRecord,
	PartyContactCreateRecord,
	PartyContactUpdateRecord,
	PartyExternalIdCreateRecord,
	PartyRelationshipCreateRecord,
	PartyRoleCreateRecord,
	WarehouseExternalIdCreateRecord,
} from "./store-extension-records";
import type {
	Item,
	ItemAlias,
	ItemBarcode,
	ItemExternalId,
	ItemUom,
	ItemUomUsage,
	MasterStatus,
	Party,
	PartyAddress,
	PartyContact,
	PartyExternalId,
	PartyRelationship,
	PartyRole,
	PartyRoleCode,
	Warehouse,
	WarehouseExternalId,
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

function mapWriteError(
	error: unknown,
	uniqueMessage: string,
	fallbackMessage: string,
): Result<never> {
	if (isUniqueViolation(error)) {
		return fail("CONFLICT", uniqueMessage, {
			reason: "MASTER_CODE_CONFLICT",
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

function mapPartyRole(row: typeof mdPartyRole.$inferSelect): PartyRole {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		roleCode: row.roleCode as PartyRoleCode,
		status: row.status as MasterStatus,
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		activatedAt: row.activatedAt,
		activatedBy: row.activatedBy,
		retiredAt: row.retiredAt,
		retiredBy: row.retiredBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyAddress(
	row: typeof mdPartyAddress.$inferSelect,
): PartyAddress {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		addressType: row.addressType,
		line1: row.line1,
		line2: row.line2,
		city: row.city,
		region: row.region,
		postalCode: row.postalCode,
		countryId: row.countryId,
		isDefault: row.isDefault,
		verificationStatus: row.verificationStatus,
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyContact(
	row: typeof mdPartyContact.$inferSelect,
): PartyContact {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		contactType: row.contactType,
		value: row.value,
		purpose: row.purpose,
		isPrimary: row.isPrimary,
		verificationStatus: row.verificationStatus,
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyExternalIdRow(
	row: typeof mdPartyExternalId.$inferSelect,
): PartyExternalId {
	return {
		id: row.id,
		organizationId: row.organizationId,
		partyId: row.partyId,
		system: row.system,
		namespace: row.namespace,
		externalId: row.externalId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapPartyRelationshipRow(
	row: typeof mdPartyRelationship.$inferSelect,
): PartyRelationship {
	return {
		id: row.id,
		organizationId: row.organizationId,
		fromPartyId: row.fromPartyId,
		toPartyId: row.toPartyId,
		relationshipType: row.relationshipType,
		status: row.status,
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemUomRow(row: typeof mdItemUom.$inferSelect): ItemUom {
	return {
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		uomId: row.uomId,
		toBaseNumerator: String(row.toBaseNumerator),
		toBaseDenominator: String(row.toBaseDenominator),
		usage: row.usage as ItemUomUsage,
		barcode: row.barcode,
		roundingRule: row.roundingRule,
		minQuantity: row.minQuantity === null ? null : String(row.minQuantity),
		version: row.version,
		validFrom: row.validFrom,
		validTo: row.validTo,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemBarcodeRow(
	row: typeof mdItemBarcode.$inferSelect,
): ItemBarcode {
	return {
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		barcode: row.barcode,
		barcodeType: row.barcodeType,
		isPrimary: row.isPrimary,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemExternalIdRow(
	row: typeof mdItemExternalId.$inferSelect,
): ItemExternalId {
	return {
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		system: row.system,
		namespace: row.namespace,
		externalId: row.externalId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemAliasRow(row: typeof mdItemAlias.$inferSelect): ItemAlias {
	return {
		id: row.id,
		organizationId: row.organizationId,
		itemId: row.itemId,
		aliasCode: row.aliasCode,
		normalizedAlias: row.normalizedAlias,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		retiredAt: row.retiredAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapWarehouseExternalIdRow(
	row: typeof mdWarehouseExternalId.$inferSelect,
): WarehouseExternalId {
	return {
		id: row.id,
		organizationId: row.organizationId,
		warehouseId: row.warehouseId,
		system: row.system,
		namespace: row.namespace,
		externalId: row.externalId,
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
					isNull(mdPartyRole.retiredAt),
				),
			);
		return ok(rows.length);
	} catch (error) {
		return failFromUnknown(error, "Failed to count active party roles");
	}
}

export async function drizzleListPartyRoles(
	filter: ParentListFilter,
): Promise<Result<PartyRole[]>> {
	try {
		const rows = await db
			.select()
			.from(mdPartyRole)
			.where(
				and(
					eq(mdPartyRole.organizationId, filter.organizationId),
					eq(mdPartyRole.partyId, filter.parentId),
				),
			)
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);
		return ok(rows.map(mapPartyRole));
	} catch (error) {
		return failFromUnknown(error, "Failed to list party roles");
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
		code: record.roleCode,
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
						${eventId}, organization_id, 'master_data.party_role.created.v1', 'master_data',
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

export async function drizzleTransitionPartyRole(
	record: LifecycleRecord,
	_ports: MutationPorts,
	meta: { correlationId: string; eventSuffix: string },
): Promise<Result<PartyRole>> {
	const auditId = randomUUID();
	const eventId = randomUUID();
	const eventType = `master_data.party_role.${meta.eventSuffix}.v1`;
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
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Party role version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
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
			code: existing.roleCode,
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
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
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
						retired_by = ${retiredBy}
					WHERE id = ${record.id}
						AND organization_id = ${record.organizationId}
						AND version = ${record.expectedVersion}
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
						${valueSnapshotJson({ status: record.toStatus })}::jsonb
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
	const changesJson = fieldChangeJson("line1", null, record.line1);
	const newValueJson = valueSnapshotJson({ line1: record.line1 });
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_address",
		entityId: id,
		code: record.addressType,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_party_address (
							id, organization_id, party_id, address_type, line1, line2, city, region,
							postal_code, country_id, is_default, verification_status, version,
							created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.partyId}, ${record.addressType},
							${record.line1}, ${record.line2 ?? null}, ${record.city}, ${record.region ?? null},
							${record.postalCode ?? null}, ${record.countryId}, ${record.isDefault ?? false},
							'unverified', 1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.party_address.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Party address create returned no row");
		}
		return ok(
			mapPartyAddress({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				addressType: row.address_type as string,
				line1: row.line1 as string,
				line2: (row.line2 as string | null) ?? null,
				city: row.city as string,
				region: (row.region as string | null) ?? null,
				postalCode: (row.postal_code as string | null) ?? null,
				countryId: row.country_id as string,
				isDefault: Boolean(row.is_default),
				verificationStatus: row.verification_status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
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
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Party address version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		const nextLine1 = record.line1 ?? existing.line1;
		const nextType = record.addressType ?? existing.addressType;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("line1", existing.line1, nextLine1);
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party_address",
			entityId: record.id,
			code: nextType,
			version: existing.version + 1,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						UPDATE md_party_address
						SET address_type = ${nextType},
							line1 = ${nextLine1},
							line2 = ${record.line2 !== undefined ? record.line2 : existing.line2},
							city = ${record.city ?? existing.city},
							region = ${record.region !== undefined ? record.region : existing.region},
							postal_code = ${
								record.postalCode !== undefined
									? record.postalCode
									: existing.postalCode
							},
							country_id = ${record.countryId ?? existing.countryId},
							is_default = ${record.isDefault ?? existing.isDefault},
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
							${eventId}, organization_id, 'master_data.party_address.updated.v1', 'master_data',
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
				line1: row.line1 as string,
				line2: (row.line2 as string | null) ?? null,
				city: row.city as string,
				region: (row.region as string | null) ?? null,
				postalCode: (row.postal_code as string | null) ?? null,
				countryId: row.country_id as string,
				isDefault: Boolean(row.is_default),
				verificationStatus: row.verification_status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
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

export async function drizzleCreatePartyContact(
	record: PartyContactCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyContact>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("value", null, record.value);
	const newValueJson = valueSnapshotJson({ value: record.value });
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_contact",
		entityId: id,
		code: record.contactType,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_party_contact (
							id, organization_id, party_id, contact_type, value, purpose, is_primary,
							verification_status, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.partyId}, ${record.contactType},
							${record.value}, ${record.purpose ?? null}, ${record.isPrimary ?? false},
							'unverified', 1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.party_contact.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Party contact create returned no row");
		}
		return ok(
			mapPartyContact({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				contactType: row.contact_type as string,
				value: row.value as string,
				purpose: (row.purpose as string | null) ?? null,
				isPrimary: Boolean(row.is_primary),
				verificationStatus: row.verification_status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
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
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Party contact version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		const nextValue = record.value ?? existing.value;
		const nextType = record.contactType ?? existing.contactType;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("value", existing.value, nextValue);
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "party_contact",
			entityId: record.id,
			code: nextType,
			version: existing.version + 1,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						UPDATE md_party_contact
						SET contact_type = ${nextType},
							value = ${nextValue},
							purpose = ${record.purpose !== undefined ? record.purpose : existing.purpose},
							is_primary = ${record.isPrimary ?? existing.isPrimary},
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
							${eventId}, organization_id, 'master_data.party_contact.updated.v1', 'master_data',
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
				purpose: (row.purpose as string | null) ?? null,
				isPrimary: Boolean(row.is_primary),
				verificationStatus: row.verification_status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
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
	const changesJson = fieldChangeJson("externalId", null, record.externalId);
	const newValueJson = valueSnapshotJson({
		system: record.system,
		externalId: record.externalId,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_external_id",
		entityId: id,
		code: record.externalId,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_party_external_id (
							id, organization_id, party_id, system, namespace, external_id, version,
							created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.partyId}, ${record.system},
							${record.namespace}, ${record.externalId}, 1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.party_external_id.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Party external id create returned no row");
		}
		return ok(
			mapPartyExternalIdRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				partyId: row.party_id as string,
				system: row.system as string,
				namespace: row.namespace as string,
				externalId: row.external_id as string,
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
			"Failed to create party external id",
		);
	}
}

export async function drizzleFindPartyByExternalId(
	organizationId: string,
	system: string,
	namespace: string,
	externalId: string,
): Promise<Result<Party | null>> {
	try {
		const [ext] = await db
			.select()
			.from(mdPartyExternalId)
			.where(
				and(
					eq(mdPartyExternalId.organizationId, organizationId),
					eq(mdPartyExternalId.system, system),
					eq(mdPartyExternalId.namespace, namespace),
					eq(mdPartyExternalId.externalId, externalId),
				),
			)
			.limit(1);
		if (ext === undefined) {
			return ok(null);
		}
		const [party] = await db
			.select()
			.from(mdParty)
			.where(
				and(
					eq(mdParty.id, ext.partyId),
					eq(mdParty.organizationId, organizationId),
				),
			)
			.limit(1);
		return ok(party === undefined ? null : mapParty(party));
	} catch (error) {
		return failFromUnknown(error, "Failed to find party by external id");
	}
}

export async function drizzleCreatePartyRelationship(
	record: PartyRelationshipCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<PartyRelationship>> {
	if (record.fromPartyId === record.toPartyId) {
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
		relationshipType: record.relationshipType,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "party_relationship",
		entityId: id,
		code: record.relationshipType,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_party_relationship (
							id, organization_id, from_party_id, to_party_id, relationship_type,
							status, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.fromPartyId}, ${record.toPartyId},
							${record.relationshipType}, 'active', 1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.party_relationship.created.v1', 'master_data',
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
				"Party relationship create returned no row",
			);
		}
		return ok(
			mapPartyRelationshipRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				fromPartyId: row.from_party_id as string,
				toPartyId: row.to_party_id as string,
				relationshipType: row.relationship_type as string,
				status: row.status as string,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Party relationship already exists",
			"Failed to create party relationship",
		);
	}
}

export async function drizzleListItemUoms(
	filter: ParentListFilter,
): Promise<Result<ItemUom[]>> {
	try {
		const rows = await db
			.select()
			.from(mdItemUom)
			.where(
				and(
					eq(mdItemUom.organizationId, filter.organizationId),
					eq(mdItemUom.itemId, filter.parentId),
				),
			)
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);
		return ok(rows.map(mapItemUomRow));
	} catch (error) {
		return failFromUnknown(error, "Failed to list item UoMs");
	}
}

export async function drizzleCreateItemUom(
	record: ItemUomCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemUom>> {
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
			.where(eq(refUom.id, record.uomId))
			.limit(1);
		if (baseUom === undefined || altUom === undefined) {
			return fail("BAD_REQUEST", "UoM not found", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (baseUom.dimensionId !== altUom.dimensionId) {
			return fail("BAD_REQUEST", "UoM dimension mismatch", {
				reason: "MASTER_INVALID_UOM_CONVERSION",
			} satisfies MasterFailureDetails);
		}
	} catch (error) {
		return failFromUnknown(error, "Failed to validate item UoM");
	}

	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("uomId", null, record.uomId);
	const newValueJson = valueSnapshotJson({ usage: record.usage });
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_uom",
		entityId: id,
		code: record.usage,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_item_uom (
							id, organization_id, item_id, uom_id, to_base_numerator, to_base_denominator,
							usage, barcode, rounding_rule, min_quantity, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.itemId}, ${record.uomId},
							${record.toBaseNumerator}, ${record.toBaseDenominator}, ${record.usage},
							${record.barcode ?? null}, ${record.roundingRule ?? null}, ${record.minQuantity ?? null},
							1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.item_uom.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Item UoM create returned no row");
		}
		return ok(
			mapItemUomRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				itemId: row.item_id as string,
				uomId: row.uom_id as string,
				toBaseNumerator: row.to_base_numerator as string,
				toBaseDenominator: row.to_base_denominator as string,
				usage: row.usage as string,
				barcode: (row.barcode as string | null) ?? null,
				roundingRule: (row.rounding_rule as string | null) ?? null,
				minQuantity: (row.min_quantity as string | null) ?? null,
				version: Number(row.version),
				validFrom: (row.valid_from as Date | null) ?? null,
				validTo: (row.valid_to as Date | null) ?? null,
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				createdAt: row.created_at as Date,
				updatedAt: row.updated_at as Date,
			}),
		);
	} catch (error) {
		return mapWriteError(
			error,
			"Item UoM conflict",
			"Failed to create item UoM",
		);
	}
}

export async function drizzleCreateItemBarcode(
	record: ItemBarcodeCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemBarcode>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("barcode", null, record.barcode);
	const newValueJson = valueSnapshotJson({ barcode: record.barcode });
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_barcode",
		entityId: id,
		code: record.barcode,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_item_barcode (
							id, organization_id, item_id, barcode, barcode_type, is_primary, version,
							created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.itemId}, ${record.barcode},
							${record.barcodeType}, ${record.isPrimary ?? false}, 1,
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
							${eventId}, organization_id, 'master_data.item_barcode.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Item barcode create returned no row");
		}
		return ok(
			mapItemBarcodeRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				itemId: row.item_id as string,
				barcode: row.barcode as string,
				barcodeType: row.barcode_type as string,
				isPrimary: Boolean(row.is_primary),
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
		);
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
	const changesJson = fieldChangeJson("externalId", null, record.externalId);
	const newValueJson = valueSnapshotJson({
		system: record.system,
		externalId: record.externalId,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_external_id",
		entityId: id,
		code: record.externalId,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_item_external_id (
							id, organization_id, item_id, system, namespace, external_id, version,
							created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.itemId}, ${record.system},
							${record.namespace}, ${record.externalId}, 1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.item_external_id.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Item external id create returned no row");
		}
		return ok(
			mapItemExternalIdRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				itemId: row.item_id as string,
				system: row.system as string,
				namespace: row.namespace as string,
				externalId: row.external_id as string,
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
		);
	}
}

export async function drizzleFindItemByExternalId(
	organizationId: string,
	system: string,
	namespace: string,
	externalId: string,
): Promise<Result<Item | null>> {
	try {
		const [ext] = await db
			.select()
			.from(mdItemExternalId)
			.where(
				and(
					eq(mdItemExternalId.organizationId, organizationId),
					eq(mdItemExternalId.system, system),
					eq(mdItemExternalId.namespace, namespace),
					eq(mdItemExternalId.externalId, externalId),
				),
			)
			.limit(1);
		if (ext === undefined) {
			return ok(null);
		}
		const [item] = await db
			.select()
			.from(mdItem)
			.where(
				and(
					eq(mdItem.id, ext.itemId),
					eq(mdItem.organizationId, organizationId),
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
	const changesJson = fieldChangeJson("aliasCode", null, record.aliasCode);
	const newValueJson = valueSnapshotJson({
		normalizedAlias: record.normalizedAlias,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_alias",
		entityId: id,
		code: record.aliasCode,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_item_alias (
							id, organization_id, item_id, alias_code, normalized_alias, version,
							created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.itemId}, ${record.aliasCode},
							${record.normalizedAlias}, 1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.item_alias.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Item alias create returned no row");
		}
		return ok(
			mapItemAliasRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				itemId: row.item_id as string,
				aliasCode: row.alias_code as string,
				normalizedAlias: row.normalized_alias as string,
				version: Number(row.version),
				createdBy: row.created_by as string,
				updatedBy: row.updated_by as string,
				retiredAt: (row.retired_at as Date | null) ?? null,
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

export async function drizzleFindItemByAlias(
	organizationId: string,
	normalizedAlias: string,
): Promise<Result<Item | null>> {
	try {
		const [alias] = await db
			.select()
			.from(mdItemAlias)
			.where(
				and(
					eq(mdItemAlias.organizationId, organizationId),
					eq(mdItemAlias.normalizedAlias, normalizedAlias),
					isNull(mdItemAlias.retiredAt),
				),
			)
			.limit(1);
		if (alias === undefined) {
			return ok(null);
		}
		const [item] = await db
			.select()
			.from(mdItem)
			.where(
				and(
					eq(mdItem.id, alias.itemId),
					eq(mdItem.organizationId, organizationId),
				),
			)
			.limit(1);
		return ok(item === undefined ? null : mapItem(item));
	} catch (error) {
		return failFromUnknown(error, "Failed to find item by alias");
	}
}

export async function drizzleCreateWarehouseExternalId(
	record: WarehouseExternalIdCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<WarehouseExternalId>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("externalId", null, record.externalId);
	const newValueJson = valueSnapshotJson({
		system: record.system,
		externalId: record.externalId,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "warehouse_external_id",
		entityId: id,
		code: record.externalId,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_warehouse_external_id (
							id, organization_id, warehouse_id, system, namespace, external_id, version,
							created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.warehouseId}, ${record.system},
							${record.namespace}, ${record.externalId}, 1, ${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, 'master_data.warehouse_external_id.created.v1', 'master_data',
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
				"Warehouse external id create returned no row",
			);
		}
		return ok(
			mapWarehouseExternalIdRow({
				id: row.id as string,
				organizationId: row.organization_id as string,
				warehouseId: row.warehouse_id as string,
				system: row.system as string,
				namespace: row.namespace as string,
				externalId: row.external_id as string,
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
			"Failed to create warehouse external id",
		);
	}
}

export async function drizzleFindWarehouseByExternalId(
	organizationId: string,
	system: string,
	namespace: string,
	externalId: string,
): Promise<Result<Warehouse | null>> {
	try {
		const [ext] = await db
			.select()
			.from(mdWarehouseExternalId)
			.where(
				and(
					eq(mdWarehouseExternalId.organizationId, organizationId),
					eq(mdWarehouseExternalId.system, system),
					eq(mdWarehouseExternalId.namespace, namespace),
					eq(mdWarehouseExternalId.externalId, externalId),
				),
			)
			.limit(1);
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
				),
			)
			.limit(1);
		return ok(warehouse === undefined ? null : mapWarehouse(warehouse));
	} catch (error) {
		return failFromUnknown(error, "Failed to find warehouse by external id");
	}
}
