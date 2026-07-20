/**
 * Inventory permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (inventory.*).
 */

export const INVENTORY_PERMISSION_MOVEMENT_CREATE =
	"inventory.movement.create" as const;
export const INVENTORY_PERMISSION_MOVEMENT_POST =
	"inventory.movement.post" as const;
export const INVENTORY_PERMISSION_MOVEMENT_CANCEL =
	"inventory.movement.cancel" as const;
export const INVENTORY_PERMISSION_MOVEMENT_READ =
	"inventory.movement.read" as const;
export const INVENTORY_PERMISSION_RESERVATION_CREATE =
	"inventory.reservation.create" as const;
export const INVENTORY_PERMISSION_RESERVATION_RELEASE =
	"inventory.reservation.release" as const;
export const INVENTORY_PERMISSION_AVAILABILITY_READ =
	"inventory.availability.read" as const;
export const INVENTORY_PERMISSION_ADJUSTMENT_POST =
	"inventory.adjustment.post" as const;

export const INVENTORY_PERMISSION_CODES = [
	INVENTORY_PERMISSION_MOVEMENT_CREATE,
	INVENTORY_PERMISSION_MOVEMENT_POST,
	INVENTORY_PERMISSION_MOVEMENT_CANCEL,
	INVENTORY_PERMISSION_MOVEMENT_READ,
	INVENTORY_PERMISSION_RESERVATION_CREATE,
	INVENTORY_PERMISSION_RESERVATION_RELEASE,
	INVENTORY_PERMISSION_AVAILABILITY_READ,
	INVENTORY_PERMISSION_ADJUSTMENT_POST,
] as const;
