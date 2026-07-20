/** Inventory command / query IDs — package authority for MODULE registers. */

export const INVENTORY_COMMAND_CREATE = "inventory.movement.create" as const;
export const INVENTORY_COMMAND_LINE_ADD =
	"inventory.movement.line.add" as const;
export const INVENTORY_COMMAND_POST = "inventory.movement.post" as const;
export const INVENTORY_COMMAND_CANCEL = "inventory.movement.cancel" as const;
export const INVENTORY_COMMAND_REVERSE = "inventory.movement.reverse" as const;
export const INVENTORY_COMMAND_RESERVE = "inventory.stock.reserve" as const;
export const INVENTORY_COMMAND_RELEASE =
	"inventory.reservation.release" as const;
export const INVENTORY_COMMAND_EXPIRE =
	"inventory.reservation.expire" as const;
export const INVENTORY_COMMAND_CANCEL_RESERVATION =
	"inventory.reservation.cancel" as const;

export const INVENTORY_COMMAND_IDS = [
	INVENTORY_COMMAND_CREATE,
	INVENTORY_COMMAND_LINE_ADD,
	INVENTORY_COMMAND_POST,
	INVENTORY_COMMAND_CANCEL,
	INVENTORY_COMMAND_REVERSE,
	INVENTORY_COMMAND_RESERVE,
	INVENTORY_COMMAND_RELEASE,
	INVENTORY_COMMAND_EXPIRE,
	INVENTORY_COMMAND_CANCEL_RESERVATION,
] as const;

export type InventoryCommandId = (typeof INVENTORY_COMMAND_IDS)[number];

export const INVENTORY_QUERY_GET = "inventory.movement.get" as const;
export const INVENTORY_QUERY_LIST = "inventory.movement.list" as const;
export const INVENTORY_QUERY_RESERVATION_LIST =
	"inventory.reservation.list" as const;
export const INVENTORY_QUERY_AVAILABILITY =
	"inventory.stock.availability" as const;

export const INVENTORY_QUERY_IDS = [
	INVENTORY_QUERY_GET,
	INVENTORY_QUERY_LIST,
	INVENTORY_QUERY_RESERVATION_LIST,
	INVENTORY_QUERY_AVAILABILITY,
] as const;

export type InventoryQueryId = (typeof INVENTORY_QUERY_IDS)[number];
