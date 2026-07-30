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
import { resolveAsync } from "../../src/resolve-async";

function createGrantingInventoryAuthorization(
	grants: readonly InventoryPermission[],
): InventoryAuthorizationPort {
	const allowed = new Set(grants);
	return {
		can(input) {
			return resolveAsync(() => allowed.has(input.permission));
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
			record() {
				return resolveAsync(() => ok({ id: randomUUID() }));
			},
		},
		outbox: {
			append() {
				return resolveAsync(() => ok({ id: randomUUID() }));
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
