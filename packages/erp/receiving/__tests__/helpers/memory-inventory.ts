import { randomUUID } from "node:crypto";
import { ok } from "@afenda/errors/result";
import {
	INVENTORY_PERMISSION_CODES,
	type InventoryAuthorizationPort,
	type InventoryCommandOptions,
	type InventoryPermission,
} from "@afenda/inventory";
import {
	createMemoryInventoryStore,
	type MasterLookupPort,
	type MutationPorts,
} from "@afenda/inventory/testing";

function createGrantingInventoryAuthorization(
	grants: readonly InventoryPermission[],
): InventoryAuthorizationPort {
	const allowed = new Set(grants);
	return {
		async can(input) {
			return allowed.has(input.permission);
		},
	};
}

export function createAllowAllInventoryAuthorization(): InventoryAuthorizationPort {
	return createGrantingInventoryAuthorization(INVENTORY_PERMISSION_CODES);
}

export function createInventoryCommandTestOptions(
	masters: MasterLookupPort,
): InventoryCommandOptions {
	const ports: MutationPorts = {
		audit: {
			async record() {
				return ok({ id: randomUUID() });
			},
		},
		outbox: {
			async append() {
				return ok({ id: randomUUID() });
			},
		},
	};
	return {
		store: createMemoryInventoryStore(),
		ports,
		masters,
		authorization: createAllowAllInventoryAuthorization(),
	};
}
