/**
 * Inventory permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (inventory.*).
 */

export const INVENTORY_PERMISSION_READ = "inventory.read" as const;
export const INVENTORY_PERMISSION_MANAGE = "inventory.manage" as const;

export const INVENTORY_PERMISSION_CODES = [
	INVENTORY_PERMISSION_READ,
	INVENTORY_PERMISSION_MANAGE,
] as const;
