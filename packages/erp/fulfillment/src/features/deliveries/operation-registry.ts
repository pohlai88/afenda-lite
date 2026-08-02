import {
	FULFILLMENT_PERMISSION_DELIVERY_CANCEL,
	FULFILLMENT_PERMISSION_DELIVERY_CLOSE,
	FULFILLMENT_PERMISSION_DELIVERY_CREATE,
	FULFILLMENT_PERMISSION_DELIVERY_POST,
	FULFILLMENT_PERMISSION_DELIVERY_READ,
	FULFILLMENT_PERMISSION_DELIVERY_UPDATE,
	FULFILLMENT_PERMISSION_PACKING_CONFIRM,
	FULFILLMENT_PERMISSION_PICKING_CONFIRM,
	FULFILLMENT_PERMISSION_POD_RECORD,
} from "../../kernel/execution/permissions";
import { defineFulfillmentOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "deliveries" as const;

export const FULFILLMENT_DELIVERY_COMMANDS = defineFulfillmentOperationRegistry(
	{
		createDraftDelivery: {
			id: "fulfillment.delivery.create",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_DELIVERY_CREATE,
			publicName: "createDraftDelivery",
		},
		addDeliveryLine: {
			id: "fulfillment.delivery.line.add",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_DELIVERY_UPDATE,
			publicName: "addDeliveryLine",
		},
		startPicking: {
			id: "fulfillment.delivery.pick.start",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_PICKING_CONFIRM,
			publicName: "startPicking",
		},
		confirmPick: {
			id: "fulfillment.delivery.pick.confirm",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_PICKING_CONFIRM,
			publicName: "confirmPick",
		},
		confirmPack: {
			id: "fulfillment.delivery.pack.confirm",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_PACKING_CONFIRM,
			publicName: "confirmPack",
		},
		postDelivery: {
			id: "fulfillment.delivery.post",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_DELIVERY_POST,
			publicName: "postDelivery",
		},
		recordProofOfDelivery: {
			id: "fulfillment.delivery.pod.record",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_POD_RECORD,
			publicName: "recordProofOfDelivery",
		},
		cancelDelivery: {
			id: "fulfillment.delivery.cancel",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_DELIVERY_CANCEL,
			publicName: "cancelDelivery",
		},
		closeDelivery: {
			id: "fulfillment.delivery.close",
			kind: "command",
			owner: OWNER,
			permission: FULFILLMENT_PERMISSION_DELIVERY_CLOSE,
			publicName: "closeDelivery",
		},
	},
);

export const FULFILLMENT_DELIVERY_QUERIES = defineFulfillmentOperationRegistry({
	getDeliveryById: {
		id: "fulfillment.delivery.get",
		kind: "query",
		owner: OWNER,
		permission: FULFILLMENT_PERMISSION_DELIVERY_READ,
		publicName: "getDeliveryById",
	},
	listDeliveries: {
		id: "fulfillment.delivery.list",
		kind: "query",
		owner: OWNER,
		permission: FULFILLMENT_PERMISSION_DELIVERY_READ,
		publicName: "listDeliveries",
	},
});
