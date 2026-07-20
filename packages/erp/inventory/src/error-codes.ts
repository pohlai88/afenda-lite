/**
 * Inventory-owned semantic error codes — package authority.
 * Platform `Result` still uses `@afenda/errors` ErrorCode; attach these via details.inventoryCode.
 */

export const INVENTORY_ERROR_MOVEMENT_NOT_FOUND =
	"inventory.movement.not_found" as const;
export const INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED =
	"inventory.movement.already_posted" as const;
export const INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED =
	"inventory.movement.already_cancelled" as const;
export const INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT =
	"inventory.movement.version_conflict" as const;
export const INVENTORY_ERROR_MOVEMENT_NOT_DRAFT =
	"inventory.movement.not_draft" as const;
export const INVENTORY_ERROR_MOVEMENT_EMPTY_LINES =
	"inventory.movement.empty_lines" as const;
export const INVENTORY_ERROR_INSUFFICIENT_ON_HAND =
	"inventory.stock.insufficient_on_hand" as const;
export const INVENTORY_ERROR_INSUFFICIENT_AVAILABLE =
	"inventory.stock.insufficient_available" as const;
export const INVENTORY_ERROR_RESERVATION_NOT_FOUND =
	"inventory.reservation.not_found" as const;
export const INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED =
	"inventory.reservation.already_released" as const;
export const INVENTORY_ERROR_RESERVATION_VERSION_CONFLICT =
	"inventory.reservation.version_conflict" as const;
export const INVENTORY_ERROR_INVALID_TRANSFER =
	"inventory.transfer.invalid" as const;
export const INVENTORY_ERROR_INVALID_UOM_CONVERSION =
	"inventory.uom.invalid_conversion" as const;
export const INVENTORY_ERROR_DUPLICATE_SOURCE_EVENT =
	"inventory.source_event.duplicate" as const;
export const INVENTORY_ERROR_IDEMPOTENCY_CONFLICT =
	"inventory.idempotency.conflict" as const;
export const INVENTORY_ERROR_CODE_CONFLICT =
	"inventory.movement.code_conflict" as const;
export const INVENTORY_ERROR_SOURCE_REQUIRED =
	"inventory.source.required" as const;
export const INVENTORY_ERROR_SOURCE_POLICY =
	"inventory.source.policy_violation" as const;

export const INVENTORY_ERROR_CODES = [
	INVENTORY_ERROR_MOVEMENT_NOT_FOUND,
	INVENTORY_ERROR_MOVEMENT_ALREADY_POSTED,
	INVENTORY_ERROR_MOVEMENT_ALREADY_CANCELLED,
	INVENTORY_ERROR_MOVEMENT_VERSION_CONFLICT,
	INVENTORY_ERROR_MOVEMENT_NOT_DRAFT,
	INVENTORY_ERROR_MOVEMENT_EMPTY_LINES,
	INVENTORY_ERROR_INSUFFICIENT_ON_HAND,
	INVENTORY_ERROR_INSUFFICIENT_AVAILABLE,
	INVENTORY_ERROR_RESERVATION_NOT_FOUND,
	INVENTORY_ERROR_RESERVATION_ALREADY_RELEASED,
	INVENTORY_ERROR_RESERVATION_VERSION_CONFLICT,
	INVENTORY_ERROR_INVALID_TRANSFER,
	INVENTORY_ERROR_INVALID_UOM_CONVERSION,
	INVENTORY_ERROR_DUPLICATE_SOURCE_EVENT,
	INVENTORY_ERROR_IDEMPOTENCY_CONFLICT,
	INVENTORY_ERROR_CODE_CONFLICT,
	INVENTORY_ERROR_SOURCE_REQUIRED,
	INVENTORY_ERROR_SOURCE_POLICY,
] as const;

export type InventoryErrorCode = (typeof INVENTORY_ERROR_CODES)[number];

export function inventoryErrorDetails(inventoryCode: InventoryErrorCode): {
	inventoryCode: InventoryErrorCode;
} {
	return { inventoryCode };
}
