/** Purchasing command / query IDs — package authority for MODULE registers. */

export const PURCHASING_COMMAND_CREATE = "purchasing.order.create" as const;
export const PURCHASING_COMMAND_LINE_ADD = "purchasing.order.line.add" as const;
export const PURCHASING_COMMAND_POST = "purchasing.order.post" as const;
export const PURCHASING_COMMAND_CANCEL = "purchasing.order.cancel" as const;
export const PURCHASING_COMMAND_CLOSE = "purchasing.order.close" as const;

export const PURCHASING_COMMAND_IDS = [
	PURCHASING_COMMAND_CREATE,
	PURCHASING_COMMAND_LINE_ADD,
	PURCHASING_COMMAND_POST,
	PURCHASING_COMMAND_CANCEL,
	PURCHASING_COMMAND_CLOSE,
] as const;

export type PurchasingCommandId = (typeof PURCHASING_COMMAND_IDS)[number];

export const PURCHASING_QUERY_GET = "purchasing.order.get" as const;
export const PURCHASING_QUERY_LIST = "purchasing.order.list" as const;

export const PURCHASING_QUERY_IDS = [
	PURCHASING_QUERY_GET,
	PURCHASING_QUERY_LIST,
] as const;

export type PurchasingQueryId = (typeof PURCHASING_QUERY_IDS)[number];
