/** Item template attribute commands and queries. */

import { fail, type Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type {
	MasterCommandOptions,
	MasterQueryOptions,
} from "../../command-options";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE,
	MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE_VARIANT_DEFINING,
	MASTER_QUERY_ITEM_TEMPLATE_ATTRIBUTE_LIST,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { ItemTemplateAttribute } from "../../types";
import { normalizeMasterCode } from "../core-organization-masters/normalized-code";
import { resolveItemVariantExtensionDeps } from "./extension-deps";
import {
	addItemTemplateAttributeInputSchema,
	listItemTemplateAttributesInputSchema,
} from "./extension-schemas";
import { parseTemplateAttributeValidationRules } from "./template-attribute-policy";

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
	const validationRules = parseTemplateAttributeValidationRules(
		parsed.data.dataType,
		parsed.data.validationRules,
	);
	if (!validationRules.ok) return validationRules;
	const isVariantDefining = parsed.data.isVariantDefining ?? false;
	const isRequired = parsed.data.isRequired ?? false;
	const isSearchable = parsed.data.isSearchable ?? false;
	const { store, ports, authorization } = resolveItemVariantExtensionDeps(
		options,
		["getItemTemplateById", "addItemTemplateAttribute"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: isVariantDefining
			? MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE_VARIANT_DEFINING
			: MASTER_COMMAND_ITEM_TEMPLATE_ATTRIBUTE_CREATE,
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
			field: "templateId",
		} satisfies MasterFailureDetails);
	}
	if (template.data.status !== "draft") {
		return fail(
			"CONFLICT",
			"Attributes can only be added while the template is draft",
			{
				reason: "MASTER_INVALID_STATE",
				field: "templateId",
				actualStatus: template.data.status,
				requiredStatus: "draft",
			} satisfies MasterFailureDetails,
		);
	}
	return store.addItemTemplateAttribute(
		{
			organizationId: parsed.data.organizationId,
			templateId: parsed.data.templateId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			description: parsed.data.description ?? null,
			dataType: parsed.data.dataType,
			isRequired,
			isVariantDefining,
			isSearchable,
			displayOrder: parsed.data.displayOrder,
			validationRules: validationRules.data,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listItemTemplateAttributes(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemTemplateAttribute[]>> {
	const parsed = parseMasterInput(
		listItemTemplateAttributesInputSchema,
		input,
		"Invalid list item template attributes input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemVariantExtensionDeps(options, [
		"listItemTemplateAttributes",
	]);
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

/** @deprecated Use listItemTemplateAttributes. */
export const listTemplateAttributes = listItemTemplateAttributes;
