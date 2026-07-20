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
	MASTER_COMMAND_WAREHOUSE_ACTIVATE,
	MASTER_COMMAND_WAREHOUSE_CREATE,
	MASTER_COMMAND_WAREHOUSE_INACTIVE,
	MASTER_COMMAND_WAREHOUSE_MOVE,
	MASTER_COMMAND_WAREHOUSE_RETIRE,
	MASTER_COMMAND_WAREHOUSE_UPDATE,
	MASTER_QUERY_WAREHOUSE_GET_BY_CODE,
	MASTER_QUERY_WAREHOUSE_GET_BY_ID,
	MASTER_QUERY_WAREHOUSE_LIST,
	type MasterCommandId,
} from "./module-ids";
import { parseMasterInput } from "./parse-input";
import {
	createWarehouseInputSchema,
	getByCodeInputSchema,
	getByIdInputSchema,
	masterListOptionsSchema,
	moveWarehouseInputSchema,
	updateWarehouseInputSchema,
	warehouseLifecycleInputSchema,
} from "./schemas";
import {
	MASTER_SEARCH_ENTITY,
	syncMasterRootProjection,
} from "./search-projectors";
import { normalizeMasterCode } from "./shared/code";
import { assertLifecycleTransition } from "./shared/lifecycle";
import type { Warehouse } from "./types";

async function afterWarehouseMutation(
	result: Result<Warehouse>,
	options: MasterCommandOptions,
): Promise<Result<Warehouse>> {
	if (result.ok) {
		await syncMasterRootProjection(
			MASTER_SEARCH_ENTITY.warehouse,
			result.data,
			options.searchStore,
		);
	}
	return result;
}

export async function createWarehouse(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse>> {
	const parsed = parseMasterInput(
		createWarehouseInputSchema,
		input,
		"Invalid warehouse create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_WAREHOUSE_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	const result = await store.createWarehouse(
		{
			organizationId: parsed.data.organizationId,
			code: codeResult.data.code,
			normalizedCode: codeResult.data.normalizedCode,
			name: parsed.data.name,
			locationType: parsed.data.locationType,
			createdBy: parsed.data.actorUserId,
			parentId: parsed.data.parentId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterWarehouseMutation(result, options);
}

export async function updateWarehouse(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse>> {
	const parsed = parseMasterInput(
		updateWarehouseInputSchema,
		input,
		"Invalid warehouse update input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_WAREHOUSE_UPDATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.updateWarehouse(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			name: parsed.data.name,
			locationType: parsed.data.locationType,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterWarehouseMutation(result, options);
}

export async function moveWarehouse(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse>> {
	const parsed = parseMasterInput(
		moveWarehouseInputSchema,
		input,
		"Invalid warehouse move input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_WAREHOUSE_MOVE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const result = await store.moveWarehouse(
		{
			organizationId: parsed.data.organizationId,
			id: parsed.data.id,
			expectedVersion: parsed.data.expectedVersion,
			updatedBy: parsed.data.actorUserId,
			parentId: parsed.data.parentId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
	return afterWarehouseMutation(result, options);
}

async function transitionWarehouseStatus(
	input: unknown,
	toStatus: Warehouse["status"],
	eventSuffix: string,
	command: MasterCommandId,
	options: MasterCommandOptions,
): Promise<Result<Warehouse>> {
	const parsed = parseMasterInput(
		warehouseLifecycleInputSchema,
		input,
		"Invalid warehouse lifecycle input",
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
	const current = await store.getWarehouseById(
		parsed.data.organizationId,
		parsed.data.id,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return fail("NOT_FOUND", "Warehouse not found", {
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
			entityType: "warehouse",
			entityId: parsed.data.id,
		});
		if (blockers.length > 0) {
			return fail("CONFLICT", "Warehouse has dependency blockers", {
				reason: "MASTER_DEPENDENCY_BLOCKED",
				blockers,
			} satisfies MasterFailureDetails);
		}
	}
	const result = await store.transitionWarehouse(
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
	return afterWarehouseMutation(result, options);
}

export async function activateWarehouse(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse>> {
	return transitionWarehouseStatus(
		input,
		"active",
		"activated",
		MASTER_COMMAND_WAREHOUSE_ACTIVATE,
		options,
	);
}

export async function inactiveWarehouse(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse>> {
	return transitionWarehouseStatus(
		input,
		"inactive",
		"inactive",
		MASTER_COMMAND_WAREHOUSE_INACTIVE,
		options,
	);
}

export async function retireWarehouse(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse>> {
	return transitionWarehouseStatus(
		input,
		"retired",
		"retired",
		MASTER_COMMAND_WAREHOUSE_RETIRE,
		options,
	);
}

export async function getWarehouseById(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse | null>> {
	const parsed = parseMasterInput(
		getByIdInputSchema,
		input,
		"Invalid warehouse get-by-id input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_WAREHOUSE_GET_BY_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.getWarehouseById(parsed.data.organizationId, parsed.data.id);
}

export async function getWarehouseByCode(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse | null>> {
	const parsed = parseMasterInput(
		getByCodeInputSchema,
		input,
		"Invalid warehouse get-by-code input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_WAREHOUSE_GET_BY_CODE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const codeResult = normalizeMasterCode(parsed.data.code);
	if (!codeResult.ok) {
		return codeResult;
	}
	return store.getWarehouseByCode(
		parsed.data.organizationId,
		codeResult.data.normalizedCode,
	);
}

export async function listWarehouses(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<Warehouse[]>> {
	const parsed = parseMasterInput(
		masterListOptionsSchema,
		input,
		"Invalid warehouse list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_WAREHOUSE_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.listWarehouses({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
	});
}
