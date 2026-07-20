/** Inventory command / query IDs — package authority for MODULE registers. */

export const INVENTORY_COMMAND_CREATE = "inventory.movement.create" as const;
export const INVENTORY_COMMAND_LINE_ADD =
	"inventory.movement.line.add" as const;
export const INVENTORY_COMMAND_POST = "inventory.movement.post" as const;
export const INVENTORY_COMMAND_RESERVE = "inventory.stock.reserve" as const;
export const INVENTORY_COMMAND_RELEASE =
	"inventory.reservation.release" as const;

export const INVENTORY_COMMAND_IDS = [
	INVENTORY_COMMAND_CREATE,
	INVENTORY_COMMAND_LINE_ADD,
	INVENTORY_COMMAND_POST,
	INVENTORY_COMMAND_RESERVE,
	INVENTORY_COMMAND_RELEASE,
] as const;

export type InventoryCommandId = (typeof INVENTORY_COMMAND_IDS)[number];

export const INVENTORY_QUERY_GET = "inventory.movement.get" as const;
export const INVENTORY_QUERY_LIST = "inventory.movement.list" as const;
export const INVENTORY_QUERY_AVAILABILITY =
	"inventory.stock.availability" as const;

export const INVENTORY_QUERY_IDS = [
	INVENTORY_QUERY_GET,
	INVENTORY_QUERY_LIST,
	INVENTORY_QUERY_AVAILABILITY,
] as const;

export type InventoryQueryId = (typeof INVENTORY_QUERY_IDS)[number];
