/**
 * Item templates + concrete variant items (DNA §7.3 / R1).
 * Sellable identity = md_item; attribute values are typed rows — never JSON bag.
 */
import { fail, type Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "./authorization";
import {
	type MasterCommandOptions,
	resolveCommandDeps,
} from "./command-options";
import type { MasterFailureDetails } from "./contracts/reasons";
import {
	MASTER_COMMAND_ITEM_TEMPLATE_ACTIVATE,
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_OPTION_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_INACTIVE,
	MASTER_COMMAND_ITEM_TEMPLATE_RETIRE,
	MASTER_COMMAND_ITEM_TEMPLATE_UPDATE,
	MASTER_COMMAND_ITEM_VARIANT_CREATE,
	MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_LIST,
	MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_OPTION_LIST,
	MASTER_QUERY_ITEM_TEMPLATE_GET_BY_CODE,
	MASTER_QUERY_ITEM_TEMPLATE_GET_BY_ID,
	MASTER_QUERY_ITEM_TEMPLATE_LIST,
	MASTER_QUERY_ITEM_VARIANT_GET_BY_ID,
	MASTER_QUERY_ITEM_VARIANT_LIST_BY_TEMPLATE,
	type MasterCommandId,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import {
	addItemTemplateAttributeInputSchema,
	addItemTemplateAttributeOptionInputSchema,
	createItemTemplateInputSchema,
	createItemVariantInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	getItemVariantByIdInputSchema,
	itemTemplateLifecycleInputSchema,
	listItemTemplateAttributeOptionsInputSchema,
	listItemTemplateAttributesInputSchema,
	listItemVariantsByTemplateInputSchema,
	masterListOptionsSchema,
	updateItemTemplateInputSchema,
} from "./schemas";
import { normalizeMasterCode } from "./shared/code";
import {
	buildCombinationKey,
	normalizeAttributeValueText,
} from "./shared/combination-key";
import { assertLifecycleTransition } from "./shared/lifecycle";
import type {
	ItemTemplate,
	ItemTemplateAttribute,
	ItemTemplateAttributeOption,
	ItemVariant,
} from "./types";

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
	const { store, ports, authorization } = resolveCommandDeps(options);
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
	const parsed = parseMasterInput(
		updateItemTemplateInputSchema,
		input,
		"Invalid item template update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
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
	toStatus: ItemTemplate["status"],
	eventSuffix: string,
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
	const { store, ports, authorization } = resolveCommandDeps(options);
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
		if (attrs.data.length === 0) {
			return fail(
				"CONFLICT",
				"Activate requires at least one template attribute",
				{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
			);
		}
		for (const attr of attrs.data) {
			if (attr.valueKind !== "option") {
				continue;
			}
			const optionsResult = await store.listItemTemplateAttributeOptions(
				parsed.data.organizationId,
				attr.id,
			);
			if (!optionsResult.ok) {
				return optionsResult;
			}
			if (optionsResult.data.length === 0) {
				return fail(
					"CONFLICT",
					`Option attribute ${attr.code} requires at least one option`,
					{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
				);
			}
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
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

export async function addItemTemplateAttribute(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplateAttribute>> {
	const parsed = parseMasterInput(
		addItemTemplateAttributeInputSchema,
		input,
		"Invalid add item template attribute input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE,
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
	if (template.data.status !== "draft") {
		return fail(
			"CONFLICT",
			"Attributes can only be added while the template is draft",
			{ reason: "MASTER_INVALID_STATE" } satisfies MasterFailureDetails,
		);
	}
	return store.addItemTemplateAttribute(
		{
			organizationId: parsed.data.organizationId,
			templateId: parsed.data.templateId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			valueKind: parsed.data.valueKind,
			isRequired: parsed.data.isRequired ?? true,
			sortOrder: parsed.data.sortOrder ?? 0,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function addItemTemplateAttributeOption(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplateAttributeOption>> {
	const parsed = parseMasterInput(
		addItemTemplateAttributeOptionInputSchema,
		input,
		"Invalid add item template attribute option input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_OPTION_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.addItemTemplateAttributeOption(
		{
			organizationId: parsed.data.organizationId,
			attributeId: parsed.data.attributeId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			label: parsed.data.label,
			sortOrder: parsed.data.sortOrder ?? 0,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listItemTemplateAttributes(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplateAttribute[]>> {
	const parsed = parseMasterInput(
		listItemTemplateAttributesInputSchema,
		input,
		"Invalid list item template attributes input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemTemplateAttributes(
		parsed.data.organizationId,
		parsed.data.templateId,
	);
}

export async function listItemTemplateAttributeOptions(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemTemplateAttributeOption[]>> {
	const parsed = parseMasterInput(
		listItemTemplateAttributeOptionsInputSchema,
		input,
		"Invalid list item template attribute options input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_OPTION_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemTemplateAttributeOptions(
		parsed.data.organizationId,
		parsed.data.attributeId,
	);
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
	const { store, ports, authorization } = resolveCommandDeps(options);
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
	const attrById = new Map(
		attrs.data.map((attr) => [attr.id as string, attr] as const),
	);
	const providedIds = new Set(
		parsed.data.attributeValues.map((value) => value.attributeId as string),
	);
	for (const attr of attrs.data) {
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
	const valueRecords = [];
	for (const value of parsed.data.attributeValues) {
		const attr = attrById.get(value.attributeId);
		if (attr === undefined) {
			return fail("BAD_REQUEST", "Unknown template attribute", {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		if (attr.valueKind === "text") {
			if (value.valueText === undefined || value.optionId !== undefined) {
				return fail(
					"BAD_REQUEST",
					`Attribute ${attr.code} requires valueText`,
					{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
				);
			}
			const normalizedValue = normalizeAttributeValueText(value.valueText);
			combinationEntries.push({
				attrNormalizedCode: attr.normalizedCode,
				valueNormalized: normalizedValue,
			});
			valueRecords.push({
				attributeId: attr.id,
				valueText: value.valueText.normalize("NFC").trim(),
				optionId: null,
				normalizedValue,
			});
			continue;
		}
		if (value.optionId === undefined || value.valueText !== undefined) {
			return fail("BAD_REQUEST", `Attribute ${attr.code} requires optionId`, {
				reason: "MASTER_VALIDATION_FAILED",
			} satisfies MasterFailureDetails);
		}
		const optionsResult = await store.listItemTemplateAttributeOptions(
			parsed.data.organizationId,
			attr.id,
		);
		if (!optionsResult.ok) {
			return optionsResult;
		}
		const option = optionsResult.data.find((row) => row.id === value.optionId);
		if (option === undefined) {
			return fail(
				"BAD_REQUEST",
				`Option does not belong to attribute ${attr.code}`,
				{ reason: "MASTER_VALIDATION_FAILED" } satisfies MasterFailureDetails,
			);
		}
		combinationEntries.push({
			attrNormalizedCode: attr.normalizedCode,
			valueNormalized: option.normalizedCode,
		});
		valueRecords.push({
			attributeId: attr.id,
			valueText: null,
			optionId: option.id,
			normalizedValue: option.normalizedCode,
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
	const { store, authorization } = resolveCommandDeps(options);
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
	const { store, authorization } = resolveCommandDeps(options);
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
