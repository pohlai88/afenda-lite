/** Warehouse external-ID commands and queries. */
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
	MASTER_COMMAND_WAREHOUSE_EXTERNAL_ID_CREATE,
	MASTER_QUERY_WAREHOUSE_FIND_BY_EXTERNAL_ID,
} from "../../module-ids";
import { parseMasterInput } from "../../parse-input";
import type { Warehouse, WarehouseExternalId } from "../../types";
import { resolveWarehouseExtensionDeps } from "./extension-deps";
import { requireWarehouseExtensionParent } from "./extension-policies";
import {
	createWarehouseExternalIdInputSchema,
	findWarehouseByExternalIdInputSchema,
} from "./extension-schemas";
import { normalizeExternalId } from "./external-id-normalization";

export async function createWarehouseExternalId(
	input: unknown,
	options: MasterCommandOptions = {},
): Promise<Result<WarehouseExternalId>> {
	const parsed = parseMasterInput(
		createWarehouseExternalIdInputSchema,
		input,
		"Invalid warehouse external-ID create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const identity = normalizeExternalId(parsed.data);
	if (!identity.ok) {
		return identity;
	}
	const { store, roots, ports, authorization } = resolveWarehouseExtensionDeps(
		options,
		["createWarehouseExternalId"],
	);
	const authorized = await requireMasterCommandPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		command: MASTER_COMMAND_WAREHOUSE_EXTERNAL_ID_CREATE,
	});
	if (!authorized.ok) {
		return authorized;
	}
	const parent = await requireWarehouseExtensionParent(
		roots,
		parsed.data.organizationId,
		parsed.data.warehouseId,
	);
	if (!parent.ok) {
		return parent;
	}
	return store.createWarehouseExternalId(
		{
			organizationId: parsed.data.organizationId,
			warehouseId: parsed.data.warehouseId,
			...identity.data,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function findWarehouseByExternalId(
	input: unknown,
	options: MasterQueryOptions = {},
): Promise<Result<Warehouse | null>> {
	const parsed = parseMasterInput(
		findWarehouseByExternalIdInputSchema,
		input,
		"Invalid warehouse external-ID lookup input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const identity = normalizeExternalId(parsed.data);
	if (!identity.ok) {
		return identity;
	}
	const { store, authorization } = resolveWarehouseExtensionDeps(options, [
		"findWarehouseByExternalId",
	]);
	const authorized = await requireMasterQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: MASTER_QUERY_WAREHOUSE_FIND_BY_EXTERNAL_ID,
	});
	if (!authorized.ok) {
		return authorized;
	}
	return store.findWarehouseByExternalId(
		parsed.data.organizationId,
		identity.data.sourceSystem,
		identity.data.externalIdType,
		identity.data.normalizedValue,
	);
}
