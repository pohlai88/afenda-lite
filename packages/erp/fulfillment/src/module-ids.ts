export const FULFILLMENT_COMMAND_CREATE =
	"fulfillment.delivery.create" as const;
export const FULFILLMENT_COMMAND_LINE_ADD =
	"fulfillment.delivery.line.add" as const;
export const FULFILLMENT_COMMAND_PICK_START =
	"fulfillment.delivery.pick.start" as const;
export const FULFILLMENT_COMMAND_PICK_CONFIRM =
	"fulfillment.delivery.pick.confirm" as const;
export const FULFILLMENT_COMMAND_PACK_CONFIRM =
	"fulfillment.delivery.pack.confirm" as const;
export const FULFILLMENT_COMMAND_POST = "fulfillment.delivery.post" as const;
export const FULFILLMENT_COMMAND_POD_RECORD =
	"fulfillment.delivery.pod.record" as const;
export const FULFILLMENT_COMMAND_CANCEL =
	"fulfillment.delivery.cancel" as const;
export const FULFILLMENT_QUERY_GET = "fulfillment.delivery.get" as const;
export const FULFILLMENT_QUERY_LIST = "fulfillment.delivery.list" as const;

export const FULFILLMENT_COMMAND_IDS = [
	FULFILLMENT_COMMAND_CREATE,
	FULFILLMENT_COMMAND_LINE_ADD,
	FULFILLMENT_COMMAND_PICK_START,
	FULFILLMENT_COMMAND_PICK_CONFIRM,
	FULFILLMENT_COMMAND_PACK_CONFIRM,
	FULFILLMENT_COMMAND_POST,
	FULFILLMENT_COMMAND_POD_RECORD,
	FULFILLMENT_COMMAND_CANCEL,
] as const;
export type FulfillmentCommandId = (typeof FULFILLMENT_COMMAND_IDS)[number];

export const FULFILLMENT_QUERY_IDS = [
	FULFILLMENT_QUERY_GET,
	FULFILLMENT_QUERY_LIST,
] as const;
export type FulfillmentQueryId = (typeof FULFILLMENT_QUERY_IDS)[number];
