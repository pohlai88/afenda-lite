/** Item external-ID commands and queries. */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type { MasterCommandOptions } from "../../command-options";
import {
	MASTER_COMMAND_ITEM_EXTERNAL_ID_CREATE,
	MASTER_QUERY_ITEM_FIND_BY_EXTERNAL_ID,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { Item, ItemExternalId } from "../../types";
import { resolveItemExtensionDeps } from "./extension-deps";
import { requireItemExtensionParent } from "./extension-policies";
import {
	createItemExternalIdInputSchema,
	findItemByExternalIdInputSchema,
} from "./extension-schemas";
import { normalizeExternalId } from "./external-id-normalization";

export async function createItemExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemExternalId>> {
	const parsed = parseMasterInput(
		createItemExternalIdInputSchema,
		input,
		"Invalid item external-ID create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const normalized = normalizeExternalId({
		sourceSystem: parsed.data.sourceSystem,
		externalIdType: parsed.data.externalIdType,
		externalValue: parsed.data.externalValue,
		caseSensitivity: parsed.data.caseSensitivity,
	});
	if (!normalized.ok) return normalized;
	const { store, roots, ports, authorization } = resolveItemExtensionDeps(
		options,
		["createItemExternalId"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_EXTERNAL_ID_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const parent = await requireItemExtensionParent(
		roots,
		parsed.data.organizationId,
		parsed.data.itemId,
	);
	if (!parent.ok) return parent;
	return store.createItemExternalId(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			sourceSystem: normalized.data.sourceSystem,
			externalIdType: normalized.data.externalIdType,
			externalValue: normalized.data.externalValue,
			normalizedValue: normalized.data.normalizedValue,
			caseSensitivity: normalized.data.caseSensitivity,
			isPrimary: parsed.data.isPrimary,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findItemByExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		findItemByExternalIdInputSchema,
		input,
		"Invalid item external-ID lookup input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const normalized = normalizeExternalId({
		sourceSystem: parsed.data.sourceSystem,
		externalIdType: parsed.data.externalIdType,
		externalValue: parsed.data.externalValue,
		caseSensitivity: parsed.data.caseSensitivity,
	});
	if (!normalized.ok) return normalized;
	const { store, authorization } = resolveItemExtensionDeps(options, [
		"findItemByExternalId",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_FIND_BY_EXTERNAL_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findItemByExternalId({
		organizationId: parsed.data.organizationId,
		sourceSystem: normalized.data.sourceSystem,
		externalIdType: normalized.data.externalIdType,
		normalizedValue: normalized.data.normalizedValue,
		caseSensitivity: normalized.data.caseSensitivity,
	});
}
