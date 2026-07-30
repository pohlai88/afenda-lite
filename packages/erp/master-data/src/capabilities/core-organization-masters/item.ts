import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireMasterCommandPermission,
	requireMasterQueryPermission,
} from "../../authorization";
import {
	type MasterCommandOptions,
	type MasterQueryOptions,
	resolveCommandDeps,
	resolveStore,
} from "../../command-options";
import type { MasterFailureDetails } from "../../contracts/reasons";
import {
	MASTER_COMMAND_ITEM_ACTIVATE,
	MASTER_COMMAND_ITEM_CREATE,
	MASTER_COMMAND_ITEM_INACTIVE,
	MASTER_COMMAND_ITEM_RESTORE,
	MASTER_COMMAND_ITEM_RETIRE,
	MASTER_COMMAND_ITEM_UPDATE,
	MASTER_QUERY_ITEM_GET_BY_CODE,
	MASTER_QUERY_ITEM_GET_BY_ID,
	MASTER_QUERY_ITEM_LIST,
	type MasterCommandId,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import { resolveAsync } from "../../resolve-async";
import type { Item } from "../../types";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "../integration-projections/search-projector-commands";
import { assertNoLifecycleControlledFieldMutation } from "../lifecycle-governance";
import type { ItemLifecycleEventSuffix } from "./core-master-events";
import {
	assertLifecycleTransition,
	assertRestoreTransition,
} from "./lifecycle";
import { normalizeMasterCode } from "./normalized-code";
import {
	createItemInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	itemLifecycleInputSchema,
	listByStatusInputSchema,
	listItemsByGroupInputSchema,
	listUpdatedSinceInputSchema,
	masterListOptionsSchema,
	updateItemInputSchema,
} from "./schemas";

async function afterItemMutation(
	result: Result<Item>,
	options: MasterCommandOptions,
): Promise<Result<Item>> {
	if (!result.ok) {
		return result;
	}
	try {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.item,
			result.data,
			options.searchStore,
		);
	} catch {
		// Search is derived; committed mutation events and rebuilds provide recovery.
	}
	return result;
}

async function assertItemActivationReferences(
	store: ReturnType<typeof resolveStore>,
	item: Item,
): Promise<Result<true>> {
	const group = await store.getItemGroupById(
		item.organizationId,
		item.itemGroupId,
	);
	if (!group.ok) {
		return group;
	}
	if (group.data === null) {
		return fail("CONFLICT", "Item group must exist in the same organization", {
			reason: "MASTER_CROSS_ORG_REFERENCE",
		} satisfies MasterFailureDetails);
	}
	if (group.data.status !== "active") {
		return fail(
			"CONFLICT",
			"Item group must be active before activating item",
			{
				reason: "MASTER_INVALID_STATE",
				from: item.status,
				to: "active",
			} satisfies MasterFailureDetails,
		);
	}
	const baseUom = await store.getRefUomById(item.baseUomId);
	if (!baseUom.ok) {
		return baseUom;
	}
	if (baseUom.data === null || !baseUom.data.active) {
		return fail(
			"CONFLICT",
			"Item base UoM must be an active platform UoM before activating item",
			{
				reason: "MASTER_INVALID_STATE",
				from: item.status,
				to: "active",
			} satisfies MasterFailureDetails,
		);
	}
	return ok(true);
}

export async function createItem(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item>> {
	const parsed = parseMasterInput(
		createItemInputSchema,
		input,
		"Invalid item create input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const result = await store.createItem(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			description: parsed.data.description ?? null,
			itemType: parsed.data.itemType,
			baseUomId: parsed.data.baseUomId,
			itemGroupId: parsed.data.itemGroupId,
			trackingPolicy: parsed.data.trackingPolicy,
			sellable: parsed.data.sellable,
			purchasable: parsed.data.purchasable,
			stocked: parsed.data.stocked,
			serviceIndicator: parsed.data.serviceIndicator,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			importMutation: options.importMutation,
		},
	);
	return afterItemMutation(result, options);
}

export async function updateItem(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item>> {
	const lifecycleFields = assertNoLifecycleControlledFieldMutation(input, {
		entityType: "item",
	});
	if (!lifecycleFields.ok) {
		return lifecycleFields;
	}
	// Item codes and base UoMs require governed operations; ordinary updates cannot redefine them.
	const parsed = parseMasterInput(
		updateItemInputSchema,
		input,
		"Invalid item update input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.updateItem(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			name: parsed.data.name,
			description: parsed.data.description,
			itemType: parsed.data.itemType,
			baseUomId: parsed.data.baseUomId,
			itemGroupId: parsed.data.itemGroupId,
			trackingPolicy: parsed.data.trackingPolicy,
			sellable: parsed.data.sellable,
			purchasable: parsed.data.purchasable,
			stocked: parsed.data.stocked,
			serviceIndicator: parsed.data.serviceIndicator,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			importMutation: options.importMutation,
		},
	);
	return afterItemMutation(result, options);
}

async function transitionItemStatus(
	input: unknown,
	toStatus: "draft" | "active" | "inactive" | "retired",
	eventSuffix: ItemLifecycleEventSuffix,
	command: MasterCommandId,
	options: MasterCommandOptions,
	transitionKind: "lifecycle" | "restore" = "lifecycle",
): Promise<Result<Item>> {
	const parsed = parseMasterInput(
		itemLifecycleInputSchema,
		input,
		"Invalid item lifecycle input",
	);
	if (!parsed.ok) {
		return Promise.resolve(parsed);
	}
	const { store, ports, dependencyInspector, authorization } =
		resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const current = await store.getItemById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Item not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	const lifecycle =
		transitionKind === "restore"
			? assertRestoreTransition(current.data.status, "draft")
			: assertLifecycleTransition(current.data.status, toStatus);
	if (!lifecycle.ok) {
		return lifecycle;
	}
	if (toStatus === "active") {
		const activatable = await assertItemActivationReferences(
			store,
			current.data,
		);
		if (!activatable.ok) {
			return activatable;
		}
	}
	if (toStatus === "retired") {
		const blockers = await dependencyInspector.listBlockers({
			organizationId: parsed.data.organizationId,
			entityType: "item",
			entityId: parsed.data.id,
		});
		if (blockers.length > 0) {
			return fail("CONFLICT", "Item has dependency blockers", {
				reason: "MASTER_DEPENDENCY_BLOCKED",
				blockers,
			} satisfies MasterFailureDetails);
		}
	}
	const result = await store.transitionItem(
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
	return afterItemMutation(result, options);
}

export function activateItem(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item>> {
	return transitionItemStatus(
		input,
		"active",
		"activated",
		MASTER_COMMAND_ITEM_ACTIVATE,
		options,
	);
}

export function inactiveItem(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item>> {
	return transitionItemStatus(
		input,
		"inactive",
		"inactive",
		MASTER_COMMAND_ITEM_INACTIVE,
		options,
	);
}

export const suspendItem = inactiveItem;

export function retireItem(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item>> {
	return transitionItemStatus(
		input,
		"retired",
		"retired",
		MASTER_COMMAND_ITEM_RETIRE,
		options,
	);
}

export const archiveItem = retireItem;

export function restoreItem(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item>> {
	return transitionItemStatus(
		input,
		"draft",
		"restored",
		MASTER_COMMAND_ITEM_RESTORE,
		options,
		"restore",
	);
}

export async function getItemById(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid item get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getItemById(parsed.data.organizationId, parsed.data.id);
}

export async function getItemByCode(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid item get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_GET_BY_CODE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	return store.getItemByCode(
		parsed.data.organizationId,
		codeResult.data.normalizedCode,
	);
}

export async function existsItemByCode(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<boolean>> {
	const result = await getItemByCode(input, options);
	if (!result.ok) {
		return result;
	}
	return ok(result.data !== null);
}

export async function listItems(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid item list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItems({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		updatedSince: parsed.data.updatedSince,
	});
}

export function listActiveItems(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			masterListOptionsSchema,
			input,
			"Invalid active item list input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listItems({ ...parsed.data, status: "active" }, options);
	});
}

export function listItemsByStatus(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			listByStatusInputSchema,
			input,
			"Invalid item list-by-status input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listItems(parsed.data, options);
	});
}

export function listItemsUpdatedSince(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item[]>> {
	return resolveAsync(() => {
		const parsed = parseMasterInput(
			listUpdatedSinceInputSchema,
			input,
			"Invalid item updated-since list input",
		);
		if (!parsed.ok) {
			return parsed;
		}
		return listItems(parsed.data, options);
	});
}

export async function listItemsByGroup(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Item[]>> {
	const parsed = parseMasterInput(
		listItemsByGroupInputSchema,
		input,
		"Invalid item list-by-group input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItems({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		updatedSince: parsed.data.updatedSince,
		itemGroupId: parsed.data.itemGroupId,
	});
}
