import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	PurchaseOrder,
	PurchaseOrderLine,
	PurchaseOrderStatus,
} from "./types";

export type OrderCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	partyId: string;
	partyCode: string;
	partyName: string;
	paymentTermId: string | null;
	paymentTermCode: string | null;
	netDays: number | null;
	warehouseId: string | null;
	warehouseCode: string | null;
	warehouseName: string | null;
	createdBy: string;
};

export type OrderLineCreateRecord = {
	organizationId: string;
	orderId: string;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantity: string;
	createdBy: string;
};

export type OrderPostRecord = {
	organizationId: string;
	orderId: string;
	expectedVersion: number;
	actorUserId: string;
	partyCode: string;
	partyName: string;
	paymentTermId: string | null;
	paymentTermCode: string | null;
	netDays: number | null;
	warehouseId: string | null;
	warehouseCode: string | null;
	warehouseName: string | null;
	lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
	}>;
};

export type OrderCancelRecord = {
	organizationId: string;
	orderId: string;
	expectedVersion: number;
	actorUserId: string;
};

export type OrderListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: PurchaseOrderStatus;
};

export type PurchasingStore = {
	createOrder(
		record: OrderCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>>;
	addLine(
		record: OrderLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrderLine>>;
	postOrder(
		record: OrderPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>>;
	cancelOrder(
		record: OrderCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<PurchaseOrder>>;
	getOrderById(
		organizationId: string,
		id: string,
	): Promise<Result<PurchaseOrder | null>>;
	listOrders(filter: OrderListFilter): Promise<Result<PurchaseOrder[]>>;
};
