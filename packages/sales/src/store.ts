import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type { SalesOrder, SalesOrderLine, SalesOrderStatus } from "./types";

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
	lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
	}>;
};

export type OrderListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: SalesOrderStatus;
};

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
	getOrderById(
		organizationId: string,
		id: string,
	): Promise<Result<SalesOrder | null>>;
	listOrders(filter: OrderListFilter): Promise<Result<SalesOrder[]>>;
};
