/**
 * Same-TX CTE helpers for item template / variant mutations.
 * Neon HTTP: entity + audit + outbox in one round-trip.
 *
 * Item retire + variant membership (appendVariantRetireToItemTransition):
 * When transitioning an item to `retired`, the same SQL string must also:
 *   1. CTE `variant_retired` — UPDATE md_item_variant SET retired_at=now(),
 *      retired_by, version+1 WHERE item_id AND retired_at IS NULL
 *   2. CTE `variant_outboxed` — INSERT platform_domain_event
 *      type master_data.item_variant.retired.v1 FROM variant_retired
 * Data-modifying CTEs run even when not selected in the final SELECT.
 * Prefer `drizzleTransitionItemWithVariantSideEffect` over bare transitionItem.
 */
import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	eq,
	inArray,
	isNull,
	mdItem,
	mdItemGroup,
	mdItemTemplate,
	mdItemTemplateAttribute,
	mdItemTemplateAttributeOption,
	mdItemVariant,
	mdItemVariantAttributeValue,
	refUom,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "./contracts/reasons";
import { mapItem } from "./map-row";
import type { MutationPorts } from "./ports";
import type { LifecycleRecord, ListFilter } from "./store";
import type {
	ItemTemplateAttributeCreateRecord,
	ItemTemplateAttributeOptionCreateRecord,
	ItemTemplateCreateRecord,
	ItemTemplateUpdateRecord,
	ItemVariantCreateRecord,
	ListItemVariantsFilter,
} from "./store-variant-records";
import type {
	Item,
	ItemTemplate,
	ItemTemplateAttribute,
	ItemTemplateAttributeOption,
	ItemTemplateAttributeValueKind,
	ItemVariant,
	ItemVariantAttributeValue,
	MasterStatus,
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

function mapItemTemplate(
	row: typeof mdItemTemplate.$inferSelect,
): ItemTemplate {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		status: row.status as MasterStatus,
		version: row.version,
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

function mapItemTemplateFromSql(row: Record<string, unknown>): ItemTemplate {
	return mapItemTemplate({
		id: row.id as string,
		organizationId: row.organization_id as string,
		code: row.code as string,
		normalizedCode: row.normalized_code as string,
		name: row.name as string,
		status: row.status as string,
		version: Number(row.version),
		createdBy: row.created_by as string,
		updatedBy: row.updated_by as string,
		activatedAt: (row.activated_at as Date | null) ?? null,
		activatedBy: (row.activated_by as string | null) ?? null,
		retiredAt: (row.retired_at as Date | null) ?? null,
		retiredBy: (row.retired_by as string | null) ?? null,
		createdAt: row.created_at as Date,
		updatedAt: row.updated_at as Date,
	});
}

function mapItemTemplateAttribute(
	row: typeof mdItemTemplateAttribute.$inferSelect,
): ItemTemplateAttribute {
	return {
		id: row.id,
		organizationId: row.organizationId,
		templateId: row.templateId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		valueKind: row.valueKind as ItemTemplateAttributeValueKind,
		isRequired: row.isRequired,
		sortOrder: row.sortOrder,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemTemplateAttributeFromSql(
	row: Record<string, unknown>,
): ItemTemplateAttribute {
	return mapItemTemplateAttribute({
		id: row.id as string,
		organizationId: row.organization_id as string,
		templateId: row.template_id as string,
		code: row.code as string,
		normalizedCode: row.normalized_code as string,
		name: row.name as string,
		valueKind: row.value_kind as string,
		isRequired: Boolean(row.is_required),
		sortOrder: Number(row.sort_order),
		version: Number(row.version),
		createdBy: row.created_by as string,
		updatedBy: row.updated_by as string,
		createdAt: row.created_at as Date,
		updatedAt: row.updated_at as Date,
	});
}

function mapItemTemplateAttributeOption(
	row: typeof mdItemTemplateAttributeOption.$inferSelect,
): ItemTemplateAttributeOption {
	return {
		id: row.id,
		organizationId: row.organizationId,
		attributeId: row.attributeId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		label: row.label,
		sortOrder: row.sortOrder,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemTemplateAttributeOptionFromSql(
	row: Record<string, unknown>,
): ItemTemplateAttributeOption {
	return mapItemTemplateAttributeOption({
		id: row.id as string,
		organizationId: row.organization_id as string,
		attributeId: row.attribute_id as string,
		code: row.code as string,
		normalizedCode: row.normalized_code as string,
		label: row.label as string,
		sortOrder: Number(row.sort_order),
		version: Number(row.version),
		createdBy: row.created_by as string,
		updatedBy: row.updated_by as string,
		createdAt: row.created_at as Date,
		updatedAt: row.updated_at as Date,
	});
}

function mapItemVariantAttributeValue(
	row: typeof mdItemVariantAttributeValue.$inferSelect,
): ItemVariantAttributeValue {
	return {
		id: row.id,
		organizationId: row.organizationId,
		variantId: row.variantId,
		attributeId: row.attributeId,
		valueText: row.valueText,
		optionId: row.optionId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemVariantAttributeValueFromSql(
	row: Record<string, unknown>,
): ItemVariantAttributeValue {
	return mapItemVariantAttributeValue({
		id: row.id as string,
		organizationId: row.organization_id as string,
		variantId: row.variant_id as string,
		attributeId: row.attribute_id as string,
		valueText: (row.value_text as string | null) ?? null,
		optionId: (row.option_id as string | null) ?? null,
		version: Number(row.version),
		createdBy: row.created_by as string,
		updatedBy: row.updated_by as string,
		createdAt: row.created_at as Date,
		updatedAt: row.updated_at as Date,
	});
}

function mapItemFromSql(row: Record<string, unknown>): Item {
	return mapItem({
		id: row.id as string,
		organizationId: row.organization_id as string,
		code: row.code as string,
		normalizedCode: row.normalized_code as string,
		name: row.name as string,
		itemType: row.item_type as string,
		status: row.status as string,
		version: Number(row.version),
		baseUomId: row.base_uom_id as string,
		itemGroupId: row.item_group_id as string,
		createdBy: row.created_by as string,
		updatedBy: row.updated_by as string,
		activatedAt: (row.activated_at as Date | null) ?? null,
		activatedBy: (row.activated_by as string | null) ?? null,
		retiredAt: (row.retired_at as Date | null) ?? null,
		retiredBy: (row.retired_by as string | null) ?? null,
		createdAt: row.created_at as Date,
		updatedAt: row.updated_at as Date,
	});
}

function mapItemVariantMembership(
	variant: typeof mdItemVariant.$inferSelect,
	item: Item,
	values: ItemVariantAttributeValue[],
): ItemVariant {
	return {
		id: variant.id,
		organizationId: variant.organizationId,
		itemId: variant.itemId,
		templateId: variant.templateId,
		combinationKey: variant.combinationKey,
		version: variant.version,
		createdBy: variant.createdBy,
		updatedBy: variant.updatedBy,
		retiredAt: variant.retiredAt,
		retiredBy: variant.retiredBy,
		createdAt: variant.createdAt,
		updatedAt: variant.updatedAt,
		item,
		values,
	};
}

async function loadVariantValues(
	organizationId: string,
	variantIds: string[],
): Promise<Result<Map<string, ItemVariantAttributeValue[]>>> {
	if (variantIds.length === 0) {
		return ok(new Map());
	}
	try {
		const rows = await db
			.select()
			.from(mdItemVariantAttributeValue)
			.where(
				and(
					eq(mdItemVariantAttributeValue.organizationId, organizationId),
					inArray(mdItemVariantAttributeValue.variantId, variantIds),
				),
			)
			.orderBy(
				asc(mdItemVariantAttributeValue.attributeId),
				asc(mdItemVariantAttributeValue.id),
			);
		const byVariant = new Map<string, ItemVariantAttributeValue[]>();
		for (const row of rows) {
			const mapped = mapItemVariantAttributeValue(row);
			const list = byVariant.get(mapped.variantId) ?? [];
			list.push(mapped);
			byVariant.set(mapped.variantId, list);
		}
		return ok(byVariant);
	} catch (error) {
		return failFromUnknown(
			error,
			"Failed to load item variant attribute values",
		);
	}
}

export async function drizzleGetItemTemplateById(
	organizationId: string,
	id: string,
): Promise<Result<ItemTemplate | null>> {
	try {
		const [row] = await db
			.select()
			.from(mdItemTemplate)
			.where(
				and(
					eq(mdItemTemplate.id, id),
					eq(mdItemTemplate.organizationId, organizationId),
				),
			)
			.limit(1);
		return ok(row === undefined ? null : mapItemTemplate(row));
	} catch (error) {
		return failFromUnknown(error, "Failed to load item template");
	}
}

export async function drizzleGetItemTemplateByCode(
	organizationId: string,
	normalizedCode: string,
): Promise<Result<ItemTemplate | null>> {
	try {
		const [row] = await db
			.select()
			.from(mdItemTemplate)
			.where(
				and(
					eq(mdItemTemplate.organizationId, organizationId),
					eq(mdItemTemplate.normalizedCode, normalizedCode),
					isNull(mdItemTemplate.retiredAt),
				),
			)
			.limit(1);
		return ok(row === undefined ? null : mapItemTemplate(row));
	} catch (error) {
		return failFromUnknown(error, "Failed to load item template by code");
	}
}

export async function drizzleListItemTemplates(
	filter: ListFilter,
): Promise<Result<ItemTemplate[]>> {
	try {
		const predicates = [
			eq(mdItemTemplate.organizationId, filter.organizationId),
		];
		if (filter.status !== undefined) {
			predicates.push(eq(mdItemTemplate.status, filter.status));
		}
		const rows = await db
			.select()
			.from(mdItemTemplate)
			.where(and(...predicates))
			.orderBy(asc(mdItemTemplate.normalizedCode), asc(mdItemTemplate.id))
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);
		return ok(rows.map(mapItemTemplate));
	} catch (error) {
		return failFromUnknown(error, "Failed to list item templates");
	}
}

export async function drizzleCreateItemTemplate(
	record: ItemTemplateCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemTemplate>> {
	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("code", null, record.code);
	const newValueJson = valueSnapshotJson({
		code: record.code,
		status: "draft",
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_template",
		entityId: id,
		code: record.code,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_item_template (
							id, organization_id, code, normalized_code, name,
							status, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.name}, 'draft', 1, ${record.createdBy}, ${record.createdBy}
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
							'master_data', 'item_template', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.item_template.created.v1', 'master_data',
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
			return fail("INTERNAL_ERROR", "Item template create returned no row");
		}
		return ok(mapItemTemplateFromSql(row));
	} catch (error) {
		return mapWriteError(
			error,
			"Item template code already exists",
			"Failed to create item template",
		);
	}
}

export async function drizzleUpdateItemTemplate(
	record: ItemTemplateUpdateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemTemplate>> {
	try {
		const [existing] = await db
			.select()
			.from(mdItemTemplate)
			.where(
				and(
					eq(mdItemTemplate.id, record.id),
					eq(mdItemTemplate.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Item template version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		const nextName = record.name ?? existing.name;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson("name", existing.name, nextName);
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "item_template",
			entityId: record.id,
			code: existing.code,
			version: existing.version + 1,
			actorId: record.updatedBy,
			correlationId: meta.correlationId,
		});
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						UPDATE md_item_template
						SET name = ${nextName},
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
							'master_data', 'item_template', id, 'UPDATE', ${changesJson}::jsonb,
							${valueSnapshotJson({ name: nextName })}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.item_template.updated.v1', 'master_data',
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
			return fail("CONFLICT", "Item template version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(mapItemTemplateFromSql(row));
	} catch (error) {
		return mapWriteError(
			error,
			"Item template conflict",
			"Failed to update item template",
		);
	}
}

export async function drizzleTransitionItemTemplate(
	record: LifecycleRecord,
	_ports: MutationPorts,
	meta: { correlationId: string; eventSuffix: string },
): Promise<Result<ItemTemplate>> {
	const auditId = randomUUID();
	const eventId = randomUUID();
	const eventType = `master_data.item_template.${meta.eventSuffix}.v1`;
	try {
		const [existing] = await db
			.select()
			.from(mdItemTemplate)
			.where(
				and(
					eq(mdItemTemplate.id, record.id),
					eq(mdItemTemplate.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Item template version conflict", {
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
			entityType: "item_template",
			entityId: record.id,
			code: existing.code,
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
						UPDATE md_item_template
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
							'master_data', 'item_template', id, 'UPDATE', ${changesJson}::jsonb,
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
			return fail("CONFLICT", "Item template version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(mapItemTemplateFromSql(row));
	} catch (error) {
		return mapWriteError(
			error,
			"Item template conflict",
			"Failed to transition item template",
		);
	}
}

export async function drizzleListItemTemplateAttributes(
	organizationId: string,
	templateId: string,
): Promise<Result<ItemTemplateAttribute[]>> {
	try {
		const rows = await db
			.select()
			.from(mdItemTemplateAttribute)
			.where(
				and(
					eq(mdItemTemplateAttribute.organizationId, organizationId),
					eq(mdItemTemplateAttribute.templateId, templateId),
				),
			)
			.orderBy(
				asc(mdItemTemplateAttribute.sortOrder),
				asc(mdItemTemplateAttribute.id),
			);
		return ok(rows.map(mapItemTemplateAttribute));
	} catch (error) {
		return failFromUnknown(error, "Failed to list item template attributes");
	}
}

export async function drizzleListItemTemplateAttributeOptions(
	organizationId: string,
	attributeId: string,
): Promise<Result<ItemTemplateAttributeOption[]>> {
	try {
		const rows = await db
			.select()
			.from(mdItemTemplateAttributeOption)
			.where(
				and(
					eq(mdItemTemplateAttributeOption.organizationId, organizationId),
					eq(mdItemTemplateAttributeOption.attributeId, attributeId),
				),
			)
			.orderBy(
				asc(mdItemTemplateAttributeOption.sortOrder),
				asc(mdItemTemplateAttributeOption.id),
			);
		return ok(rows.map(mapItemTemplateAttributeOption));
	} catch (error) {
		return failFromUnknown(
			error,
			"Failed to list item template attribute options",
		);
	}
}

export async function drizzleAddItemTemplateAttribute(
	record: ItemTemplateAttributeCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemTemplateAttribute>> {
	try {
		const [template] = await db
			.select()
			.from(mdItemTemplate)
			.where(
				and(
					eq(mdItemTemplate.id, record.templateId),
					eq(mdItemTemplate.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (template === undefined) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (template.status !== "draft") {
			return fail(
				"CONFLICT",
				"Template attributes can only be added while draft",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
	} catch (error) {
		return failFromUnknown(error, "Failed to validate item template");
	}

	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("code", null, record.code);
	const newValueJson = valueSnapshotJson({
		code: record.code,
		valueKind: record.valueKind,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_template_attribute",
		entityId: id,
		code: record.code,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_item_template_attribute (
							id, organization_id, template_id, code, normalized_code, name,
							value_kind, is_required, sort_order, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.templateId}, ${record.code},
							${record.normalizedCode}, ${record.name}, ${record.valueKind},
							${record.isRequired}, ${record.sortOrder}, 1,
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
							'master_data', 'item_template_attribute', id, 'CREATE',
							${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.item_template_attribute.created.v1',
							'master_data', ${meta.correlationId}, created_by, ${payloadJson}::jsonb,
							'pending', 0
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
				"Item template attribute create returned no row",
			);
		}
		return ok(mapItemTemplateAttributeFromSql(row));
	} catch (error) {
		return mapWriteError(
			error,
			"Template attribute code already exists",
			"Failed to add item template attribute",
		);
	}
}

export async function drizzleAddItemTemplateAttributeOption(
	record: ItemTemplateAttributeOptionCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemTemplateAttributeOption>> {
	try {
		const [attribute] = await db
			.select()
			.from(mdItemTemplateAttribute)
			.where(
				and(
					eq(mdItemTemplateAttribute.id, record.attributeId),
					eq(mdItemTemplateAttribute.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (attribute === undefined) {
			return fail("NOT_FOUND", "Item template attribute not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (attribute.valueKind !== "option") {
			return fail(
				"BAD_REQUEST",
				"Options can only be added to option-kind attributes",
				{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
			);
		}
		const [template] = await db
			.select()
			.from(mdItemTemplate)
			.where(
				and(
					eq(mdItemTemplate.id, attribute.templateId),
					eq(mdItemTemplate.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (template === undefined) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (template.status !== "draft") {
			return fail(
				"CONFLICT",
				"Template attribute options can only be added while draft",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
	} catch (error) {
		return failFromUnknown(
			error,
			"Failed to validate template attribute option",
		);
	}

	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("code", null, record.code);
	const newValueJson = valueSnapshotJson({
		code: record.code,
		label: record.label,
	});
	const payloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_template_attribute_option",
		entityId: id,
		code: record.code,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO md_item_template_attribute_option (
							id, organization_id, attribute_id, code, normalized_code, label,
							sort_order, version, created_by, updated_by
						) VALUES (
							${id}, ${record.organizationId}, ${record.attributeId}, ${record.code},
							${record.normalizedCode}, ${record.label}, ${record.sortOrder}, 1,
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
							'master_data', 'item_template_attribute_option', id, 'CREATE',
							${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id,
							'master_data.item_template_attribute_option.created.v1', 'master_data',
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
				"Item template attribute option create returned no row",
			);
		}
		return ok(mapItemTemplateAttributeOptionFromSql(row));
	} catch (error) {
		return mapWriteError(
			error,
			"Template attribute option code already exists",
			"Failed to add item template attribute option",
		);
	}
}

export async function drizzleGetItemVariantById(
	organizationId: string,
	id: string,
): Promise<Result<ItemVariant | null>> {
	try {
		const [variant] = await db
			.select()
			.from(mdItemVariant)
			.where(
				and(
					eq(mdItemVariant.id, id),
					eq(mdItemVariant.organizationId, organizationId),
				),
			)
			.limit(1);
		if (variant === undefined) {
			return ok(null);
		}
		const [itemRow] = await db
			.select()
			.from(mdItem)
			.where(
				and(
					eq(mdItem.id, variant.itemId),
					eq(mdItem.organizationId, organizationId),
				),
			)
			.limit(1);
		if (itemRow === undefined) {
			return fail("INTERNAL_ERROR", "Item variant item row missing");
		}
		const valuesResult = await loadVariantValues(organizationId, [variant.id]);
		if (!valuesResult.ok) {
			return valuesResult;
		}
		return ok(
			mapItemVariantMembership(
				variant,
				mapItem(itemRow),
				valuesResult.data.get(variant.id) ?? [],
			),
		);
	} catch (error) {
		return failFromUnknown(error, "Failed to load item variant");
	}
}

export async function drizzleListItemVariantsByTemplate(
	filter: ListItemVariantsFilter,
): Promise<Result<ItemVariant[]>> {
	try {
		const predicates = [
			eq(mdItemVariant.organizationId, filter.organizationId),
			eq(mdItemVariant.templateId, filter.templateId),
		];
		if (filter.status !== undefined) {
			predicates.push(eq(mdItem.status, filter.status));
		}
		const rows = await db
			.select({
				variant: mdItemVariant,
				item: mdItem,
			})
			.from(mdItemVariant)
			.innerJoin(
				mdItem,
				and(
					eq(mdItem.id, mdItemVariant.itemId),
					eq(mdItem.organizationId, mdItemVariant.organizationId),
				),
			)
			.where(and(...predicates))
			.orderBy(asc(mdItem.normalizedCode), asc(mdItemVariant.id))
			.limit(filter.pageSize)
			.offset((filter.page - 1) * filter.pageSize);

		const variantIds = rows.map((row) => row.variant.id);
		const valuesResult = await loadVariantValues(
			filter.organizationId,
			variantIds,
		);
		if (!valuesResult.ok) {
			return valuesResult;
		}
		return ok(
			rows.map((row) =>
				mapItemVariantMembership(
					row.variant,
					mapItem(row.item),
					valuesResult.data.get(row.variant.id) ?? [],
				),
			),
		);
	} catch (error) {
		return failFromUnknown(error, "Failed to list item variants");
	}
}

export async function drizzleCreateItemVariant(
	record: ItemVariantCreateRecord,
	_ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemVariant>> {
	try {
		const [uom] = await db
			.select()
			.from(refUom)
			.where(eq(refUom.id, record.baseUomId))
			.limit(1);
		if (uom === undefined) {
			return fail("BAD_REQUEST", "baseUomId is not a known platform UoM", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		const [group] = await db
			.select()
			.from(mdItemGroup)
			.where(
				and(
					eq(mdItemGroup.id, record.itemGroupId),
					eq(mdItemGroup.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (group === undefined) {
			return fail(
				"CONFLICT",
				"itemGroupId must exist in the same organization",
				{ reason: "MASTER_CROSS_ORG_REFERENCE" } satisfies MasterFailureDetails,
			);
		}
		const [template] = await db
			.select()
			.from(mdItemTemplate)
			.where(
				and(
					eq(mdItemTemplate.id, record.templateId),
					eq(mdItemTemplate.organizationId, record.organizationId),
				),
			)
			.limit(1);
		if (template === undefined) {
			return fail("NOT_FOUND", "Item template not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
	} catch (error) {
		return failFromUnknown(error, "Failed to validate item variant create");
	}

	const itemId = randomUUID();
	const variantId = randomUUID();
	const itemAuditId = randomUUID();
	const itemEventId = randomUUID();
	const variantAuditId = randomUUID();
	const variantEventId = randomUUID();
	const itemChangesJson = fieldChangeJson("code", null, record.code);
	const itemNewValueJson = valueSnapshotJson({
		code: record.code,
		baseUomId: record.baseUomId,
		itemGroupId: record.itemGroupId,
		templateId: record.templateId,
	});
	const itemPayloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item",
		entityId: itemId,
		code: record.code,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	const variantChangesJson = fieldChangeJson(
		"combinationKey",
		null,
		record.combinationKey,
	);
	const variantNewValueJson = valueSnapshotJson({
		combinationKey: record.combinationKey,
		templateId: record.templateId,
		itemId,
	});
	const variantPayloadJson = eventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_variant",
		entityId: variantId,
		code: record.combinationKey,
		version: 1,
		actorId: record.createdBy,
		correlationId: meta.correlationId,
	});
	const valueIds = record.attributeValues.map(() => randomUUID());

	try {
		const results = await runNeonHttpTransaction<
			[
				Record<string, unknown>[],
				Record<string, unknown>[],
				...Record<string, unknown>[][],
			]
		>((sql) => {
			const statements = [
				sql`
					WITH mutated AS (
						INSERT INTO md_item (
							id, organization_id, code, normalized_code, name, item_type,
							base_uom_id, item_group_id, status, version, created_by, updated_by
						) VALUES (
							${itemId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.name}, ${record.itemType}, ${record.baseUomId},
							${record.itemGroupId}, 'draft', 1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${itemAuditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'item', id, 'CREATE', ${itemChangesJson}::jsonb,
							${itemNewValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${itemEventId}, organization_id, 'master_data.item.created.v1', 'master_data',
							${meta.correlationId}, created_by, ${itemPayloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
				sql`
					WITH mutated AS (
						INSERT INTO md_item_variant (
							id, organization_id, item_id, template_id, combination_key,
							version, created_by, updated_by
						) VALUES (
							${variantId}, ${record.organizationId}, ${itemId}, ${record.templateId},
							${record.combinationKey}, 1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${variantAuditId}, organization_id, created_by, ${meta.correlationId},
							'master_data', 'item_variant', id, 'CREATE', ${variantChangesJson}::jsonb,
							${variantNewValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${variantEventId}, organization_id, 'master_data.item_variant.created.v1',
							'master_data', ${meta.correlationId}, created_by, ${variantPayloadJson}::jsonb,
							'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			];
			for (let index = 0; index < record.attributeValues.length; index += 1) {
				const value = record.attributeValues[index];
				const valueId = valueIds[index];
				if (value === undefined || valueId === undefined) {
					continue;
				}
				statements.push(
					sql`
						INSERT INTO md_item_variant_attribute_value (
							id, organization_id, variant_id, attribute_id, value_text, option_id,
							version, created_by, updated_by
						) VALUES (
							${valueId}, ${record.organizationId}, ${variantId}, ${value.attributeId},
							${value.valueText}, ${value.optionId}, 1,
							${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					`,
				);
			}
			return statements;
		});

		const itemRows = results[0];
		const variantRows = results[1];
		const itemRow = itemRows[0];
		const variantRow = variantRows[0];
		if (itemRow === undefined || variantRow === undefined) {
			return fail("INTERNAL_ERROR", "Item variant create returned no row");
		}
		const values: ItemVariantAttributeValue[] = [];
		for (let index = 0; index < record.attributeValues.length; index += 1) {
			const valueRows = results[index + 2];
			const valueRow = valueRows?.[0];
			if (valueRow === undefined) {
				return fail(
					"INTERNAL_ERROR",
					"Item variant attribute value create returned no row",
				);
			}
			values.push(mapItemVariantAttributeValueFromSql(valueRow));
		}
		const item = mapItemFromSql(itemRow);
		return ok({
			id: variantRow.id as string,
			organizationId: variantRow.organization_id as string,
			itemId: variantRow.item_id as string,
			templateId: variantRow.template_id as string,
			combinationKey: variantRow.combination_key as string,
			version: Number(variantRow.version),
			createdBy: variantRow.created_by as string,
			updatedBy: variantRow.updated_by as string,
			retiredAt: (variantRow.retired_at as Date | null) ?? null,
			retiredBy: (variantRow.retired_by as string | null) ?? null,
			createdAt: variantRow.created_at as Date,
			updatedAt: variantRow.updated_at as Date,
			item,
			values,
		});
	} catch (error) {
		return mapWriteError(
			error,
			"Item code or variant combination already exists",
			"Failed to create item variant",
		);
	}
}

/**
 * Retires live md_item_variant membership for an item (standalone).
 * Prefer same-TX via drizzleTransitionItemWithVariantSideEffect when retiring the item.
 */
export async function drizzleRetireItemVariantMembership(
	organizationId: string,
	itemId: string,
	actorUserId: string,
	correlationId: string,
): Promise<Result<{ retired: boolean }>> {
	const eventId = randomUUID();
	try {
		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				sql`
					WITH variant_retired AS (
						UPDATE md_item_variant
						SET retired_at = now(),
							retired_by = ${actorUserId},
							version = version + 1,
							updated_by = ${actorUserId},
							updated_at = now()
						WHERE organization_id = ${organizationId}
							AND item_id = ${itemId}
							AND retired_at IS NULL
						RETURNING *
					),
					variant_outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, 'master_data.item_variant.retired.v1',
							'master_data', ${correlationId}, ${actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'entityType', 'item_variant',
								'entityId', id,
								'code', combination_key,
								'version', version,
								'actorId', ${actorUserId},
								'correlationId', ${correlationId}
							),
							'pending', 0
						FROM variant_retired
						RETURNING id
					)
					SELECT variant_retired.* FROM variant_retired
				`,
			],
		);
		return ok({ retired: rows[0] !== undefined });
	} catch (error) {
		return failFromUnknown(error, "Failed to retire item variant membership");
	}
}

/**
 * Item lifecycle transition with optional same-TX variant membership retire
 * when `toStatus === 'retired'` (appendVariantRetireToItemTransition pattern).
 */
export async function drizzleTransitionItemWithVariantSideEffect(
	record: LifecycleRecord,
	_ports: MutationPorts,
	meta: { correlationId: string; eventSuffix: string },
): Promise<Result<Item>> {
	try {
		const [existing] = await db
			.select()
			.from(mdItem)
			.where(eq(mdItem.id, record.id))
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.organizationId !== record.organizationId) {
			return fail("CONFLICT", "Item belongs to another organization", {
				reason: "MASTER_CROSS_ORG_REFERENCE",
			} satisfies MasterFailureDetails);
		}
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Item version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}

		const eventType = `master_data.item.${meta.eventSuffix}.v1`;
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
			entityType: "item",
			entityId: existing.id,
			code: existing.code,
			version: nextVersion,
			actorId: record.actorUserId,
			correlationId: meta.correlationId,
		});
		const auditId = randomUUID();
		const eventId = randomUUID();
		const variantEventId = randomUUID();
		const activatedBy =
			record.toStatus === "active"
				? (existing.activatedBy ?? record.actorUserId)
				: existing.activatedBy;
		const retiredBy = record.toStatus === "retired" ? record.actorUserId : null;
		const retireVariant = record.toStatus === "retired";

		const [rows] = await runNeonHttpTransaction<[Record<string, unknown>[]]>(
			(sql) => [
				retireVariant
					? sql`
						WITH mutated AS (
							UPDATE md_item
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
								${eventId}, organization_id, ${eventType}, 'master_data',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb,
								'pending', 0
							FROM mutated
							RETURNING id
						),
						variant_retired AS (
							UPDATE md_item_variant AS v
							SET retired_at = now(),
								retired_by = ${record.actorUserId},
								version = v.version + 1,
								updated_by = ${record.actorUserId},
								updated_at = now()
							FROM mutated AS m
							WHERE v.organization_id = m.organization_id
								AND v.item_id = m.id
								AND v.retired_at IS NULL
							RETURNING v.*
						),
						variant_outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${variantEventId}, organization_id, 'master_data.item_variant.retired.v1',
								'master_data', ${meta.correlationId}, ${record.actorUserId},
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'item_variant',
									'entityId', id,
									'code', combination_key,
									'version', version,
									'actorId', ${record.actorUserId},
									'correlationId', ${meta.correlationId}
								),
								'pending', 0
							FROM variant_retired
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`
					: sql`
						WITH mutated AS (
							UPDATE md_item
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
								${eventId}, organization_id, ${eventType}, 'master_data',
								${meta.correlationId}, ${record.actorUserId}, ${payloadJson}::jsonb,
								'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			],
		);
		const row = rows[0];
		if (row === undefined) {
			return fail("CONFLICT", "Item version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(mapItemFromSql(row));
	} catch (error) {
		return failFromUnknown(error, "Failed to transition item");
	}
}
