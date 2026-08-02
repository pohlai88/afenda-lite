import { errorResult, type Result } from "@afenda/errors";
import { inventoryModuleManifest } from "./module.manifest";
import type {
	InventoryCommandId,
	InventoryQueryId,
} from "./operation-registry";
import type { InventoryPermission } from "./permissions";

export type { InventoryPermission } from "./permissions";

export interface InventoryAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: InventoryPermission;
	}) => Promise<boolean>;
}

export function requireInventoryCommandPermission(
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

export function requireInventoryQueryPermission(
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
		return errorResult.fail("UNAUTHORIZED");
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}
