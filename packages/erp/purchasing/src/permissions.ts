/**
 * Purchasing permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (purchasing.order.*).
 */

export const PURCHASING_PERMISSION_ORDER_CREATE =
	"purchasing.order.create" as const;
export const PURCHASING_PERMISSION_ORDER_UPDATE =
	"purchasing.order.update" as const;
export const PURCHASING_PERMISSION_ORDER_POST =
	"purchasing.order.post" as const;
export const PURCHASING_PERMISSION_ORDER_CANCEL =
	"purchasing.order.cancel" as const;
export const PURCHASING_PERMISSION_ORDER_CLOSE =
	"purchasing.order.close" as const;
export const PURCHASING_PERMISSION_ORDER_READ =
	"purchasing.order.read" as const;
export const PURCHASING_PERMISSION_ORDER_LIST =
	"purchasing.order.list" as const;

export const PURCHASING_PERMISSION_CODES = [
	PURCHASING_PERMISSION_ORDER_CREATE,
	PURCHASING_PERMISSION_ORDER_UPDATE,
	PURCHASING_PERMISSION_ORDER_POST,
	PURCHASING_PERMISSION_ORDER_CANCEL,
	PURCHASING_PERMISSION_ORDER_CLOSE,
	PURCHASING_PERMISSION_ORDER_READ,
	PURCHASING_PERMISSION_ORDER_LIST,
] as const;
