/**
 * Item templates + concrete variant items (DNA §7.3 / R1).
 * Sellable identity = md_item; attribute values are typed rows — never JSON bag.
 */
import { fail, type Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type { MasterCommandOptions } from "../../command-options";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MASTER_COMMAND_ITEM_TEMPLATE_ACTIVATE,
	MASTER_COMMAND_ITEM_TEMPLATE_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE,
	MASTER_COMMAND_ITEM_TEMPLATE_RETIRE,
	MASTER_COMMAND_ITEM_TEMPLATE_UPDATE,
	MASTER_COMMAND_ITEM_VARIANT_CREATE,
	MASTER_COMMAND_ITEM_VARIANT_RETIRE,
	MASTER_QUERY_ITEM_TEMPLATE_GET_BY_CODE,
	MASTER_QUERY_ITEM_TEMPLATE_GET_BY_ID,
	MASTER_QUERY_ITEM_TEMPLATE_LIST,
	MASTER_QUERY_ITEM_VARIANT_GET_BY_ID,
	MASTER_QUERY_ITEM_VARIANT_LIST_BY_TEMPLATE,
	type MasterCommandId,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { ItemTemplate, ItemVariant } from "../../types";
import { resolveItemVariantExtensionDeps } from "../extensions/extension-deps";
import { isOptionCompatibleAttributeDataType } from "../extensions/template-attribute-policy";
import { normalizeVariantAttributeValue } from "../extensions/variant-attribute-value-policy";
import { assertNoLifecycleControlledFieldMutation } from "../lifecycle-governance";
import type { ItemTemplateLifecycleEventSuffix } from "./core-master-events";
import { assertLifecycleTransition } from "./lifecycle";
import { normalizeMasterCode } from "./normalized-code";
import {
	createItemTemplateInputSchema,
	createItemVariantInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	getItemVariantByIdInputSchema,
	itemTemplateLifecycleInputSchema,
	listItemVariantsByTemplateInputSchema,
	masterListOptionsSchema,
	retireItemVariantInputSchema,
	updateItemTemplateInputSchema,
} from "./schemas";
import { buildCombinationKey } from "./variant-signature";
import { assertExpectedVersion } from "./version-cas";

export {
	addItemTemplateAttribute,
	listItemTemplateAttributes,
	listTemplateAttributes,
} from "../extensions/template-attributes";
export {
	addItemTemplateAttributeOption,
	listItemTemplateAttributeOptions,
	listTemplateAttributeOptions,
} from "../extensions/template-options";
export {
	getVariantConfiguration,
	listVariantAttributeValues,
} from "../extensions/variant-attribute-values";

function masterIdKey(value: string): string {
	return value;
}

export async function createItemTemplate(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate>> {
	const parsed = parseMasterInput(
		createItemTemplateInputSchema,
		input,
		"Invalid item template create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveItemVariantExtensionDeps(
		options,
		["createItemTemplate"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_TEMPLATE_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	return store.createItemTemplate(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updateItemTemplate(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate>> {
	const lifecycleFields = assertNoLifecycleControlledFieldMutation(input, {
		entityType: "item_template",
	});
	if (!lifecycleFields.ok) {
		return lifecycleFields;
	}
	const parsed = parseMasterInput(
		updateItemTemplateInputSchema,
		input,
		"Invalid item template update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveItemVariantExtensionDeps(
		options,
		["updateItemTemplate"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_TEMPLATE_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.updateItemTemplate(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			name: parsed.data.name,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

async function transitionItemTemplateStatus(
	input: unknown,
	toStatus: "active" | "inactive" | "retired",
	eventSuffix: ItemTemplateLifecycleEventSuffix,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<ItemTemplate>> {
	const parsed = parseMasterInput(
		itemTemplateLifecycleInputSchema,
		input,
		"Invalid item template lifecycle input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, dependencyInspector, authorization } =
		resolveItemVariantExtensionDeps(options, [
			"getItemTemplateById",
			"listItemTemplateAttributes",
			"listItemTemplateAttributeOptionsByTemplate",
			"transitionItemTemplate",
		]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getItemTemplateById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Item template not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	const transition = assertLifecycleTransition(current.data.status, toStatus);
	if (!transition.ok) {
		return transition;
	}
	if (toStatus === "active") {
		const attrs = await store.listItemTemplateAttributes(
			parsed.data.organizationId,
			parsed.data.id,
		);
		if (!attrs.ok) {
			return attrs;
		}
		const activeAttributes = attrs.data.filter(
			(attribute) =>
				attribute.status === "active" && attribute.archivedAt === null,
		);
		if (activeAttributes.length === 0) {
			return fail(
				"CONFLICT",
				"Activate requires at least one template attribute",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
		if (!activeAttributes.some((attribute) => attribute.isVariantDefining)) {
			return fail(
				"CONFLICT",
				"Activate requires at least one variant-defining attribute",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
		const optionsResult =
			await store.listItemTemplateAttributeOptionsByTemplate(
				parsed.data.organizationId,
				parsed.data.id,
			);
		if (!optionsResult.ok) {
			return optionsResult;
		}
		const optionAttributeIds = new Set(
			optionsResult.data
				.filter(
					(option) => option.status === "active" && option.archivedAt === null,
				)
				.map((option) => masterIdKey(option.attributeId)),
		);
		for (const attr of activeAttributes) {
			if (!isOptionCompatibleAttributeDataType(attr.dataType)) {
				continue;
			}
			if (!optionAttributeIds.has(attr.id)) {
				return fail(
					"CONFLICT",
					`Option attribute ${attr.code} requires at least one option`,
					{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
				);
			}
		}
	}
	if (toStatus === "retired") {
		const blockers = await dependencyInspector.listBlockers({
			organizationId: parsed.data.organizationId,
			entityType: "item_template",
			entityId: parsed.data.id,
		});
		if (blockers.length > 0) {
			return fail("CONFLICT", "Item template has dependency blockers", {
				reason: "MASTER_DEPENDENCY_BLOCKED",
				blockers,
			} satisfies MasterFailureDetails);
		}
	}
	return store.transitionItemTemplate(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
			toStatus,
		},
		ports,
		{ correlationId: parsed.data.correlationId, eventSuffix },
	);
}

export async function activateItemTemplate(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate>> {
	return transitionItemTemplateStatus(
		input,
		"active",
		"activated",
		MASTER_COMMAND_ITEM_TEMPLATE_ACTIVATE,
		options,
	);
}

export async function inactiveItemTemplate(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate>> {
	return transitionItemTemplateStatus(
		input,
		"inactive",
		"inactive",
		MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE,
		options,
	);
}

export async function retireItemTemplate(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate>> {
	return transitionItemTemplateStatus(
		input,
		"retired",
		"retired",
		MASTER_COMMAND_ITEM_TEMPLATE_RETIRE,
		options,
	);
}

export const archiveItemTemplate = retireItemTemplate;

export async function getItemTemplateById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid get item template by id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"getItemTemplateById",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_TEMPLATE_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getItemTemplateById(parsed.data.organizationId, parsed.data.id);
}

export async function getItemTemplateByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid get item template by code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"getItemTemplateByCode",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_TEMPLATE_GET_BY_CODE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	return store.getItemTemplateByCode(
		parsed.data.organizationId,
		codeResult.data.normalizedCode,
	);
}

export async function listItemTemplates(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplate[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid list item templates input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"listItemTemplates",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_TEMPLATE_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemTemplates({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
	});
}

export async function createItemVariant(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemVariant>> {
	const parsed = parseMasterInput(
		createItemVariantInputSchema,
		input,
		"Invalid create item variant input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const { store, ports, authorization } = resolveItemVariantExtensionDeps(
		options,
		[
			"getItemTemplateById",
			"listItemTemplateAttributes",
			"listItemTemplateAttributeOptionsByTemplate",
			"createItemVariant",
		],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_VARIANT_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const template = await store.getItemTemplateById(
		parsed.data.organizationId,
		parsed.data.templateId,
	);
	if (!template.ok) {
		return template;
	}
	if (template.data === null) {
		return fail("NOT_FOUND", "Item template not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	if (template.data.status !== "active") {
		return fail("CONFLICT", "Variants require an active template", {
			reason: "MASTER_INVALID_STATE",
		} satisfies MasterFailureDetails);
	}
	const attrs = await store.listItemTemplateAttributes(
		parsed.data.organizationId,
		parsed.data.templateId,
	);
	if (!attrs.ok) {
		return attrs;
	}
	const activeAttributes = attrs.data.filter(
		(attribute) =>
			attribute.status === "active" && attribute.archivedAt === null,
	);
	const attrById = new Map(
		activeAttributes.map((attr) => [masterIdKey(attr.id), attr] as const),
	);
	const seenAttributeIds = new Set<string>();
	for (const value of parsed.data.attributeValues) {
		if (seenAttributeIds.has(value.attributeId)) {
			return fail("BAD_REQUEST", "Duplicate template attribute value", {
				reason: "MASTER_VALIDATION_FAILED",
				attributeId: value.attributeId,
			} satisfies MasterFailureDetails);
		}
		seenAttributeIds.add(value.attributeId);
	}
	const providedIds = new Set(
		parsed.data.attributeValues.map((value) => masterIdKey(value.attributeId)),
	);
	for (const attr of activeAttributes) {
		if (attr.isRequired && !providedIds.has(attr.id)) {
			return fail("BAD_REQUEST", `Missing required attribute ${attr.code}`, {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
	}
	const combinationEntries: Array<{
		attrNormalizedCode: string;
		valueNormalized: string;
	}> = [];
	const optionsResult = await store.listItemTemplateAttributeOptionsByTemplate(
		parsed.data.organizationId,
		parsed.data.templateId,
	);
	if (!optionsResult.ok) {
		return optionsResult;
	}
	const optionById = new Map(
		optionsResult.data
			.filter(
				(option) => option.status === "active" && option.archivedAt === null,
			)
			.map((option) => [masterIdKey(option.id), option] as const),
	);
	const valueRecords = [];
	for (const value of parsed.data.attributeValues) {
		const attr = attrById.get(value.attributeId);
		if (attr === undefined) {
			return fail("BAD_REQUEST", "Unknown template attribute", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		const normalized = normalizeVariantAttributeValue({
			dataType: attr.dataType,
			validationRules: attr.validationRules,
			value,
		});
		if (!normalized.ok) return normalized;
		let normalizedValue = normalized.data.normalizedValue;
		if (attr.dataType === "single_option") {
			const option = optionById.get(normalized.data.optionId ?? "");
			if (option === undefined || option.attributeId !== attr.id) {
				return fail(
					"BAD_REQUEST",
					`Option does not belong to attribute ${attr.code}`,
					{
						reason: "MASTER_VALIDATION_FAILED",
					} satisfies MasterFailureDetails,
				);
			}
			normalizedValue = option.normalizedCode;
		}
		if (attr.dataType === "multiple_option") {
			const options = normalized.data.optionIds.map((optionId) =>
				optionById.get(optionId),
			);
			if (
				options.some(
					(option) => option === undefined || option.attributeId !== attr.id,
				)
			) {
				return fail(
					"BAD_REQUEST",
					`Option does not belong to attribute ${attr.code}`,
					{
						reason: "MASTER_VALIDATION_FAILED",
					} satisfies MasterFailureDetails,
				);
			}
			normalizedValue = options
				.map((option) => option?.normalizedCode ?? "")
				.sort()
				.join(",");
		}
		if (attr.isVariantDefining) {
			combinationEntries.push({
				attrNormalizedCode: attr.normalizedCode,
				valueNormalized: normalizedValue,
			});
		}
		valueRecords.push({
			attributeId: attr.id,
			...normalized.data,
			normalizedValue,
		});
	}
	return store.createItemVariant(
		{
			organizationId: parsed.data.organizationId,
			templateId: parsed.data.templateId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			itemType: parsed.data.itemType,
			baseUomId: parsed.data.baseUomId,
			itemGroupId: parsed.data.itemGroupId,
			combinationKey: buildCombinationKey(combinationEntries),
			attributeValues: valueRecords,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

/**
 * Retire a concrete variant: CAS on membership version, then retire the linked
 * `md_item` (same-TX variant membership retire via store transition).
 */
export async function retireItemVariant(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemVariant>> {
	const parsed = parseMasterInput(
		retireItemVariantInputSchema,
		input,
		"Invalid retire item variant input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, dependencyInspector, authorization } =
		resolveItemVariantExtensionDeps(options, [
			"getItemVariantById",
			"retireItemVariant",
		]);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_VARIANT_RETIRE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getItemVariantById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Item variant not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	if (current.data.retiredAt !== null) {
		return fail("CONFLICT", "Item variant is already retired", {
			reason: "MASTER_INVALID_STATE",
		} satisfies MasterFailureDetails);
	}
	const version = assertExpectedVersion(
		current.data,
		parsed.data.expectedVersion,
	);
	if (!version.ok) return version;
	const lifecycle = assertLifecycleTransition(
		current.data.item.status,
		"retired",
	);
	if (!lifecycle.ok) {
		return lifecycle;
	}
	const blockers = await dependencyInspector.listBlockers({
		organizationId: parsed.data.organizationId,
		entityType: "item",
		entityId: current.data.itemId,
	});
	if (blockers.length > 0) {
		return fail("CONFLICT", "Variant item has dependency blockers", {
			reason: "MASTER_DEPENDENCY_BLOCKED",
			blockers,
		} satisfies MasterFailureDetails);
	}
	return store.retireItemVariant(
		{
			organizationId: parsed.data.organizationId,
			variantId: current.data.id,
			expectedVariantVersion: parsed.data.expectedVersion,
			itemId: current.data.itemId,
			expectedItemVersion: current.data.item.version,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getItemVariantById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemVariant | null>> {
	const parsed = parseMasterInput(
		getItemVariantByIdInputSchema,
		input,
		"Invalid get item variant by id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"getItemVariantById",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_VARIANT_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getItemVariantById(parsed.data.organizationId, parsed.data.id);
}

export async function listItemVariantsByTemplate(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemVariant[]>> {
	const parsed = parseMasterInput(
		listItemVariantsByTemplateInputSchema,
		input,
		"Invalid list item variants input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"listItemVariantsByTemplate",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_VARIANT_LIST_BY_TEMPLATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemVariantsByTemplate({
		organizationId: parsed.data.organizationId,
		templateId: parsed.data.templateId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
	});
}
