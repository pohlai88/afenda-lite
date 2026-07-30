/** Item-alias commands and queries. */
import type { Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import type {
	MasterCommandOptions,
	MasterQueryOptions,
} from "../../command-options";
import {
	MASTER_COMMAND_ITEM_ALIAS_CREATE,
	MASTER_QUERY_ITEM_ALIAS_LIST,
	MASTER_QUERY_ITEM_FIND_BY_ALIAS,
	MASTER_QUERY_ITEM_LIST_BY_ALIAS,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { Item, ItemAlias } from "../../types";
import { resolveItemExtensionDeps } from "./extension-deps";
import { requireItemExtensionParent } from "./extension-policies";
import {
	createItemAliasInputSchema,
	findItemByAliasInputSchema,
	listItemAliasesInputSchema,
	listItemsByAliasInputSchema,
} from "./extension-schemas";
import {
	normalizeItemAlias,
	normalizeItemAliasSource,
} from "./item-alias-policy";
import type { ExtensionListPage } from "./store";

export async function createItemAlias(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemAlias>> {
	const parsed = parseMasterInput(
		createItemAliasInputSchema,
		input,
		"Invalid item alias create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const aliasResult = normalizeItemAlias(parsed.data.aliasValue);
	if (!aliasResult.ok) {
		return aliasResult;
	}
	const source = normalizeItemAliasSource(parsed.data.source);
	if (!source.ok) {
		return source;
	}
	const { store, roots, ports, authorization } = resolveItemExtensionDeps(
		options,
		["createItemAlias"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_ALIAS_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const parent = await requireItemExtensionParent(
		roots,
		parsed.data.organizationId,
		parsed.data.itemId,
	);
	if (!parent.ok) {
		return parent;
	}
	return store.createItemAlias(
		{
			organizationId: parsed.data.organizationId,
			itemId: parsed.data.itemId,
			aliasType: parsed.data.aliasType,
			aliasValue: aliasResult.data.aliasValue,
			normalizedValue: aliasResult.data.normalizedValue,
			languageId: parsed.data.languageId ?? null,
			source: source.data,
			isSearchable: parsed.data.isSearchable,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function listItemAliases(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ExtensionListPage<ItemAlias>>> {
	const parsed = parseMasterInput(
		listItemAliasesInputSchema,
		input,
		"Invalid item alias list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveItemExtensionDeps(options, [
		"listItemAliases",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_ALIAS_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemAliases({
		organizationId: parsed.data.organizationId,
		itemId: parsed.data.itemId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}

export async function findItemByAlias(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		findItemByAliasInputSchema,
		input,
		"Invalid find-by-alias input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const aliasResult = normalizeItemAlias(parsed.data.aliasValue);
	if (!aliasResult.ok) {
		return aliasResult;
	}
	const { store, authorization } = resolveItemExtensionDeps(options, [
		"findItemByAlias",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_FIND_BY_ALIAS,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findItemByAlias({
		organizationId: parsed.data.organizationId,
		normalizedValue: aliasResult.data.normalizedValue,
		aliasType: parsed.data.aliasType,
		languageId: parsed.data.languageId,
	});
}

export async function listItemsByAlias(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ExtensionListPage<Item>>> {
	const parsed = parseMasterInput(
		listItemsByAliasInputSchema,
		input,
		"Invalid item alias search input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const aliasResult = normalizeItemAlias(parsed.data.aliasValue);
	if (!aliasResult.ok) {
		return aliasResult;
	}

	const { store, authorization } = resolveItemExtensionDeps(options, [
		"listItemsByAlias",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_LIST_BY_ALIAS,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemsByAlias({
		organizationId: parsed.data.organizationId,
		normalizedValue: aliasResult.data.normalizedValue,
		aliasType: parsed.data.aliasType,
		languageId: parsed.data.languageId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
}
