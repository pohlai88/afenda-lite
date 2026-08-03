import "server-only";

export {
	addPurchaseOrderLine,
	cancelPurchaseOrder,
	closePurchaseOrder,
	createDraftPurchaseOrder,
	getPurchaseOrderById,
	listPurchaseOrders,
	postPurchaseOrder,
} from "./facade/capabilities";
export type { PurchasingCommandOptions } from "./facade/contracts";
export {
	addPurchaseOrderLineInputSchema,
	cancelPurchaseOrderInputSchema,
	closePurchaseOrderInputSchema,
	createDraftPurchaseOrderInputSchema,
	getPurchaseOrderByIdInputSchema,
	listPurchaseOrdersInputSchema,
	postPurchaseOrderInputSchema,
} from "./features/orders/orders.schema";
export type {
	OrderCancelRecord,
	OrderCloseRecord,
	OrderCreateRecord,
	OrderLineCreateRecord,
	OrderListFilter,
	OrderPostRecord,
	PurchasingStore,
} from "./features/orders/orders.store";
export {
	PURCHASE_ORDER_STATUSES,
	type PurchaseOrder,
	type PurchaseOrderLine,
	type PurchaseOrderStatus,
} from "./kernel/contracts/domain";
export type {
	MasterLookupPort,
	MutationPorts,
	PurchaseOrderCommitmentQueryPort,
	PurchaseOrderCommitmentStatus,
} from "./kernel/contracts/ports";
export type {
	PurchasingAuthorizationPort,
	PurchasingPermission,
} from "./kernel/execution/authorization";
export {
	PURCHASING_PERMISSION_CODES,
	PURCHASING_PERMISSION_ORDER_CANCEL,
	PURCHASING_PERMISSION_ORDER_CLOSE,
	PURCHASING_PERMISSION_ORDER_CREATE,
	PURCHASING_PERMISSION_ORDER_LIST,
	PURCHASING_PERMISSION_ORDER_POST,
	PURCHASING_PERMISSION_ORDER_READ,
	PURCHASING_PERMISSION_ORDER_UPDATE,
} from "./kernel/execution/permissions";
export {
	type PurchaseOrderId,
	type PurchaseOrderLineId,
	purchaseOrderIdSchema,
	purchaseOrderLineIdSchema,
} from "./kernel/identity/brands";
