import {
	INVENTORY_MOVEMENT_CANCELLED_EVENT,
	INVENTORY_MOVEMENT_CREATED_EVENT,
	INVENTORY_MOVEMENT_POSTED_EVENT,
	INVENTORY_RESERVATION_CANCELLED_EVENT,
	INVENTORY_RESERVATION_EXPIRED_EVENT,
	INVENTORY_RESERVATION_RELEASED_EVENT,
	INVENTORY_STOCK_RESERVED_EVENT,
	type InventoryEventType,
} from "@afenda/events/schemas";

import {
	INVENTORY_PERMISSION_ADJUSTMENT_POST,
	INVENTORY_PERMISSION_AVAILABILITY_READ,
	INVENTORY_PERMISSION_MOVEMENT_CANCEL,
	INVENTORY_PERMISSION_MOVEMENT_CREATE,
	INVENTORY_PERMISSION_MOVEMENT_POST,
	INVENTORY_PERMISSION_MOVEMENT_READ,
	INVENTORY_PERMISSION_RESERVATION_CREATE,
	INVENTORY_PERMISSION_RESERVATION_RELEASE,
	type InventoryPermission,
} from "./permissions";

const INVENTORY_OPERATION_OWNER = "inventory" as const;

interface InventoryOperationDefinition {
	readonly additionalPermissions: readonly InventoryPermission[];
	readonly emits: readonly InventoryEventType[];
	readonly id: `inventory.${string}`;
	readonly idempotency: "required" | "none";
	readonly kind: "command" | "query";
	readonly owner: typeof INVENTORY_OPERATION_OWNER;
	readonly permission: InventoryPermission;
	readonly transaction: "atomic" | "resumable" | "none";
}

/**
 * Canonical Inventory operation policy. Command/query, authorization and
 * emission projections derive from this definition and are not maintained
 * independently by the module manifest or stores.
 */
export const INVENTORY_OPERATION_DEFINITIONS = {
	createMovement: {
		id: "inventory.movement.create",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_CREATE,
		additionalPermissions: [INVENTORY_PERMISSION_ADJUSTMENT_POST],
		transaction: "atomic",
		idempotency: "required",
		emits: [INVENTORY_MOVEMENT_CREATED_EVENT],
	},
	addMovementLine: {
		id: "inventory.movement.line.add",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_CREATE,
		additionalPermissions: [],
		transaction: "atomic",
		idempotency: "required",
		emits: [],
	},
	postMovement: {
		id: "inventory.movement.post",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_POST,
		additionalPermissions: [],
		transaction: "atomic",
		idempotency: "required",
		emits: [INVENTORY_MOVEMENT_POSTED_EVENT],
	},
	cancelMovement: {
		id: "inventory.movement.cancel",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_CANCEL,
		additionalPermissions: [],
		transaction: "atomic",
		idempotency: "required",
		emits: [INVENTORY_MOVEMENT_CANCELLED_EVENT],
	},
	reverseMovement: {
		id: "inventory.movement.reverse",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_POST,
		additionalPermissions: [],
		transaction: "resumable",
		idempotency: "required",
		emits: [INVENTORY_MOVEMENT_CREATED_EVENT, INVENTORY_MOVEMENT_POSTED_EVENT],
	},
	reserveStock: {
		id: "inventory.stock.reserve",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_RESERVATION_CREATE,
		additionalPermissions: [],
		transaction: "atomic",
		idempotency: "required",
		emits: [INVENTORY_STOCK_RESERVED_EVENT],
	},
	releaseReservation: {
		id: "inventory.reservation.release",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_RESERVATION_RELEASE,
		additionalPermissions: [],
		transaction: "atomic",
		idempotency: "required",
		emits: [INVENTORY_RESERVATION_RELEASED_EVENT],
	},
	expireReservation: {
		id: "inventory.reservation.expire",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_RESERVATION_RELEASE,
		additionalPermissions: [],
		transaction: "atomic",
		idempotency: "required",
		emits: [INVENTORY_RESERVATION_EXPIRED_EVENT],
	},
	cancelReservation: {
		id: "inventory.reservation.cancel",
		kind: "command",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_RESERVATION_RELEASE,
		additionalPermissions: [],
		transaction: "atomic",
		idempotency: "required",
		emits: [INVENTORY_RESERVATION_CANCELLED_EVENT],
	},
	getMovement: {
		id: "inventory.movement.get",
		kind: "query",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_READ,
		additionalPermissions: [],
		transaction: "none",
		idempotency: "none",
		emits: [],
	},
	listMovements: {
		id: "inventory.movement.list",
		kind: "query",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_READ,
		additionalPermissions: [],
		transaction: "none",
		idempotency: "none",
		emits: [],
	},
	listReservations: {
		id: "inventory.reservation.list",
		kind: "query",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_MOVEMENT_READ,
		additionalPermissions: [],
		transaction: "none",
		idempotency: "none",
		emits: [],
	},
	getAvailability: {
		id: "inventory.stock.availability",
		kind: "query",
		owner: INVENTORY_OPERATION_OWNER,
		permission: INVENTORY_PERMISSION_AVAILABILITY_READ,
		additionalPermissions: [],
		transaction: "none",
		idempotency: "none",
		emits: [],
	},
} as const satisfies Record<string, InventoryOperationDefinition>;

type InventoryOperation =
	(typeof INVENTORY_OPERATION_DEFINITIONS)[keyof typeof INVENTORY_OPERATION_DEFINITIONS];
type InventoryCommandOperation = Extract<
	InventoryOperation,
	{ readonly kind: "command" }
>;
type InventoryQueryOperation = Extract<
	InventoryOperation,
	{ readonly kind: "query" }
>;

const operationDefinitions = Object.values(INVENTORY_OPERATION_DEFINITIONS);

function validateInventoryOperationRegistry(): void {
	const operationIds = new Set<string>();
	for (const definition of operationDefinitions) {
		if (operationIds.has(definition.id)) {
			throw new Error(`Duplicate Inventory operation ID: ${definition.id}`);
		}
		operationIds.add(definition.id);

		if (
			definition.kind === "query" &&
			(definition.transaction !== "none" ||
				definition.idempotency !== "none" ||
				definition.emits.length > 0)
		) {
			throw new Error(
				`Inventory query ${definition.id} cannot mutate or emit events`,
			);
		}
	}
}

validateInventoryOperationRegistry();

export type InventoryCommandId = InventoryCommandOperation["id"];
export type InventoryQueryId = InventoryQueryOperation["id"];

const commandDefinitions = operationDefinitions.filter(
	(definition): definition is InventoryCommandOperation =>
		definition.kind === "command",
);
const queryDefinitions = operationDefinitions.filter(
	(definition): definition is InventoryQueryOperation =>
		definition.kind === "query",
);

function projectAuthorization<
	TDefinition extends {
		readonly id: string;
		readonly permission: InventoryPermission;
	},
>(
	definitions: readonly TDefinition[],
): Readonly<Record<TDefinition["id"], InventoryPermission>> {
	const projection = Object.fromEntries(
		definitions.map((definition) => [definition.id, definition.permission]),
	);
	if (Object.keys(projection).length !== definitions.length) {
		throw new Error("Inventory operation IDs must be unique");
	}
	return Object.freeze(projection) as Readonly<
		Record<TDefinition["id"], InventoryPermission>
	>;
}

export const INVENTORY_COMMAND_IDS = Object.freeze(
	commandDefinitions.map((definition) => definition.id),
);
export const INVENTORY_QUERY_IDS = Object.freeze(
	queryDefinitions.map((definition) => definition.id),
);

export const INVENTORY_COMMAND_AUTHORIZATION =
	projectAuthorization(commandDefinitions);
export const INVENTORY_QUERY_AUTHORIZATION =
	projectAuthorization(queryDefinitions);

export const INVENTORY_EMITTED_EVENT_IDS = Object.freeze([
	...new Set(commandDefinitions.flatMap((definition) => definition.emits)),
]);

function singleEmission<const TEvent extends InventoryEventType>(
	emissions: readonly [TEvent],
): TEvent {
	const [emission] = emissions;
	return emission;
}

export const INVENTORY_CREATE_MOVEMENT_EMISSION = singleEmission(
	INVENTORY_OPERATION_DEFINITIONS.createMovement.emits,
);
export const INVENTORY_POST_MOVEMENT_EMISSION = singleEmission(
	INVENTORY_OPERATION_DEFINITIONS.postMovement.emits,
);
export const INVENTORY_CANCEL_MOVEMENT_EMISSION = singleEmission(
	INVENTORY_OPERATION_DEFINITIONS.cancelMovement.emits,
);
export const INVENTORY_RESERVE_STOCK_EMISSION = singleEmission(
	INVENTORY_OPERATION_DEFINITIONS.reserveStock.emits,
);
export const INVENTORY_RELEASE_RESERVATION_EMISSION = singleEmission(
	INVENTORY_OPERATION_DEFINITIONS.releaseReservation.emits,
);
export const INVENTORY_EXPIRE_RESERVATION_EMISSION = singleEmission(
	INVENTORY_OPERATION_DEFINITIONS.expireReservation.emits,
);
export const INVENTORY_CANCEL_RESERVATION_EMISSION = singleEmission(
	INVENTORY_OPERATION_DEFINITIONS.cancelReservation.emits,
);

export const INVENTORY_COMMAND_CREATE =
	INVENTORY_OPERATION_DEFINITIONS.createMovement.id;
export const INVENTORY_COMMAND_LINE_ADD =
	INVENTORY_OPERATION_DEFINITIONS.addMovementLine.id;
export const INVENTORY_COMMAND_POST =
	INVENTORY_OPERATION_DEFINITIONS.postMovement.id;
export const INVENTORY_COMMAND_CANCEL =
	INVENTORY_OPERATION_DEFINITIONS.cancelMovement.id;
export const INVENTORY_COMMAND_REVERSE =
	INVENTORY_OPERATION_DEFINITIONS.reverseMovement.id;
export const INVENTORY_COMMAND_RESERVE =
	INVENTORY_OPERATION_DEFINITIONS.reserveStock.id;
export const INVENTORY_COMMAND_RELEASE =
	INVENTORY_OPERATION_DEFINITIONS.releaseReservation.id;
export const INVENTORY_COMMAND_EXPIRE =
	INVENTORY_OPERATION_DEFINITIONS.expireReservation.id;
export const INVENTORY_COMMAND_CANCEL_RESERVATION =
	INVENTORY_OPERATION_DEFINITIONS.cancelReservation.id;

export const INVENTORY_QUERY_GET =
	INVENTORY_OPERATION_DEFINITIONS.getMovement.id;
export const INVENTORY_QUERY_LIST =
	INVENTORY_OPERATION_DEFINITIONS.listMovements.id;
export const INVENTORY_QUERY_RESERVATION_LIST =
	INVENTORY_OPERATION_DEFINITIONS.listReservations.id;
export const INVENTORY_QUERY_AVAILABILITY =
	INVENTORY_OPERATION_DEFINITIONS.getAvailability.id;
