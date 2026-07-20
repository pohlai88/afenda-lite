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
	MASTER_COMMAND_ITEM_ACTIVATE,
	MASTER_COMMAND_ITEM_CREATE,
	MASTER_COMMAND_ITEM_INACTIVE,
	MASTER_COMMAND_ITEM_RETIRE,
	MASTER_COMMAND_ITEM_UPDATE,
	MASTER_QUERY_ITEM_GET_BY_CODE,
	MASTER_QUERY_ITEM_GET_BY_ID,
	MASTER_QUERY_ITEM_LIST,
	type MasterCommandId,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import {
	createItemInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	itemLifecycleInputSchema,
	masterListOptionsSchema,
	updateItemInputSchema,
} from "./schemas";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "./search-projectors";
import { normalizeMasterCode } from "./shared/code";
import { assertLifecycleTransition } from "./shared/lifecycle";
import type { Item } from "./types";

async function afterItemMutation(
	result: Result<Item>,
	options: MasterCommandOptions,
): Promise<Result<Item>> {
	if (result.ok) {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.item,
			result.data,
			options.searchStore,
		);
	}
	return result;
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
		return parsed;
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
			itemType: parsed.data.itemType,
			baseUomId: parsed.data.baseUomId,
			itemGroupId: parsed.data.itemGroupId,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterItemMutation(result, options);
}

export async function updateItem(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item>> {
	const parsed = parseMasterInput(
		updateItemInputSchema,
		input,
		"Invalid item update input",
	);
	if (!parsed.ok) {
		return parsed;
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
			itemType: parsed.data.itemType,
			baseUomId: parsed.data.baseUomId,
			itemGroupId: parsed.data.itemGroupId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterItemMutation(result, options);
}

async function transitionItemStatus(
	input: unknown,
	toStatus: Item["status"],
	eventSuffix: string,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<Item>> {
	const parsed = parseMasterInput(
		itemLifecycleInputSchema,
		input,
		"Invalid item lifecycle input",
	);
	if (!parsed.ok) {
		return parsed;
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
	const lifecycle = assertLifecycleTransition(current.data.status, toStatus);
	if (!lifecycle.ok) {
		return lifecycle;
	}
	if (toStatus === "active") {
		const group = await store.getItemGroupById(
			parsed.data.organizationId,
			current.data.itemGroupId,
		);
		if (!group.ok) {
			return group;
		}
		if (group.data === null) {
			return fail(
				"CONFLICT",
				"Item group must exist in the same organization",
				{
					reason: "MASTER_CROSS_ORG_REFERENCE",
				} satisfies MasterFailureDetails,
			);
		}
		if (group.data.status !== "active") {
			return fail(
				"CONFLICT",
				"Item group must be active before activating item",
				{
					reason: "MASTER_INVALID_STATE",
					from: current.data.status,
					to: toStatus,
				} satisfies MasterFailureDetails,
			);
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

export async function activateItem(
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

export async function inactiveItem(
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

export async function retireItem(
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

export async function getItemById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid item get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
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
	options: MasterCommandOptions = {},
): Promise<Result<Item | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid item get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
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

export async function listItems(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Item[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid item list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
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
	});
}
