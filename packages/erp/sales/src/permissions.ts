/**
 * Sales permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (sales.order.*).
 */

export const SALES_PERMISSION_ORDER_CREATE = "sales.order.create" as const;
export const SALES_PERMISSION_ORDER_UPDATE = "sales.order.update" as const;
export const SALES_PERMISSION_ORDER_POST = "sales.order.post" as const;
export const SALES_PERMISSION_ORDER_CANCEL = "sales.order.cancel" as const;
export const SALES_PERMISSION_ORDER_READ = "sales.order.read" as const;
export const SALES_PERMISSION_ORDER_LIST = "sales.order.list" as const;

export const SALES_PERMISSION_CODES = [
	SALES_PERMISSION_ORDER_CREATE,
	SALES_PERMISSION_ORDER_UPDATE,
	SALES_PERMISSION_ORDER_POST,
	SALES_PERMISSION_ORDER_CANCEL,
	SALES_PERMISSION_ORDER_READ,
	SALES_PERMISSION_ORDER_LIST,
] as const;
