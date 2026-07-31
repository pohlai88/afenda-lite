/**
 * Item templates + concrete variant items (DNA §7.3 / R1).
 * Sellable identity = md_item; attribute values are typed rows — never JSON bag.
 */
import { errorResult, type Result } from "@afenda/errors";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type { MasterCommandOptions } from "../../command-options";
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
import type {
	DependencyInspector,
	ItemTemplate,
	ItemTemplateAttribute,
	ItemTemplateAttributeOption,
	ItemVariant,
} from "../../types";
import { resolveItemVariantExtensionDeps } from "../extensions/extension-deps";
import { isOptionCompatibleAttributeDataType } from "../extensions/template-attribute-policy";
import type {
	ItemVariantAttributeValueCreateRecord,
	ItemVariantExtensionStore,
} from "../extensions/template-store";
import {
	type NormalizedVariantAttributeValue,
	normalizeVariantAttributeValue,
	type VariantAttributeValueInput,
} from "../extensions/variant-attribute-value-policy";
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

type ItemVariantAttributeInput = VariantAttributeValueInput & {
	attributeId: string;
};

interface CombinationEntry {
	attrNormalizedCode: string;
	valueNormalized: string;
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Item template not found",
		});
	}
	const transition = assertLifecycleTransition(current.data.status, toStatus);
	if (!transition.ok) {
		return transition;
	}
	if (toStatus === "active") {
		const activation = await validateItemTemplateActivation(
			store,
			parsed.data.organizationId,
			parsed.data.id,
		);
		if (!activation.ok) {
			return activation;
		}
	}
	if (toStatus === "retired") {
		const retirement = await validateItemTemplateRetirement(
			dependencyInspector,
			parsed.data.organizationId,
			parsed.data.id,
		);
		if (!retirement.ok) {
			return retirement;
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

async function validateItemTemplateActivation(
	store: Pick<
		ItemVariantExtensionStore,
		"listItemTemplateAttributes" | "listItemTemplateAttributeOptionsByTemplate"
	>,
	organizationId: string,
	templateId: string,
): Promise<Result<true>> {
	const attrs = await store.listItemTemplateAttributes(
		organizationId,
		templateId,
	);
	if (!attrs.ok) {
		return attrs;
	}
	const activeAttributes = attrs.data.filter(
		(attribute) =>
			attribute.status === "active" && attribute.archivedAt === null,
	);
	if (activeAttributes.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Activate requires at least one template attribute",
		});
	}
	if (!activeAttributes.some((attribute) => attribute.isVariantDefining)) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Activate requires at least one variant-defining attribute",
		});
	}
	const optionsResult = await store.listItemTemplateAttributeOptionsByTemplate(
		organizationId,
		templateId,
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
	const missingOptionAttribute = activeAttributes.find(
		(attribute) =>
			isOptionCompatibleAttributeDataType(attribute.dataType) &&
			!optionAttributeIds.has(attribute.id),
	);
	if (missingOptionAttribute !== undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	return errorResult.ok(true);
}

async function validateItemTemplateRetirement(
	dependencyInspector: DependencyInspector,
	organizationId: string,
	templateId: string,
): Promise<Result<true>> {
	const blockers = await dependencyInspector.listBlockers({
		organizationId,
		entityType: "item_template",
		entityId: templateId,
	});
	if (blockers.length > 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Item template has dependency blockers",
		});
	}
	return errorResult.ok(true);
}

export function activateItemTemplate(
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

export function inactiveItemTemplate(
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

export function retireItemTemplate(
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Item template not found",
		});
	}
	if (template.data.status !== "active") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Variants require an active template",
		});
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
	const providedAttributeValidation = validateProvidedVariantAttributes(
		activeAttributes,
		parsed.data.attributeValues,
	);
	if (!providedAttributeValidation.ok) {
		return providedAttributeValidation;
	}
	const optionsResult = await store.listItemTemplateAttributeOptionsByTemplate(
		parsed.data.organizationId,
		parsed.data.templateId,
	);
	if (!optionsResult.ok) {
		return optionsResult;
	}
	const valueRecordsResult = buildVariantAttributeRecords(
		activeAttributes,
		optionsResult.data,
		parsed.data.attributeValues,
	);
	if (!valueRecordsResult.ok) {
		return valueRecordsResult;
	}
	const { combinationEntries, valueRecords } = valueRecordsResult.data;
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

function validateProvidedVariantAttributes(
	activeAttributes: readonly ItemTemplateAttribute[],
	values: readonly ItemVariantAttributeInput[],
): Result<true> {
	const seenAttributeIds = new Set<string>();
	for (const value of values) {
		if (seenAttributeIds.has(value.attributeId)) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Duplicate template attribute value",
			});
		}
		seenAttributeIds.add(value.attributeId);
	}
	const providedIds = new Set(
		values.map((value) => masterIdKey(value.attributeId)),
	);
	const missingRequired = activeAttributes.find(
		(attribute) => attribute.isRequired && !providedIds.has(attribute.id),
	);
	if (missingRequired !== undefined) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
		});
	}
	return errorResult.ok(true);
}

function buildVariantAttributeRecords(
	activeAttributes: readonly ItemTemplateAttribute[],
	options: readonly ItemTemplateAttributeOption[],
	values: readonly ItemVariantAttributeInput[],
): Result<{
	combinationEntries: CombinationEntry[];
	valueRecords: ItemVariantAttributeValueCreateRecord[];
}> {
	const attrById = new Map(
		activeAttributes.map((attr) => [masterIdKey(attr.id), attr] as const),
	);
	const optionById = new Map(
		options
			.filter(
				(option) => option.status === "active" && option.archivedAt === null,
			)
			.map((option) => [masterIdKey(option.id), option] as const),
	);
	const combinationEntries: CombinationEntry[] = [];
	const valueRecords: ItemVariantAttributeValueCreateRecord[] = [];
	for (const value of values) {
		const attr = attrById.get(value.attributeId);
		if (attr === undefined) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Unknown template attribute",
			});
		}
		const normalized = normalizeVariantAttributeValue({
			dataType: attr.dataType,
			validationRules: attr.validationRules,
			value,
		});
		if (!normalized.ok) {
			return normalized;
		}
		const normalizedValue = resolveVariantOptionValue(
			attr,
			normalized.data,
			optionById,
		);
		if (!normalizedValue.ok) {
			return normalizedValue;
		}
		if (attr.isVariantDefining) {
			combinationEntries.push({
				attrNormalizedCode: attr.normalizedCode,
				valueNormalized: normalizedValue.data,
			});
		}
		valueRecords.push({
			attributeId: attr.id,
			...normalized.data,
			normalizedValue: normalizedValue.data,
		});
	}
	return errorResult.ok({ combinationEntries, valueRecords });
}

function resolveVariantOptionValue(
	attribute: ItemTemplateAttribute,
	normalized: NormalizedVariantAttributeValue,
	optionById: ReadonlyMap<string, ItemTemplateAttributeOption>,
): Result<string> {
	if (attribute.dataType === "single_option") {
		const option = optionById.get(normalized.optionId ?? "");
		if (option === undefined || option.attributeId !== attribute.id) {
			return invalidVariantOption(attribute);
		}
		return errorResult.ok(option.normalizedCode);
	}
	if (attribute.dataType === "multiple_option") {
		const selectedOptions = normalized.optionIds.map((optionId) =>
			optionById.get(optionId),
		);
		if (
			selectedOptions.some(
				(option) => option === undefined || option.attributeId !== attribute.id,
			)
		) {
			return invalidVariantOption(attribute);
		}
		return errorResult.ok(
			selectedOptions
				.map((option) => option?.normalizedCode ?? "")
				.sort((left, right) => left.localeCompare(right))
				.join(","),
		);
	}
	return errorResult.ok(normalized.normalizedValue);
}

function invalidVariantOption(
	_attribute: ItemTemplateAttribute,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
	});
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
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Item variant not found",
		});
	}
	if (current.data.retiredAt !== null) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Item variant is already retired",
		});
	}
	const version = assertExpectedVersion(
		current.data,
		parsed.data.expectedVersion,
	);
	if (!version.ok) {
		return version;
	}
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
		return errorResult.fail("CONFLICT", {
			publicMessage: "Variant item has dependency blockers",
		});
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
