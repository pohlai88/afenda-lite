import { AccountingEventSchemas } from "./accounting.events";
import { FulfillmentEventSchemas } from "./fulfillment.events";
import { IdentityEventSchemas } from "./identity.events";
import { InventoryEventSchemas } from "./inventory.events";
import { MasterDataEventSchemas } from "./master-data.events";
import { PayablesEventSchemas } from "./payables.events";
import { PaymentsEventSchemas } from "./payments.events";
import { PlatformEventSchemas } from "./platform.events";
import { PurchasingEventSchemas } from "./purchasing.events";
import { ReceivablesEventSchemas } from "./receivables.events";
import { ReceivingEventSchemas } from "./receiving.events";
import { SalesEventSchemas } from "./sales.events";

export {
	ACCOUNTING_EVENT_IDS,
	ACCOUNTING_JOURNAL_CREATED_EVENT,
	ACCOUNTING_JOURNAL_POSTED_EVENT,
	ACCOUNTING_JOURNAL_REVERSED_EVENT,
	ACCOUNTING_PERIOD_CLOSED_EVENT,
	type AccountingEventType,
	AccountingEventSchemas,
	type AccountingPayload,
	accountingPayloadSchema,
} from "./accounting.events";
export {
	type DeliveryPayload,
	deliveryPayloadSchema,
	FULFILLMENT_DELIVERY_COMPLETED_EVENT,
	FULFILLMENT_DELIVERY_CREATED_EVENT,
	FULFILLMENT_DELIVERY_POSTED_EVENT,
	FULFILLMENT_EVENT_IDS,
	FULFILLMENT_PICK_CONFIRMED_EVENT,
	FulfillmentEventSchemas,
	type FulfillmentEventType,
	type PickPayload,
	pickPayloadSchema,
} from "./fulfillment.events";
export {
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityOrgRoleAssignedPayload,
	identityOrgRoleAssignedPayloadSchema,
} from "./identity.events";
export {
	INVENTORY_EVENT_IDS,
	INVENTORY_MOVEMENT_CREATED_EVENT,
	INVENTORY_MOVEMENT_POSTED_EVENT,
	INVENTORY_RESERVATION_RELEASED_EVENT,
	INVENTORY_STOCK_RESERVED_EVENT,
	InventoryEventSchemas,
	type InventoryEventType,
	type StockMovementPayload,
	type StockReservationPayload,
	stockMovementPayloadSchema,
	stockReservationPayloadSchema,
} from "./inventory.events";
export {
	MASTER_DATA_EVENT_IDS,
	type MasterDataEntityPayload,
	MasterDataEventSchemas,
	type MasterDataEventType,
	masterDataEntityPayloadSchema,
} from "./master-data.events";
export {
	PAYABLES_ALLOCATION_POSTED_EVENT,
	PAYABLES_CREDIT_NOTE_POSTED_EVENT,
	PAYABLES_EVENT_IDS,
	PAYABLES_INVOICE_CREATED_EVENT,
	PAYABLES_INVOICE_MATCHED_EVENT,
	PAYABLES_INVOICE_POSTED_EVENT,
	PayablesEventSchemas,
	type PayablesEventType,
	type PayablesPayload,
	payablesPayloadSchema,
} from "./payables.events";
export {
	PAYMENTS_EVENT_IDS,
	PAYMENTS_PAYMENT_CREATED_EVENT,
	PAYMENTS_PAYMENT_POSTED_EVENT,
	PAYMENTS_PAYMENT_REVERSED_EVENT,
	PAYMENTS_REFUND_POSTED_EVENT,
	type PaymentPayload,
	PaymentsEventSchemas,
	type PaymentsEventType,
	paymentPayloadSchema,
} from "./payments.events";
export {
	PlatformEventSchemas,
	type PlatformEventType,
	type PlatformOrganizationDeletedPayload,
	platformOrganizationDeletedPayloadSchema,
} from "./platform.events";
export {
	PURCHASING_EVENT_IDS,
	PURCHASING_ORDER_CANCELLED_EVENT,
	PURCHASING_ORDER_CLOSED_EVENT,
	PURCHASING_ORDER_CREATED_EVENT,
	PURCHASING_ORDER_LINE_ADDED_EVENT,
	PURCHASING_ORDER_POSTED_EVENT,
	type PurchaseOrderLinePayload,
	type PurchaseOrderPayload,
	PurchasingEventSchemas,
	type PurchasingEventType,
	purchaseOrderLinePayloadSchema,
	purchaseOrderPayloadSchema,
} from "./purchasing.events";
export {
	RECEIVABLES_ALLOCATION_POSTED_EVENT,
	RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
	RECEIVABLES_EVENT_IDS,
	RECEIVABLES_INVOICE_CREATED_EVENT,
	RECEIVABLES_INVOICE_POSTED_EVENT,
	ReceivablesEventSchemas,
	type ReceivablesEventType,
	type ReceivablesPayload,
	receivablesPayloadSchema,
} from "./receivables.events";
export {
	type GoodsReceiptLinePayload,
	type GoodsReceiptPayload,
	goodsReceiptLinePayloadSchema,
	goodsReceiptPayloadSchema,
	RECEIVING_DISCREPANCY_RECORDED_EVENT,
	RECEIVING_EVENT_IDS,
	RECEIVING_RECEIPT_CREATED_EVENT,
	RECEIVING_RECEIPT_LINE_ADDED_EVENT,
	RECEIVING_RECEIPT_POSTED_EVENT,
	type ReceivingDiscrepancyPayload,
	ReceivingEventSchemas,
	type ReceivingEventType,
	receivingDiscrepancyPayloadSchema,
} from "./receiving.events";
export {
	SALES_EVENT_IDS,
	SALES_ORDER_CANCELLED_EVENT,
	SALES_ORDER_CREATED_EVENT,
	SALES_ORDER_LINE_ADDED_EVENT,
	SALES_ORDER_POSTED_EVENT,
	SalesEventSchemas,
	type SalesEventType,
	type SalesOrderLinePayload,
	type SalesOrderPayload,
	salesOrderLinePayloadSchema,
	salesOrderPayloadSchema,
} from "./sales.events";

export const AllEventSchemas = {
	...AccountingEventSchemas,
	...IdentityEventSchemas,
	...PlatformEventSchemas,
	...MasterDataEventSchemas,
	...PayablesEventSchemas,
	...PaymentsEventSchemas,
	...PurchasingEventSchemas,
	...ReceivingEventSchemas,
	...FulfillmentEventSchemas,
	...ReceivablesEventSchemas,
	...SalesEventSchemas,
	...InventoryEventSchemas,
} as const;

export type AllEventType = keyof typeof AllEventSchemas;

export function isKnownEventType(type: string): type is AllEventType {
	return Object.hasOwn(AllEventSchemas, type);
}
