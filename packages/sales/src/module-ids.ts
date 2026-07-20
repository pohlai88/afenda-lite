/** Sales command / query IDs — package authority for MODULE registers. */

export const SALES_COMMAND_CREATE = "sales.order.create" as const;
export const SALES_COMMAND_LINE_ADD = "sales.order.line.add" as const;
export const SALES_COMMAND_POST = "sales.order.post" as const;

export const SALES_COMMAND_IDS = [
	SALES_COMMAND_CREATE,
	SALES_COMMAND_LINE_ADD,
	SALES_COMMAND_POST,
] as const;

export type SalesCommandId = (typeof SALES_COMMAND_IDS)[number];

export const SALES_QUERY_GET = "sales.order.get" as const;
export const SALES_QUERY_LIST = "sales.order.list" as const;

export const SALES_QUERY_IDS = [SALES_QUERY_GET, SALES_QUERY_LIST] as const;

export type SalesQueryId = (typeof SALES_QUERY_IDS)[number];
