/** Item template attribute option commands and queries. */

import { errorResult, type Result } from "@afenda/errors";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type {
	MasterCommandOptions,
	MasterQueryOptions,
} from "../../command-options";
import {
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_OPTION_CREATE,
	MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_OPTION_LIST,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { ItemTemplateAttributeOption } from "../../types";
import { normalizeMasterCode } from "../core-organization-masters/normalized-code";
import { resolveItemVariantExtensionDeps } from "./extension-deps";
import {
	addItemTemplateAttributeOptionInputSchema,
	listItemTemplateAttributeOptionsInputSchema,
} from "./extension-schemas";
import { isOptionCompatibleAttributeDataType } from "./template-attribute-policy";

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
	const { store, ports, authorization } = resolveItemVariantExtensionDeps(
		options,
		["getItemTemplateAttributeContextById", "addItemTemplateAttributeOption"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_OPTION_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const context = await store.getItemTemplateAttributeContextById(
		parsed.data.organizationId,
		parsed.data.attributeId,
	);
	if (!context.ok) {
		return context;
	}
	if (context.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Item template attribute not found",
		});
	}
	if (!isOptionCompatibleAttributeDataType(context.data.attribute.dataType)) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Options can only be added to option-compatible attributes",
		});
	}
	if (context.data.template.status !== "draft") {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Attribute options can only be added while the template is draft",
		});
	}
	return store.addItemTemplateAttributeOption(
		{
			organizationId: parsed.data.organizationId,
			attributeId: parsed.data.attributeId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			label: parsed.data.label,
			description: parsed.data.description ?? null,
			displayOrder: parsed.data.displayOrder,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listItemTemplateAttributeOptions(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemTemplateAttributeOption[]>> {
	const parsed = parseMasterInput(
		listItemTemplateAttributeOptionsInputSchema,
		input,
		"Invalid list item template attribute options input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"getItemTemplateAttributeContextById",
		"listItemTemplateAttributeOptions",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_OPTION_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const context = await store.getItemTemplateAttributeContextById(
		parsed.data.organizationId,
		parsed.data.attributeId,
	);
	if (!context.ok) {
		return context;
	}
	if (context.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Item template attribute not found",
		});
	}
	if (!isOptionCompatibleAttributeDataType(context.data.attribute.dataType)) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Options can only be listed for option-compatible attributes",
		});
	}
	return store.listItemTemplateAttributeOptions(
		parsed.data.organizationId,
		parsed.data.attributeId,
	);
}

/** @deprecated Use listItemTemplateAttributeOptions. */
export const listTemplateAttributeOptions = listItemTemplateAttributeOptions;
