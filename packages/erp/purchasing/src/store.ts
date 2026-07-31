import type { Result } from "@afenda/errors";

import type { MutationPorts } from "./ports";
import type {
	PurchaseOrder,
	PurchaseOrderLine,
	PurchaseOrderStatus,
} from "./types";

export interface OrderCreateRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	currencyCode: string;
	exchangeRate: string | null;
	netDays: number | null;
	normalizedCode: string;
	organizationId: string;
	partyCode: string;
	partyId: string;
	partyName: string;
	paymentTermCode: string | null;
	paymentTermId: string | null;
	paymentTermName: string | null;
	warehouseCode: string | null;
	warehouseId: string | null;
	warehouseName: string | null;
}

export interface OrderLineCreateRecord {
	baseUomCode: string;
	baseUomId: string;
	createdBy: string;
	discountAmount: string;
	invoicePriceTolerancePercent: string;
	invoiceQuantityTolerancePercent: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineAmount: string;
	lineIdempotencyKey: string;
	orderId: string;
	organizationId: string;
	overReceiptPercent: string;
	quantity: string;
	taxClassification: string | null;
	underReceiptPercent: string;
	unitPrice: string;
}

export interface OrderPostRecord {
	actorUserId: string;
	discountTotal: string;
	documentTotal: string;
	expectedVersion: number;
	lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
		unitPrice: string;
		discountAmount: string;
		taxClassification: string | null;
		lineAmount: string;
	}>;
	netDays: number | null;
	orderId: string;
	organizationId: string;
	partyCode: string;
	partyName: string;
	paymentTermCode: string | null;
	paymentTermId: string | null;
	paymentTermName: string | null;
	postIdempotencyKey: string;
	subtotalAmount: string;
	taxTotal: string;
	warehouseCode: string | null;
	warehouseId: string | null;
	warehouseName: string | null;
}

export interface OrderCancelRecord {
	actorUserId: string;
	cancelIdempotencyKey: string;
	expectedVersion: number;
	orderId: string;
	organizationId: string;
}

export interface OrderCloseRecord {
	actorUserId: string;
	closeIdempotencyKey: string;
	expectedVersion: number;
	orderId: string;
	organizationId: string;
}

export interface OrderListFilter {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: PurchaseOrderStatus | undefined;
}

/**
 * Atomic mutation boundary for Purchasing — both Memory and Drizzle adapters commit
 * aggregate mutation + audit fact + outbox event as one unit of work.
 * Memory uses injectable MutationPorts; Drizzle embeds equivalent SQL in one TX.
 */
export interface PurchasingStore {
	addLine: (
		record: OrderLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PurchaseOrderLine>>;
	cancelOrder: (
		record: OrderCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PurchaseOrder>>;
	closeOrder: (
		record: OrderCloseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PurchaseOrder>>;
	createOrder: (
		record: OrderCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PurchaseOrder>>;
	getOrderByCreateIdempotencyKey: (
		organizationId: string,
		createIdempotencyKey: string,
	) => Promise<Result<PurchaseOrder | null>>;
	getOrderById: (
		organizationId: string,
		id: string,
	) => Promise<Result<PurchaseOrder | null>>;
	listOrders: (filter: OrderListFilter) => Promise<Result<PurchaseOrder[]>>;
	postOrder: (
		record: OrderPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<PurchaseOrder>>;
}
