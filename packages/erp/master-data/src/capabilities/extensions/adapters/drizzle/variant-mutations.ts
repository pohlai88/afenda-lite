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
	mdItemVariantAttributeValueOption,
	refUom,
	runNeonHttpTransaction,
	tenantEntityPredicate,
} from "@afenda/db";
import {
	fromPostgresUnknown,
	hasPostgresSqlState,
} from "@afenda/errors/adapters/postgres";
import {
	fail,
	failFromAppError,
	failFromUnknown,
	ok,
	type Result,
} from "@afenda/errors/result";
import type { MasterFailureDetails } from "../../../../contracts/reasons";
import type { MutationPorts } from "../../../../ports";
import type {
	Item,
	ItemTemplate,
	ItemTemplateAttribute,
	ItemTemplateAttributeDataType,
	ItemTemplateAttributeOption,
	ItemTemplateAttributeValidationRules,
	ItemVariant,
	ItemVariantAttributeValue,
	MasterStatus,
} from "../../../../types";
import type {
	ItemLifecycleEventSuffix,
	ItemTemplateLifecycleEventSuffix,
} from "../../../core-organization-masters/core-master-events";
import {
	assertLifecycleTransition,
	assertRestoreTransition,
} from "../../../core-organization-masters/lifecycle";
import { mapItem } from "../../../core-organization-masters/map-row";
import type {
	ItemLifecycleRecord,
	ListFilter,
} from "../../../core-organization-masters/store";
import { assertExpectedVersion } from "../../../core-organization-masters/version-cas";
import {
	createExtensionEventPayload,
	EXTENSION_EVENT_TYPES,
	type ExtensionEventPayload,
	extensionEventClassification,
} from "../../extension-transaction-contract";
import { legacyValueKindFromDataType } from "../../template-attribute-policy";
import type {
	ItemTemplateAttributeContext,
	ItemTemplateAttributeCreateRecord,
	ItemTemplateAttributeOptionCreateRecord,
	ItemTemplateCreateRecord,
	ItemTemplateLifecycleRecord,
	ItemTemplateUpdateRecord,
	ItemVariantCreateRecord,
	ItemVariantRetireRecord,
	ListItemVariantsFilter,
} from "../../template-store";

function failFromPersistence(error: unknown, fallbackMessage: string) {
	const mapped = fromPostgresUnknown(error);
	return mapped === undefined
		? failFromUnknown(error, fallbackMessage)
		: failFromAppError(mapped);
}

function mapWriteError(
	error: unknown,
	uniqueMessage: string,
	fallbackMessage: string,
): Result<never> {
	if (hasPostgresSqlState(error, "23505")) {
		return fail("CONFLICT", uniqueMessage, {
			reason: "MASTER_CODE_CONFLICT",
		} satisfies MasterFailureDetails);
	}
	return failFromPersistence(error, fallbackMessage);
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

function extensionEventPayloadJson(input: ExtensionEventPayload): string {
	return JSON.stringify(createExtensionEventPayload(input));
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

type WithOptionalExtensionLifecycle<
	T extends { status: unknown; archivedAt: unknown; archivedBy: unknown },
> = Omit<T, "status" | "archivedAt" | "archivedBy"> &
	Partial<Pick<T, "status" | "archivedAt" | "archivedBy">>;

function mapItemTemplateAttribute(
	row: WithOptionalExtensionLifecycle<
		typeof mdItemTemplateAttribute.$inferSelect
	>,
): ItemTemplateAttribute {
	return {
		id: row.id,
		organizationId: row.organizationId,
		templateId: row.templateId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		name: row.name,
		description: row.description,
		dataType: row.dataType as ItemTemplateAttributeDataType,
		valueKind: legacyValueKindFromDataType(
			row.dataType as ItemTemplateAttributeDataType,
		),
		isRequired: row.isRequired,
		isVariantDefining: row.isVariantDefining,
		isSearchable: row.isSearchable,
		displayOrder: row.displayOrder,
		sortOrder: row.displayOrder,
		validationRules:
			row.validationRules as ItemTemplateAttributeValidationRules,
		status: (row.status ?? "active") as ItemTemplateAttribute["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
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
		description: (row.description as string | null) ?? null,
		dataType: row.data_type as string,
		isRequired: Boolean(row.is_required),
		isVariantDefining: Boolean(row.is_variant_defining),
		isSearchable: Boolean(row.is_searchable),
		displayOrder: Number(row.display_order),
		validationRules: row.validation_rules as Record<string, unknown>,
		status: row.status as string,
		archivedAt: (row.archived_at as Date | null) ?? null,
		archivedBy: (row.archived_by as string | null) ?? null,
		version: Number(row.version),
		createdBy: row.created_by as string,
		updatedBy: row.updated_by as string,
		createdAt: row.created_at as Date,
		updatedAt: row.updated_at as Date,
	});
}

function mapItemTemplateAttributeOption(
	row: WithOptionalExtensionLifecycle<
		typeof mdItemTemplateAttributeOption.$inferSelect
	>,
): ItemTemplateAttributeOption {
	return {
		id: row.id,
		organizationId: row.organizationId,
		attributeId: row.attributeId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		label: row.label,
		description: row.description,
		displayOrder: row.displayOrder,
		sortOrder: row.displayOrder,
		status: (row.status ?? "active") as ItemTemplateAttributeOption["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
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
		description: (row.description as string | null) ?? null,
		displayOrder: Number(row.display_order),
		status: row.status as string,
		archivedAt: (row.archived_at as Date | null) ?? null,
		archivedBy: (row.archived_by as string | null) ?? null,
		version: Number(row.version),
		createdBy: row.created_by as string,
		updatedBy: row.updated_by as string,
		createdAt: row.created_at as Date,
		updatedAt: row.updated_at as Date,
	});
}

function mapItemVariantAttributeValue(
	row: WithOptionalExtensionLifecycle<
		typeof mdItemVariantAttributeValue.$inferSelect
	>,
	optionIds: readonly string[] = [],
): ItemVariantAttributeValue {
	return {
		id: row.id,
		organizationId: row.organizationId,
		variantId: row.variantId,
		attributeId: row.attributeId,
		valueType: row.valueType as ItemVariantAttributeValue["valueType"],
		textValue: row.textValue,
		valueText: row.textValue,
		integerValue: row.integerValue,
		decimalValue: row.decimalValue,
		booleanValue: row.booleanValue,
		dateValue: row.dateValue,
		optionId: row.optionId,
		optionIds,
		referenceValue: row.referenceValue,
		status: (row.status ?? "active") as ItemVariantAttributeValue["status"],
		archivedAt: row.archivedAt ?? null,
		archivedBy: row.archivedBy ?? null,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapItemVariantAttributeValueFromSql(
	row: Record<string, unknown>,
	optionIds: readonly string[] = [],
): ItemVariantAttributeValue {
	return mapItemVariantAttributeValue(
		{
			id: row.id as string,
			organizationId: row.organization_id as string,
			variantId: row.variant_id as string,
			attributeId: row.attribute_id as string,
			valueType: row.value_type as string,
			textValue: (row.text_value as string | null) ?? null,
			integerValue: (row.integer_value as string | null) ?? null,
			decimalValue: (row.decimal_value as string | null) ?? null,
			booleanValue: (row.boolean_value as boolean | null) ?? null,
			dateValue: (row.date_value as string | null) ?? null,
			optionId: (row.option_id as string | null) ?? null,
			referenceValue: (row.reference_value as string | null) ?? null,
			status: row.status as string,
			archivedAt: (row.archived_at as Date | null) ?? null,
			archivedBy: (row.archived_by as string | null) ?? null,
			version: Number(row.version),
			createdBy: row.created_by as string,
			updatedBy: row.updated_by as string,
			createdAt: row.created_at as Date,
			updatedAt: row.updated_at as Date,
		},
		optionIds,
	);
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
	variant: WithOptionalExtensionLifecycle<typeof mdItemVariant.$inferSelect>,
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
		const optionRows =
			rows.length === 0
				? []
				: await db
						.select()
						.from(mdItemVariantAttributeValueOption)
						.where(
							and(
								eq(
									mdItemVariantAttributeValueOption.organizationId,
									organizationId,
								),
								inArray(
									mdItemVariantAttributeValueOption.valueId,
									rows.map((row) => row.id),
								),
							),
						)
						.orderBy(mdItemVariantAttributeValueOption.optionId);
		const optionIdsByValue = new Map<string, string[]>();
		for (const optionRow of optionRows) {
			const optionIds = optionIdsByValue.get(optionRow.valueId) ?? [];
			optionIds.push(optionRow.optionId);
			optionIdsByValue.set(optionRow.valueId, optionIds);
		}
		const byVariant = new Map<string, ItemVariantAttributeValue[]>();
		for (const row of rows) {
			const mapped = mapItemVariantAttributeValue(
				row,
				optionIdsByValue.get(row.id) ?? [],
			);
			const list = byVariant.get(mapped.variantId) ?? [];
			list.push(mapped);
			byVariant.set(mapped.variantId, list);
		}
		return ok(byVariant);
	} catch (error) {
		return failFromPersistence(
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
		return failFromPersistence(error, "Failed to load item template");
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
		return failFromPersistence(error, "Failed to load item template by code");
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
		return failFromPersistence(error, "Failed to list item templates");
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
		const [row] = rows;
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
		const version = assertExpectedVersion(existing, record.expectedVersion);
		if (!version.ok) {
			return version;
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
		const [row] = rows;
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
	record: ItemTemplateLifecycleRecord,
	_ports: MutationPorts,
	meta: {
		correlationId: string;
		eventSuffix: ItemTemplateLifecycleEventSuffix;
	},
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
		const version = assertExpectedVersion(existing, record.expectedVersion);
		if (!version.ok) {
			return version;
		}
		const lifecycle = assertLifecycleTransition(
			mapItemTemplate(existing).status,
			record.toStatus,
		);
		if (!lifecycle.ok) {
			return lifecycle;
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
							AND status = ${existing.status}
							AND (${record.toStatus} <> 'active' OR (
								EXISTS (
									SELECT 1 FROM md_item_template_attribute attribute
									WHERE attribute.organization_id = ${record.organizationId}
										AND attribute.template_id = ${record.id}
										AND attribute.status = 'active'
										AND attribute.archived_at IS NULL
								)
								AND EXISTS (
									SELECT 1 FROM md_item_template_attribute attribute
									WHERE attribute.organization_id = ${record.organizationId}
										AND attribute.template_id = ${record.id}
										AND attribute.is_variant_defining = true
										AND attribute.status = 'active'
										AND attribute.archived_at IS NULL
								)
								AND NOT EXISTS (
									SELECT 1 FROM md_item_template_attribute attribute
									WHERE attribute.organization_id = ${record.organizationId}
										AND attribute.template_id = ${record.id}
										AND attribute.data_type IN ('single_option', 'multiple_option')
										AND attribute.status = 'active'
										AND attribute.archived_at IS NULL
										AND NOT EXISTS (
											SELECT 1 FROM md_item_template_attribute_option option
											WHERE option.organization_id = ${record.organizationId}
												AND option.attribute_id = attribute.id
												AND option.status = 'active'
												AND option.archived_at IS NULL
										)
								)
							))
							AND (${record.toStatus} <> 'retired' OR NOT EXISTS (
								SELECT 1 FROM md_item_variant variant
								WHERE variant.organization_id = ${record.organizationId}
									AND variant.template_id = ${record.id}
									AND variant.retired_at IS NULL
							))
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
		const [row] = rows;
		if (row === undefined) {
			const [current] = await db
				.select({ version: mdItemTemplate.version })
				.from(mdItemTemplate)
				.where(
					and(
						eq(mdItemTemplate.id, record.id),
						eq(mdItemTemplate.organizationId, record.organizationId),
					),
				)
				.limit(1);
			if (current !== undefined && current.version !== record.expectedVersion) {
				return fail("CONFLICT", "Item template version conflict", {
					reason: "MASTER_VERSION_CONFLICT",
				} satisfies MasterFailureDetails);
			}
			if (record.toStatus === "retired") {
				const [liveVariant] = await db
					.select({ id: mdItemVariant.id })
					.from(mdItemVariant)
					.where(
						and(
							eq(mdItemVariant.organizationId, record.organizationId),
							eq(mdItemVariant.templateId, record.id),
							isNull(mdItemVariant.retiredAt),
						),
					)
					.limit(1);
				if (liveVariant !== undefined) {
					return fail("CONFLICT", "Item template has live variants", {
						reason: "MASTER_DEPENDENCY_BLOCKED",
					} satisfies MasterFailureDetails);
				}
			}
			return fail("CONFLICT", "Item template transition precondition failed", {
				reason: "MASTER_INVALID_STATE",
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
				asc(mdItemTemplateAttribute.displayOrder),
				asc(mdItemTemplateAttribute.normalizedCode),
				asc(mdItemTemplateAttribute.id),
			);
		return ok(rows.map(mapItemTemplateAttribute));
	} catch (error) {
		return failFromPersistence(
			error,
			"Failed to list item template attributes",
		);
	}
}

export async function drizzleGetItemTemplateAttributeContextById(
	organizationId: string,
	attributeId: string,
): Promise<Result<ItemTemplateAttributeContext | null>> {
	try {
		const [row] = await db
			.select({
				attribute: mdItemTemplateAttribute,
				template: mdItemTemplate,
			})
			.from(mdItemTemplateAttribute)
			.innerJoin(
				mdItemTemplate,
				and(
					eq(mdItemTemplate.id, mdItemTemplateAttribute.templateId),
					eq(
						mdItemTemplate.organizationId,
						mdItemTemplateAttribute.organizationId,
					),
				),
			)
			.where(
				and(
					eq(mdItemTemplateAttribute.id, attributeId),
					eq(mdItemTemplateAttribute.organizationId, organizationId),
				),
			)
			.limit(1);
		if (row === undefined) {
			return ok(null);
		}
		return ok({
			attribute: mapItemTemplateAttribute(row.attribute),
			template: mapItemTemplate(row.template),
		});
	} catch (error) {
		return failFromPersistence(
			error,
			"Failed to get item template attribute context",
		);
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
				asc(mdItemTemplateAttributeOption.displayOrder),
				asc(mdItemTemplateAttributeOption.normalizedCode),
				asc(mdItemTemplateAttributeOption.id),
			);
		return ok(rows.map(mapItemTemplateAttributeOption));
	} catch (error) {
		return failFromPersistence(
			error,
			"Failed to list item template attribute options",
		);
	}
}

export async function drizzleListItemTemplateAttributeOptionsByTemplate(
	organizationId: string,
	templateId: string,
): Promise<Result<ItemTemplateAttributeOption[]>> {
	try {
		const attributes = await db
			.select({ id: mdItemTemplateAttribute.id })
			.from(mdItemTemplateAttribute)
			.where(
				and(
					eq(mdItemTemplateAttribute.organizationId, organizationId),
					eq(mdItemTemplateAttribute.templateId, templateId),
				),
			);
		if (attributes.length === 0) {
			return ok([]);
		}
		const rows = await db
			.select()
			.from(mdItemTemplateAttributeOption)
			.where(
				and(
					eq(mdItemTemplateAttributeOption.organizationId, organizationId),
					inArray(
						mdItemTemplateAttributeOption.attributeId,
						attributes.map((attribute) => attribute.id),
					),
				),
			)
			.orderBy(
				asc(mdItemTemplateAttributeOption.displayOrder),
				asc(mdItemTemplateAttributeOption.normalizedCode),
				asc(mdItemTemplateAttributeOption.id),
			);
		return ok(rows.map(mapItemTemplateAttributeOption));
	} catch (error) {
		return failFromPersistence(
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
				field: "templateId",
			} satisfies MasterFailureDetails);
		}
		if (template.status !== "draft") {
			return fail(
				"CONFLICT",
				"Template attributes can only be added while draft",
				{
					reason: "MASTER_INVALID_STATE",
					field: "templateId",
					actualStatus: template.status,
					requiredStatus: "draft",
				} satisfies MasterFailureDetails,
			);
		}
	} catch (error) {
		return failFromPersistence(error, "Failed to validate item template");
	}

	const id = randomUUID();
	const auditId = randomUUID();
	const eventId = randomUUID();
	const changesJson = fieldChangeJson("code", null, record.code);
	const newValueJson = valueSnapshotJson({
		code: record.code,
		dataType: record.dataType,
		isVariantDefining: record.isVariantDefining,
	});
	const payloadJson = extensionEventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_template_attribute",
		entityId: id,
		parentEntityId: record.templateId,
		classification: extensionEventClassification(
			"item_template_attribute",
			record.code,
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
						SELECT template.id
						FROM md_item_template template
						WHERE template.id = ${record.templateId}
							AND template.organization_id = ${record.organizationId}
							AND template.status = 'draft'
							AND template.retired_at IS NULL
						FOR UPDATE
					), mutated AS (
						INSERT INTO md_item_template_attribute (
							id, organization_id, template_id, code, normalized_code, name,
							description, data_type, is_required, is_variant_defining,
							is_searchable, display_order, validation_rules, status, version,
							created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.templateId}, ${record.code},
							${record.normalizedCode}, ${record.name}, ${record.description},
							${record.dataType}, ${record.isRequired}, ${record.isVariantDefining},
							${record.isSearchable}, ${record.displayOrder},
							${JSON.stringify(record.validationRules)}::jsonb, 'active', 1,
							${record.createdBy}, ${record.createdBy}
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
							${eventId}, organization_id, ${EXTENSION_EVENT_TYPES.itemTemplateAttributeCreated},
							'master_data', ${meta.correlationId}, created_by, ${payloadJson}::jsonb,
							'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			],
		);
		const [row] = rows;
		if (row === undefined) {
			return fail(
				"CONFLICT",
				"Template attributes can only be added while draft",
				{
					reason: "MASTER_INVALID_STATE",
					field: "templateId",
					requiredStatus: "draft",
				} satisfies MasterFailureDetails,
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
				field: "attributeId",
			} satisfies MasterFailureDetails);
		}
		if (
			attribute.dataType !== "single_option" &&
			attribute.dataType !== "multiple_option"
		) {
			return fail(
				"CONFLICT",
				"Options can only be added to option-compatible attributes",
				{
					reason: "MASTER_INVALID_STATE",
					field: "attributeId",
				} satisfies MasterFailureDetails,
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
				{
					reason: "MASTER_INVALID_STATE",
					field: "attributeId",
					actualStatus: template.status,
					requiredStatus: "draft",
				} satisfies MasterFailureDetails,
			);
		}
	} catch (error) {
		return failFromPersistence(
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
	const payloadJson = extensionEventPayloadJson({
		organizationId: record.organizationId,
		entityType: "item_template_attribute_option",
		entityId: id,
		parentEntityId: record.attributeId,
		classification: extensionEventClassification(
			"item_template_attribute_option",
			record.code,
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
						SELECT attribute.id
						FROM md_item_template_attribute attribute
						INNER JOIN md_item_template template
							ON template.id = attribute.template_id
							AND template.organization_id = attribute.organization_id
						WHERE attribute.id = ${record.attributeId}
							AND attribute.organization_id = ${record.organizationId}
							AND attribute.data_type IN ('single_option', 'multiple_option')
							AND attribute.status = 'active'
							AND attribute.archived_at IS NULL
							AND template.status = 'draft'
							AND template.retired_at IS NULL
						FOR UPDATE OF attribute, template
					), mutated AS (
						INSERT INTO md_item_template_attribute_option (
							id, organization_id, attribute_id, code, normalized_code, label,
							description, display_order, status, version, created_by, updated_by
						) SELECT
							${id}, ${record.organizationId}, ${record.attributeId}, ${record.code},
							${record.normalizedCode}, ${record.label}, ${record.description},
							${record.displayOrder}, 'active', 1,
							${record.createdBy}, ${record.createdBy}
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
							${EXTENSION_EVENT_TYPES.itemTemplateAttributeOptionCreated}, 'master_data',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			],
		);
		const [row] = rows;
		if (row === undefined) {
			return fail("CONFLICT", "Template attribute option precondition failed", {
				reason: "MASTER_INVALID_STATE",
				field: "attributeId",
				requiredStatus: "draft",
			} satisfies MasterFailureDetails);
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
		return failFromPersistence(error, "Failed to load item variant");
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
		return failFromPersistence(error, "Failed to list item variants");
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
		if (!uom.active) {
			return fail(
				"BAD_REQUEST",
				"baseUomId must reference an active platform UoM",
				{
					reason: "MASTER_VALIDATION_FAILED",
				} satisfies MasterFailureDetails,
			);
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
			return fail("NOT_FOUND", "Item group not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
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
		return failFromPersistence(error, "Failed to validate item variant create");
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
	const valueAuditIds = record.attributeValues.map(() => randomUUID());
	const valueEventIds = record.attributeValues.map(() => randomUUID());
	const attributeValuesJson = JSON.stringify(record.attributeValues);

	try {
		const results = await runNeonHttpTransaction<
			[
				Record<string, unknown>[],
				Record<string, unknown>[],
				...Record<string, unknown>[][],
			]
		>(
			(sql) => {
				const statements = [
					sql`
					WITH mutated AS (
						INSERT INTO md_item (
							id, organization_id, code, normalized_code, name, item_type,
							base_uom_id, item_group_id, status, version, created_by, updated_by
						) SELECT
							${itemId}, ${record.organizationId}, ${record.code}, ${record.normalizedCode},
							${record.name}, ${record.itemType}, ${record.baseUomId},
							${record.itemGroupId}, 'draft', 1, ${record.createdBy}, ${record.createdBy}
						FROM md_item_template template
						INNER JOIN md_item_group item_group
							ON item_group.id = ${record.itemGroupId}
							AND item_group.organization_id = template.organization_id
						INNER JOIN ref_uom base_uom
							ON base_uom.id = ${record.baseUomId}
						WHERE template.id = ${record.templateId}
							AND template.organization_id = ${record.organizationId}
							AND template.status = 'active'
							AND template.retired_at IS NULL
							AND item_group.status <> 'retired'
							AND item_group.retired_at IS NULL
							AND base_uom.active = true
							AND NOT EXISTS (
								SELECT 1
								FROM jsonb_to_recordset(${attributeValuesJson}::jsonb)
									AS input(
										"attributeId" uuid, "valueType" text, "textValue" text,
										"integerValue" numeric, "decimalValue" numeric,
										"booleanValue" boolean, "dateValue" date, "optionId" uuid,
										"optionIds" jsonb, "referenceValue" text, "normalizedValue" text
									)
								LEFT JOIN md_item_template_attribute attribute
									ON attribute.id = input."attributeId"
									AND attribute.organization_id = ${record.organizationId}
									AND attribute.template_id = ${record.templateId}
									AND attribute.status = 'active'
									AND attribute.archived_at IS NULL
								LEFT JOIN md_item_template_attribute_option option
									ON option.id = input."optionId"
									AND option.organization_id = ${record.organizationId}
									AND option.attribute_id = attribute.id
									AND option.status = 'active'
									AND option.archived_at IS NULL
								WHERE attribute.id IS NULL
									OR input."valueType" <> attribute.data_type
									OR (attribute.data_type = 'text' AND (
										input."textValue" IS NULL
										OR input."normalizedValue" <> upper(regexp_replace(btrim(input."textValue"), '[[:space:]]+', ' ', 'g'))
									))
									OR (attribute.data_type = 'integer' AND (
										input."integerValue" IS NULL
										OR input."normalizedValue" <> input."integerValue"::text
									))
									OR (attribute.data_type = 'decimal' AND (
										input."decimalValue" IS NULL
										OR input."normalizedValue" <> input."decimalValue"::text
									))
									OR (attribute.data_type = 'boolean' AND (
										input."booleanValue" IS NULL
										OR input."normalizedValue" <> CASE WHEN input."booleanValue" THEN 'TRUE' ELSE 'FALSE' END
									))
									OR (attribute.data_type = 'date' AND (
										input."dateValue" IS NULL
										OR input."normalizedValue" <> input."dateValue"::text
									))
									OR (attribute.data_type = 'single_option' AND (
										input."optionId" IS NULL OR option.id IS NULL
										OR input."normalizedValue" <> option.normalized_code
									))
									OR (attribute.data_type = 'multiple_option' AND (
										input."optionIds" IS NULL
										OR jsonb_typeof(input."optionIds") <> 'array'
										OR jsonb_array_length(input."optionIds") = 0
										OR EXISTS (
											SELECT 1
											FROM jsonb_array_elements_text(input."optionIds") selected("optionId")
											LEFT JOIN md_item_template_attribute_option selected_option
												ON selected_option.id = selected."optionId"::uuid
												AND selected_option.organization_id = ${record.organizationId}
												AND selected_option.attribute_id = attribute.id
												AND selected_option.status = 'active'
												AND selected_option.archived_at IS NULL
											WHERE selected_option.id IS NULL
										)
										OR input."normalizedValue" <> (
											SELECT string_agg(selected_option.normalized_code, ',' ORDER BY selected_option.normalized_code)
											FROM jsonb_array_elements_text(input."optionIds") selected("optionId")
											INNER JOIN md_item_template_attribute_option selected_option
												ON selected_option.id = selected."optionId"::uuid
												AND selected_option.organization_id = ${record.organizationId}
												AND selected_option.attribute_id = attribute.id
										)
									))
									OR (attribute.data_type = 'reference' AND (
										input."referenceValue" IS NULL
										OR input."normalizedValue" <> upper(btrim(input."referenceValue"))
									))
							)
							AND (
								SELECT count(*) = count(DISTINCT input."attributeId")
								FROM jsonb_to_recordset(${attributeValuesJson}::jsonb)
									AS input("attributeId" uuid)
							)
							AND NOT EXISTS (
								SELECT 1 FROM md_item_template_attribute required_attribute
								WHERE required_attribute.organization_id = ${record.organizationId}
									AND required_attribute.template_id = ${record.templateId}
									AND required_attribute.is_required = true
									AND required_attribute.status = 'active'
									AND required_attribute.archived_at IS NULL
									AND NOT EXISTS (
										SELECT 1
										FROM jsonb_to_recordset(${attributeValuesJson}::jsonb)
											AS input("attributeId" uuid)
										WHERE input."attributeId" = required_attribute.id
									)
							)
							AND ${record.combinationKey} = (
								SELECT string_agg(attribute.normalized_code || '=' || input."normalizedValue", '|' ORDER BY attribute.normalized_code || '=' || input."normalizedValue")
								FROM jsonb_to_recordset(${attributeValuesJson}::jsonb)
									AS input("attributeId" uuid, "normalizedValue" text)
								INNER JOIN md_item_template_attribute attribute
									ON attribute.id = input."attributeId"
									AND attribute.organization_id = ${record.organizationId}
									AND attribute.template_id = ${record.templateId}
									AND attribute.is_variant_defining = true
									AND attribute.status = 'active'
									AND attribute.archived_at IS NULL
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
						) SELECT
							${variantId}, ${record.organizationId}, ${itemId}, ${record.templateId},
							${record.combinationKey}, 1, ${record.createdBy}, ${record.createdBy}
						FROM md_item item
						WHERE item.id = ${itemId}
							AND item.organization_id = ${record.organizationId}
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
					const valueAuditId = valueAuditIds[index];
					const valueEventId = valueEventIds[index];
					if (
						value === undefined ||
						valueId === undefined ||
						valueAuditId === undefined ||
						valueEventId === undefined
					) {
						continue;
					}
					statements.push(
						sql`
						WITH inserted_value AS (
							INSERT INTO md_item_variant_attribute_value (
								id, organization_id, variant_id, attribute_id, value_type,
								text_value, integer_value, decimal_value, boolean_value,
								date_value, option_id, reference_value, status, version,
								created_by, updated_by
							) SELECT
								${valueId}, ${record.organizationId}, ${variantId}, ${value.attributeId},
								${value.valueType}, ${value.textValue}, ${value.integerValue},
								${value.decimalValue}, ${value.booleanValue}, ${value.dateValue},
								${value.optionId}, ${value.referenceValue}, 'active', 1,
								${record.createdBy}, ${record.createdBy}
							FROM md_item_variant variant
							INNER JOIN md_item_template_attribute attribute
								ON attribute.id = ${value.attributeId}
								AND attribute.organization_id = variant.organization_id
								AND attribute.template_id = variant.template_id
								AND attribute.data_type = ${value.valueType}
								AND attribute.status = 'active'
								AND attribute.archived_at IS NULL
							WHERE variant.id = ${variantId}
								AND variant.organization_id = ${record.organizationId}
							RETURNING *
						), inserted_options AS (
							INSERT INTO md_item_variant_attribute_value_option (
								id, organization_id, value_id, attribute_id, option_id,
								created_by
							)
							SELECT gen_random_uuid(), ${record.organizationId}, ${valueId},
								${value.attributeId}, selected.option_id, ${record.createdBy}
							FROM inserted_value
							CROSS JOIN unnest(${value.optionIds}::uuid[]) selected(option_id)
							INNER JOIN md_item_template_attribute_option option
								ON option.id = selected.option_id
								AND option.organization_id = ${record.organizationId}
								AND option.attribute_id = ${value.attributeId}
								AND option.status = 'active'
								AND option.archived_at IS NULL
							RETURNING id
						), validated_value AS (
							SELECT inserted_value.*
							FROM inserted_value
							WHERE inserted_value.value_type <> 'multiple_option'
								OR (${value.optionIds.length} > 0
									AND (SELECT count(*) FROM inserted_options) = ${value.optionIds.length})
						), audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module,
								entity, entity_id, action, changes, new_value
							)
							SELECT
								${valueAuditId}, organization_id, created_by, ${meta.correlationId},
								'master_data', 'item_variant_attribute_value', id, 'CREATE',
								jsonb_build_array(jsonb_build_object(
									'field', 'attributeId', 'oldValue', NULL, 'newValue', attribute_id
								)),
								jsonb_build_object(
									'attributeId', attribute_id,
									'valueType', value_type,
									'version', version
								)
							FROM validated_value
							RETURNING id
						), outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${valueEventId}, organization_id,
								${EXTENSION_EVENT_TYPES.itemVariantAttributeValueAssigned},
								'master_data', ${meta.correlationId}, created_by,
								jsonb_build_object(
									'organizationId', organization_id,
									'entityType', 'item_variant_attribute_value',
									'entityId', id,
									'parentEntityId', variant_id,
									'classification', jsonb_build_object(
										'type', 'value_type',
										'code', value_type
									),
									'version', version,
									'actorId', created_by,
									'correlationId', ${meta.correlationId}::text
								), 'pending', 0
							FROM validated_value
							RETURNING id
						)
						SELECT validated_value.*
						FROM validated_value, audited, outboxed
					`,
					);
				}
				return statements;
			},
			{ isolationLevel: "Serializable" },
		);

		const [itemRows, variantRows] = results;
		const [itemRow] = itemRows;
		const [variantRow] = variantRows;
		if (itemRow === undefined || variantRow === undefined) {
			return fail("CONFLICT", "Item variant create precondition failed", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
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
			values.push(
				mapItemVariantAttributeValueFromSql(
					valueRow,
					record.attributeValues[index]?.optionIds ?? [],
				),
			);
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
								'correlationId', ${correlationId}::text
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
		return failFromPersistence(
			error,
			"Failed to retire item variant membership",
		);
	}
}

/**
 * Item lifecycle transition with optional same-TX variant membership retire
 * when `toStatus === 'retired'` (appendVariantRetireToItemTransition pattern).
 */
export async function drizzleTransitionItemWithVariantSideEffect(
	record: ItemLifecycleRecord,
	_ports: MutationPorts,
	meta: {
		correlationId: string;
		eventSuffix: ItemLifecycleEventSuffix;
		variantExpectation?: { id: string; expectedVersion: number };
	},
): Promise<Result<Item>> {
	try {
		const [existing] = await db
			.select()
			.from(mdItem)
			.where(
				tenantEntityPredicate(
					{ id: mdItem.id, organizationId: mdItem.organizationId },
					{ id: record.id, organizationId: record.organizationId },
				),
			)
			.limit(1);
		if (existing === undefined) {
			return fail("NOT_FOUND", "Item not found", {
				reason: "MASTER_NOT_FOUND",
			} satisfies MasterFailureDetails);
		}
		if (existing.version !== record.expectedVersion) {
			return fail("CONFLICT", "Item version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		const currentStatus = mapItem(existing).status;
		const lifecycle =
			record.toStatus === "draft"
				? assertRestoreTransition(currentStatus, "draft")
				: assertLifecycleTransition(currentStatus, record.toStatus);
		if (!lifecycle.ok) {
			return lifecycle;
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
		const variantAuditId = randomUUID();
		const variantExpectation:
			| { id: string; expectedVersion: number }
			| undefined = meta.variantExpectation;
		const expectedVariantId =
			variantExpectation === undefined ? null : variantExpectation.id;
		const expectedVariantVersion =
			variantExpectation === undefined
				? null
				: variantExpectation.expectedVersion;
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
								AND status = ${existing.status}
								AND (${expectedVariantId}::uuid IS NULL OR EXISTS (
									SELECT 1 FROM md_item_variant expected_variant
									WHERE expected_variant.id = ${expectedVariantId}::uuid
										AND expected_variant.organization_id = ${record.organizationId}
										AND expected_variant.item_id = ${record.id}::uuid
										AND expected_variant.version = ${expectedVariantVersion}
										AND expected_variant.retired_at IS NULL
								))
								AND NOT EXISTS (
									SELECT 1
									FROM md_item_uom uom
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
								AND (${expectedVariantId}::uuid IS NULL OR v.id = ${expectedVariantId}::uuid)
								AND (${expectedVariantVersion}::integer IS NULL OR v.version = ${expectedVariantVersion})
							RETURNING v.*
						),
						variant_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value
							)
							SELECT
								${variantAuditId}, organization_id, ${record.actorUserId}, ${meta.correlationId},
								'master_data', 'item_variant', id, 'UPDATE',
								jsonb_build_array(jsonb_build_object(
									'field', 'retiredAt', 'oldValue', NULL, 'newValue', retired_at
								)),
								jsonb_build_object('retiredAt', NULL, 'version', version - 1),
								jsonb_build_object('retiredAt', retired_at, 'version', version)
							FROM variant_retired
							RETURNING id
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
									'correlationId', ${meta.correlationId}::text
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
								AND status = ${existing.status}
								AND (
									${record.toStatus}::text <> 'active'
									OR (
										EXISTS (
											SELECT 1 FROM md_item_group item_group
											WHERE item_group.id = md_item.item_group_id
												AND item_group.organization_id = ${record.organizationId}
												AND item_group.status = 'active'
												AND item_group.retired_at IS NULL
										)
										AND EXISTS (
											SELECT 1 FROM ref_uom base_uom
											WHERE base_uom.id = md_item.base_uom_id
												AND base_uom.active = true
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
			{ isolationLevel: "Serializable" },
		);
		const [row] = rows;
		if (row === undefined) {
			return fail("CONFLICT", "Item version conflict", {
				reason: "MASTER_VERSION_CONFLICT",
			} satisfies MasterFailureDetails);
		}
		return ok(mapItemFromSql(row));
	} catch (error) {
		return failFromPersistence(error, "Failed to transition item");
	}
}

export async function drizzleRetireItemVariant(
	record: ItemVariantRetireRecord,
	ports: MutationPorts,
	meta: { correlationId: string },
): Promise<Result<ItemVariant>> {
	const retiredItem = await drizzleTransitionItemWithVariantSideEffect(
		{
			organizationId: record.organizationId,
			id: record.itemId,
			expectedVersion: record.expectedItemVersion,
			actorUserId: record.actorUserId,
			toStatus: "retired",
		},
		ports,
		{
			correlationId: meta.correlationId,
			eventSuffix: "retired",
			variantExpectation: {
				id: record.variantId,
				expectedVersion: record.expectedVariantVersion,
			},
		},
	);
	if (!retiredItem.ok) {
		return retiredItem;
	}
	const variant = await drizzleGetItemVariantById(
		record.organizationId,
		record.variantId,
	);
	if (!variant.ok) {
		return variant;
	}
	return variant.data === null
		? fail("INTERNAL_ERROR", "Item variant missing after retire")
		: ok(variant.data);
}
