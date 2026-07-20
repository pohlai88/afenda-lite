import type { Result } from "@afenda/errors/result";

import type { MutationPorts } from "./ports";
import type {
	GoodsReceipt,
	GoodsReceiptLine,
	GoodsReceiptSourceType,
	GoodsReceiptStatus,
	InventoryApplicationStatus,
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
	createIdempotencyKey: string;
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
	quantityExpected: string | null;
	quantityReceived: string;
	quantityAccepted: string;
	quantityRejected: string;
	quantityDamaged: string;
	purchaseOrderLineId: string | null;
	lineIdempotencyKey: string;
	createdBy: string;
};
/** Receiving-owned PO accepted-qty ceiling check enforced inside post TX. */
export type PoConsumptionGuardLine = {
	purchaseOrderLineId: string;
	thisAccepted: number;
	ceiling: number;
};
export type PoConsumptionGuard = {
	purchaseOrderId: string;
	lines: PoConsumptionGuardLine[];
};

export type ReceiptPostRecord = {
	organizationId: string;
	receiptId: string;
	expectedVersion: number;
	actorUserId: string;
	warehouseCode: string;
	warehouseName: string;
	postIdempotencyKey: string;
	lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
	}>;
	/** When set, post TX locks PO consumption and re-validates accepted ceilings. */
	poConsumptionGuard?: PoConsumptionGuard;
};
export type ReceiptCancelRecord = {
	organizationId: string;
	receiptId: string;
	expectedVersion: number;
	actorUserId: string;
	cancelIdempotencyKey: string;
};
export type ReceiptReverseRecord = {
	organizationId: string;
	originalReceiptId: string;
	expectedVersion: number;
	actorUserId: string;
	reason: string;
	reverseIdempotencyKey: string;
	code: string;
	normalizedCode: string;
};
export type ReceiptInventoryApplicationRecord = {
	organizationId: string;
	receiptId: string;
	status: InventoryApplicationStatus;
	inventoryMovementId: string | null;
	errorMessage: string | null;
	actorUserId: string;
};
export type DiscrepancyCreateRecord = {
	organizationId: string;
	receiptId: string;
	receiptLineId: string | null;
	discrepancyType: ReceivingDiscrepancyType;
	quantity: string;
	notes: string | null;
	recordIdempotencyKey: string;
	createdBy: string;
};
export type DiscrepancyResolveRecord = {
	organizationId: string;
	receiptId: string;
	discrepancyId: string;
	expectedVersion: number;
	resolution: string;
	resolveIdempotencyKey: string;
	actorUserId: string;
};
export type ReceiptListFilter = {
	organizationId: string;
	page: number;
	pageSize: number;
	status?: GoodsReceiptStatus;
	sourceType?: GoodsReceiptSourceType;
};
export type PostedAcceptedByPoLine = {
	purchaseOrderLineId: string;
	acceptedQuantity: number;
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
	reverseReceipt(
		record: ReceiptReverseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<GoodsReceipt>>;
	setInventoryApplication(
		record: ReceiptInventoryApplicationRecord,
	): Promise<Result<GoodsReceipt>>;
	recordDiscrepancy(
		record: DiscrepancyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReceivingDiscrepancy>>;
	resolveDiscrepancy(
		record: DiscrepancyResolveRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReceivingDiscrepancy>>;
	sumPostedAcceptedByPoLines(
		organizationId: string,
		purchaseOrderId: string,
		purchaseOrderLineIds: readonly string[],
		excludeReceiptId?: string,
	): Promise<Result<PostedAcceptedByPoLine[]>>;
	getReceiptById(
		organizationId: string,
		id: string,
	): Promise<Result<GoodsReceipt | null>>;
	getReceiptByCreateIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<Result<GoodsReceipt | null>>;
	listReceipts(filter: ReceiptListFilter): Promise<Result<GoodsReceipt[]>>;
	listInventoryExceptions(
		filter: ReceiptListFilter,
	): Promise<Result<GoodsReceipt[]>>;
};
