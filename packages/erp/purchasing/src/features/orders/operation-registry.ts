import {
	PURCHASING_PERMISSION_ORDER_CANCEL,
	PURCHASING_PERMISSION_ORDER_CLOSE,
	PURCHASING_PERMISSION_ORDER_CREATE,
	PURCHASING_PERMISSION_ORDER_LIST,
	PURCHASING_PERMISSION_ORDER_POST,
	PURCHASING_PERMISSION_ORDER_READ,
	PURCHASING_PERMISSION_ORDER_UPDATE,
} from "../../kernel/execution/permissions";
import { definePurchasingOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "orders" as const;

export const PURCHASING_ORDER_COMMANDS = definePurchasingOperationRegistry({
	createDraftPurchaseOrder: {
		id: "purchasing.order.create",
		kind: "command",
		owner: OWNER,
		permission: PURCHASING_PERMISSION_ORDER_CREATE,
		publicName: "createDraftPurchaseOrder",
	},
	addPurchaseOrderLine: {
		id: "purchasing.order.line.add",
		kind: "command",
		owner: OWNER,
		permission: PURCHASING_PERMISSION_ORDER_UPDATE,
		publicName: "addPurchaseOrderLine",
	},
	postPurchaseOrder: {
		id: "purchasing.order.post",
		kind: "command",
		owner: OWNER,
		permission: PURCHASING_PERMISSION_ORDER_POST,
		publicName: "postPurchaseOrder",
	},
	cancelPurchaseOrder: {
		id: "purchasing.order.cancel",
		kind: "command",
		owner: OWNER,
		permission: PURCHASING_PERMISSION_ORDER_CANCEL,
		publicName: "cancelPurchaseOrder",
	},
	closePurchaseOrder: {
		id: "purchasing.order.close",
		kind: "command",
		owner: OWNER,
		permission: PURCHASING_PERMISSION_ORDER_CLOSE,
		publicName: "closePurchaseOrder",
	},
});

export const PURCHASING_ORDER_QUERIES = definePurchasingOperationRegistry({
	getPurchaseOrderById: {
		id: "purchasing.order.get",
		kind: "query",
		owner: OWNER,
		permission: PURCHASING_PERMISSION_ORDER_READ,
		publicName: "getPurchaseOrderById",
	},
	listPurchaseOrders: {
		id: "purchasing.order.list",
		kind: "query",
		owner: OWNER,
		permission: PURCHASING_PERMISSION_ORDER_LIST,
		publicName: "listPurchaseOrders",
	},
});
