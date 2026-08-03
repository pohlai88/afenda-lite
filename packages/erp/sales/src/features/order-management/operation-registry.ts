import { defineSalesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "order-management" as const;

/**
 * Lifecycle commands up to release. Composed BEFORE the hold commands so the
 * projected id order stays byte-identical to the historical module-ids list
 * (create … release, hold.place, hold.resolve, fulfillment.record, …).
 */
export const SALES_ORDER_LIFECYCLE_COMMANDS = defineSalesOperationRegistry({
	createDraftSalesOrder: {
		id: "sales.order.create",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.create",
		publicName: "createDraftSalesOrder",
	},
	addSalesOrderLine: {
		id: "sales.order.line.add",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.update",
		publicName: "addSalesOrderLine",
	},
	submitSalesOrder: {
		id: "sales.order.submit",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.update",
		publicName: "submitSalesOrder",
	},
	approveSalesOrder: {
		id: "sales.order.approve",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.approve",
		publicName: "approveSalesOrder",
	},
	postSalesOrder: {
		id: "sales.order.post",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.post",
		publicName: "postSalesOrder",
	},
	/**
	 * FINDING (W3): declared operation with no dedicated implementation —
	 * release is folded into postSalesOrder, which emits
	 * sales.order.released.v1. The id is kept to preserve the published
	 * authorization surface until the release/post split is decided.
	 */
	releaseSalesOrder: {
		id: "sales.order.release",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.release",
		publicName: "releaseSalesOrder",
	},
});

export const SALES_ORDER_EXECUTION_COMMANDS = defineSalesOperationRegistry({
	recordSalesOrderFulfillment: {
		id: "sales.order.fulfillment.record",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.update",
		publicName: "recordSalesOrderFulfillment",
	},
	cancelSalesOrder: {
		id: "sales.order.cancel",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.cancel",
		publicName: "cancelSalesOrder",
	},
	closeSalesOrder: {
		id: "sales.order.close",
		kind: "command",
		owner: OWNER,
		permission: "sales.order.close",
		publicName: "closeSalesOrder",
	},
});

export const SALES_ORDER_QUERIES = defineSalesOperationRegistry({
	getSalesOrderById: {
		id: "sales.order.get",
		kind: "query",
		owner: OWNER,
		permission: "sales.order.read",
		publicName: "getSalesOrderById",
	},
	listSalesOrders: {
		id: "sales.order.list",
		kind: "query",
		owner: OWNER,
		permission: "sales.order.list",
		publicName: "listSalesOrders",
	},
	/**
	 * FINDING (W3): getFulfillableSalesOrder delegates authorization to the
	 * sales.order.get check and never enforces this id's own permission.
	 */
	getFulfillableSalesOrder: {
		id: "sales.order.fulfillable",
		kind: "query",
		owner: OWNER,
		permission: "sales.order.read",
		publicName: "getFulfillableSalesOrder",
	},
});
