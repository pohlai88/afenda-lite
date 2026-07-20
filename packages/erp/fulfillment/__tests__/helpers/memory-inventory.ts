import { randomUUID } from "node:crypto";
import { ok } from "@afenda/errors/result";
import {
	addStockMovementLine,
	createStockMovement,
	INVENTORY_PERMISSION_CODES,
	type InventoryAuthorizationPort,
	type InventoryCommandOptions,
	type InventoryPermission,
	postStockMovement,
	reserveStock,
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

export async function seedInventoryOnHand(
	inventory: InventoryCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		code: string;
		warehouseId: string;
		itemId: string;
		quantity: number | string;
	},
): Promise<void> {
	const created = await createStockMovement(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			idempotencyKey: `${input.code}:create`,
			code: input.code,
			movementType: "receipt",
			source: "opening_balance",
			warehouseId: input.warehouseId,
		},
		inventory,
	);
	if (!created.ok) {
		throw new Error(created.message);
	}

	const line = await addStockMovementLine(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationId}:line`,
			idempotencyKey: `${input.code}:line`,
			movementId: created.data.id,
			itemId: input.itemId,
			quantity: input.quantity,
			expectedVersion: created.data.version,
		},
		inventory,
	);
	if (!line.ok) {
		throw new Error(line.message);
	}

	const posted = await postStockMovement(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationId}:post`,
			idempotencyKey: `${input.code}:post`,
			movementId: created.data.id,
			expectedVersion: created.data.version + 1,
		},
		inventory,
	);
	if (!posted.ok) {
		throw new Error(posted.message);
	}
}

export async function seedReservation(
	inventory: InventoryCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		code: string;
		warehouseId: string;
		itemId: string;
		quantity: number | string;
	},
): Promise<string> {
	const reserved = await reserveStock(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			idempotencyKey: `${input.code}:reserve`,
			code: input.code,
			warehouseId: input.warehouseId,
			itemId: input.itemId,
			quantity: input.quantity,
		},
		inventory,
	);
	if (!reserved.ok) {
		throw new Error(reserved.message);
	}
	return reserved.data.id;
}
