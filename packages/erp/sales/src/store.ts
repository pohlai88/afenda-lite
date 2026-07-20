import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	SalesOrder,
	SalesOrderLine,
	SalesOrderListSort,
	SalesOrderStatus,
} from "./types";

export type OrderCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	partyId: string;
	partyCode: string;
	partyName: string;
	billToAddressSnapshot: string | null;
	shipToAddressSnapshot: string | null;
	paymentTermId: string | null;
	paymentTermCode: string | null;
	paymentTermName: string | null;
	netDays: number | null;
	currencyCode: string;
	exchangeRate: string | null;
	createIdempotencyKey: string;
	createdBy: string;
};

export type OrderLineCreateRecord = {
	organizationId: string;
	orderId: string;
	expectedVersion: number;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantity: string;
	unitPrice: string;
	discountAmount: string;
	taxClassification: string | null;
	lineAmount: string;
	lineIdempotencyKey: string;
	createdBy: string;
};

export type OrderPostRecord = {
	organizationId: string;
	orderId: string;
	expectedVersion: number;
	actorUserId: string;
	postIdempotencyKey: string;
	partyCode: string;
	partyName: string;
	paymentTermId: string | null;
	paymentTermCode: string | null;
	paymentTermName: string | null;
	netDays: number | null;
	subtotalAmount: string;
	discountTotal: string;
	taxTotal: string;
	documentTotal: string;
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
};

export type OrderCancelRecord = {
	organizationId: string;
	orderId: string;
	expectedVersion: number;
	actorUserId: string;
	cancelIdempotencyKey: string;
};

export type OrderListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: SalesOrderStatus;
	sort: SalesOrderListSort;
};

/**
 * Atomic mutation boundary for Sales — both Memory and Drizzle adapters commit
 * aggregate mutation + audit fact + outbox event as one unit of work.
 * Memory uses injectable MutationPorts; Drizzle embeds equivalent SQL in one TX.
 */
export type SalesStore = {
	createOrder(
		record: OrderCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrder>>;
	addLine(
		record: OrderLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrderLine>>;
	postOrder(
		record: OrderPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrder>>;
	cancelOrder(
		record: OrderCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<SalesOrder>>;
	getOrderById(
		organizationId: string,
		id: string,
	): Promise<Result<SalesOrder | null>>;
	getOrderByCreateIdempotencyKey(
		organizationId: string,
		createIdempotencyKey: string,
	): Promise<Result<SalesOrder | null>>;
	listOrders(filter: OrderListFilter): Promise<Result<SalesOrder[]>>;
};
