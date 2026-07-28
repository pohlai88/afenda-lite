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
	MASTER_COMMAND_ITEM_GROUP_ACTIVATE,
	MASTER_COMMAND_ITEM_GROUP_CREATE,
	MASTER_COMMAND_ITEM_GROUP_INACTIVE,
	MASTER_COMMAND_ITEM_GROUP_RETIRE,
	MASTER_COMMAND_ITEM_GROUP_UPDATE,
	MASTER_QUERY_ITEM_GROUP_GET_BY_CODE,
	MASTER_QUERY_ITEM_GROUP_GET_BY_ID,
	MASTER_QUERY_ITEM_GROUP_LIST,
	type MasterCommandId,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { ItemGroup } from "../../types";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "../integration-projections/search-projector-commands";
import { assertNoLifecycleControlledFieldMutation } from "../lifecycle-governance";
import type { ItemGroupLifecycleEventSuffix } from "./core-master-events";
import { assertLifecycleTransition } from "./lifecycle";
import { normalizeMasterCode } from "./normalized-code";
import {
	createItemGroupInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	itemGroupLifecycleInputSchema,
	listByStatusInputSchema,
	listUpdatedSinceInputSchema,
	masterListOptionsSchema,
	updateItemGroupInputSchema,
} from "./schemas";

export type ItemGroupPath = {
	groupId: string;
	path: ItemGroup[];
	codePath: string[];
	normalizedPath: string;
};

async function afterItemGroupMutation(
	result: Result<ItemGroup>,
	options: MasterCommandOptions,
): Promise<Result<ItemGroup>> {
	if (!result.ok) {
		return result;
	}
	try {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.itemGroup,
			result.data,
			options.searchStore,
		);
	} catch {
		// Search is derived; committed mutation events and rebuilds provide recovery.
	}
	return result;
}

export async function createItemGroup(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemGroup>> {
	const parsed = parseMasterInput(
		createItemGroupInputSchema,
		input,
		"Invalid item group create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_GROUP_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const result = await store.createItemGroup(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			createdBy: parsed.data.actorUserId,
			parentId: parsed.data.parentId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			importMutation: options.importMutation,
		},
	);
	return afterItemGroupMutation(result, options);
}

export async function updateItemGroup(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemGroup>> {
	const lifecycleFields = assertNoLifecycleControlledFieldMutation(input, {
		entityType: "item_group",
	});
	if (!lifecycleFields.ok) {
		return lifecycleFields;
	}
	// Item-group codes are immutable; code changes require a governed operation.
	const parsed = parseMasterInput(
		updateItemGroupInputSchema,
		input,
		"Invalid item group update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_ITEM_GROUP_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.updateItemGroup(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			name: parsed.data.name,
			parentId: parsed.data.parentId,
		},
		ports,
		{
			correlationId: parsed.data.correlationId,
			importMutation: options.importMutation,
		},
	);
	return afterItemGroupMutation(result, options);
}

async function transitionItemGroupStatus(
	input: unknown,
	toStatus: "active" | "inactive" | "retired",
	eventSuffix: ItemGroupLifecycleEventSuffix,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<ItemGroup>> {
	const parsed = parseMasterInput(
		itemGroupLifecycleInputSchema,
		input,
		"Invalid item group lifecycle input",
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
	const current = await store.getItemGroupById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Item group not found", {
			reason: "MASTER_NOT_FOUND",
		} satisfies MasterFailureDetails);
	}
	const lifecycle = assertLifecycleTransition(current.data.status, toStatus);
	if (!lifecycle.ok) {
		return lifecycle;
	}
	if (toStatus === "retired") {
		const blockers = await dependencyInspector.listBlockers({
			organizationId: parsed.data.organizationId,
			entityType: "item_group",
			entityId: parsed.data.id,
		});
		if (blockers.length > 0) {
			return fail("CONFLICT", "Item group has dependency blockers", {
				reason: "MASTER_DEPENDENCY_BLOCKED",
				blockers,
			} satisfies MasterFailureDetails);
		}
	}
	const result = await store.transitionItemGroup(
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
	return afterItemGroupMutation(result, options);
}

export async function activateItemGroup(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemGroup>> {
	return transitionItemGroupStatus(
		input,
		"active",
		"activated",
		MASTER_COMMAND_ITEM_GROUP_ACTIVATE,
		options,
	);
}

export async function inactiveItemGroup(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemGroup>> {
	return transitionItemGroupStatus(
		input,
		"inactive",
		"inactive",
		MASTER_COMMAND_ITEM_GROUP_INACTIVE,
		options,
	);
}

export async function retireItemGroup(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<ItemGroup>> {
	return transitionItemGroupStatus(
		input,
		"retired",
		"retired",
		MASTER_COMMAND_ITEM_GROUP_RETIRE,
		options,
	);
}

export async function resolveItemGroupPath(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemGroupPath | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid item group path input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_GROUP_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const visited = new Set<string>();
	const path: ItemGroup[] = [];
	let currentId: string | null = parsed.data.id;
	while (currentId !== null) {
		if (visited.has(currentId)) {
			return fail("CONFLICT", "Item group hierarchy contains a cycle", {
				reason: "MASTER_INVALID_STATE",
			} satisfies MasterFailureDetails);
		}
		visited.add(currentId);
		const current = await store.getItemGroupById(
			parsed.data.organizationId,
			currentId,
		);
		if (!current.ok) {
			return current;
		}
		if (current.data === null) {
			return path.length === 0
				? ok(null)
				: fail("CONFLICT", "Item group parent is missing", {
						reason: "MASTER_CROSS_ORG_REFERENCE",
					} satisfies MasterFailureDetails);
		}
		path.unshift(current.data);
		currentId = current.data.parentId;
	}

	return {
		ok: true,
		data: {
			groupId: parsed.data.id,
			path,
			codePath: path.map((group) => group.code),
			normalizedPath: path.map((group) => group.normalizedCode).join("/"),
		},
	};
}

export async function getItemGroupById(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemGroup | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid item group get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_GROUP_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getItemGroupById(parsed.data.organizationId, parsed.data.id);
}

export async function getItemGroupByCode(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemGroup | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid item group get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_GROUP_GET_BY_CODE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	return store.getItemGroupByCode(
		parsed.data.organizationId,
		codeResult.data.normalizedCode,
	);
}

export async function existsItemGroupByCode(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<boolean>> {
	const result = await getItemGroupByCode(input, options);
	if (!result.ok) return result;
	return ok(result.data !== null);
}

export async function listItemGroups(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemGroup[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid item group list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const store = resolveStore(options.store);
	const { authorization } = options;
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_ITEM_GROUP_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listItemGroups({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		updatedSince: parsed.data.updatedSince,
	});
}

export async function listActiveItemGroups(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemGroup[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid active item group list input",
	);
	if (!parsed.ok) return parsed;
	return listItemGroups({ ...parsed.data, status: "active" }, options);
}

export async function listItemGroupsByStatus(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemGroup[]>> {
	const parsed = parseMasterInput(
		listByStatusInputSchema,
		input,
		"Invalid item group list-by-status input",
	);
	if (!parsed.ok) return parsed;
	return listItemGroups(parsed.data, options);
}

export async function listItemGroupsUpdatedSince(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<ItemGroup[]>> {
	const parsed = parseMasterInput(
		listUpdatedSinceInputSchema,
		input,
		"Invalid item group updated-since list input",
	);
	if (!parsed.ok) return parsed;
	return listItemGroups(parsed.data, options);
}
