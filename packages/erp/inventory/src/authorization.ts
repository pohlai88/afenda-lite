import { fail, ok, type Result } from "@afenda/errors/result";
import { inventoryModuleManifest } from "./module.manifest";
import type { InventoryCommandId, InventoryQueryId } from "./module-ids";
import type { INVENTORY_PERMISSION_CODES } from "./permissions";

export type InventoryPermission = (typeof INVENTORY_PERMISSION_CODES)[number];

export type InventoryAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: InventoryPermission;
	}): Promise<boolean>;
};

export async function requireInventoryCommandPermission(
	authorization: InventoryAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: InventoryCommandId;
	},
): Promise<Result<void>> {
	const permission =
		inventoryModuleManifest.authorization.commands[input.command];
	return requireInventoryPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function requireInventoryQueryPermission(
	authorization: InventoryAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: InventoryQueryId;
	},
): Promise<Result<void>> {
	const permission = inventoryModuleManifest.authorization.queries[input.query];
	return requireInventoryPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

async function requireInventoryPermission(
	authorization: InventoryAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: InventoryPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail("UNAUTHORIZED", "Inventory authorization port is required", {
			permission: input.permission,
		});
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return fail("FORBIDDEN", "Missing required inventory permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}
