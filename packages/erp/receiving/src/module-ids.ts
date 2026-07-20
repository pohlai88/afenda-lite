export const RECEIVING_COMMAND_CREATE = "receiving.receipt.create" as const;
export const RECEIVING_COMMAND_LINE_ADD = "receiving.receipt.line.add" as const;
export const RECEIVING_COMMAND_POST = "receiving.receipt.post" as const;
export const RECEIVING_COMMAND_CANCEL = "receiving.receipt.cancel" as const;
export const RECEIVING_COMMAND_REVERSE = "receiving.receipt.reverse" as const;
export const RECEIVING_COMMAND_DISCREPANCY_RECORD =
	"receiving.discrepancy.record" as const;
export const RECEIVING_COMMAND_DISCREPANCY_RESOLVE =
	"receiving.discrepancy.resolve" as const;

export const RECEIVING_COMMAND_IDS = [
	RECEIVING_COMMAND_CREATE,
	RECEIVING_COMMAND_LINE_ADD,
	RECEIVING_COMMAND_POST,
	RECEIVING_COMMAND_CANCEL,
	RECEIVING_COMMAND_REVERSE,
	RECEIVING_COMMAND_DISCREPANCY_RECORD,
	RECEIVING_COMMAND_DISCREPANCY_RESOLVE,
] as const;
export type ReceivingCommandId = (typeof RECEIVING_COMMAND_IDS)[number];

export const RECEIVING_QUERY_GET = "receiving.receipt.get" as const;
export const RECEIVING_QUERY_LIST = "receiving.receipt.list" as const;
export const RECEIVING_QUERY_INVENTORY_EXCEPTIONS =
	"receiving.inventory.exceptions" as const;
export const RECEIVING_QUERY_IDS = [
	RECEIVING_QUERY_GET,
	RECEIVING_QUERY_LIST,
	RECEIVING_QUERY_INVENTORY_EXCEPTIONS,
] as const;
export type ReceivingQueryId = (typeof RECEIVING_QUERY_IDS)[number];
