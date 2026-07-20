import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	GoodsReceipt,
	GoodsReceiptLine,
	GoodsReceiptSourceType,
	GoodsReceiptStatus,
	ReceivingDiscrepancy,
	ReceivingDiscrepancyType,
} from "./types";

export type ReceiptCreateRecord = {
	organizationId: string;
	code: string;
	normalizedCode: string;
	sourceType: GoodsReceiptSourceType;
	sourceId: string | null;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	notes: string | null;
	createdBy: string;
};
export type ReceiptLineCreateRecord = {
	organizationId: string;
	receiptId: string;
	itemId: string;
	itemCode: string;
	itemName: string;
	baseUomId: string;
	baseUomCode: string;
	quantityOrdered: string | null;
	quantityReceived: string;
	purchaseOrderLineId: string | null;
	createdBy: string;
};
export type ReceiptPostRecord = {
	organizationId: string;
	receiptId: string;
	expectedVersion: number;
	actorUserId: string;
	warehouseCode: string;
	warehouseName: string;
	lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
	}>;
};
export type ReceiptCancelRecord = {
	organizationId: string;
	receiptId: string;
	expectedVersion: number;
	actorUserId: string;
};
export type DiscrepancyCreateRecord = {
	organizationId: string;
	receiptId: string;
	receiptLineId: string | null;
	discrepancyType: ReceivingDiscrepancyType;
	quantity: string;
	notes: string | null;
	createdBy: string;
};
export type ReceiptListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: GoodsReceiptStatus;
	sourceType?: GoodsReceiptSourceType;
};

export type ReceivingStore = {
	createReceipt(
		record: ReceiptCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>>;
	addLine(
		record: ReceiptLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceiptLine>>;
	postReceipt(
		record: ReceiptPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>>;
	cancelReceipt(
		record: ReceiptCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>>;
	recordDiscrepancy(
		record: DiscrepancyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReceivingDiscrepancy>>;
	getReceiptById(
		organizationId: string,
		id: string,
	): Promise<Result<GoodsReceipt | null>>;
	listReceipts(filter: ReceiptListFilter): Promise<Result<GoodsReceipt[]>>;
};
