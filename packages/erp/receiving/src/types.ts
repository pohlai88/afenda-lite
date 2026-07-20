export const GOODS_RECEIPT_STATUSES = ["draft", "posted", "cancelled"] as const;
export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUSES)[number];

/** V1 supports purchase_order receipts only. */
export const GOODS_RECEIPT_SOURCE_TYPES = ["purchase_order"] as const;
export type GoodsReceiptSourceType =
	(typeof GOODS_RECEIPT_SOURCE_TYPES)[number];

export type GoodsReceiptSource = {
	kind: "purchase_order";
	purchaseOrderId: string;
};

export const INVENTORY_APPLICATION_STATUSES = [
	"not_applicable",
	"pending",
	"applied",
	"failed",
] as const;
export type InventoryApplicationStatus =
	(typeof INVENTORY_APPLICATION_STATUSES)[number];

export const RECEIVING_DISCREPANCY_TYPES = [
	"short_quantity",
	"excess_quantity",
	"damaged",
	"quality_failure",
	"wrong_item",
	"wrong_uom",
	"documentation",
	"temperature",
	"other",
] as const;
export type ReceivingDiscrepancyType =
	(typeof RECEIVING_DISCREPANCY_TYPES)[number];

export const RECEIVING_DISCREPANCY_STATUSES = ["open", "resolved"] as const;
export type ReceivingDiscrepancyStatus =
	(typeof RECEIVING_DISCREPANCY_STATUSES)[number];

export type GoodsReceiptLine = {
	id: string;
	organizationId: string;
	receiptId: string;
	lineNo: number;
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
	lineIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type ReceivingDiscrepancy = {
	id: string;
	organizationId: string;
	receiptId: string;
	receiptLineId: string | null;
	discrepancyType: ReceivingDiscrepancyType;
	quantity: string;
	notes: string | null;
	status: ReceivingDiscrepancyStatus;
	resolution: string | null;
	resolvedAt: Date | null;
	resolvedBy: string | null;
	recordIdempotencyKey: string | null;
	resolveIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type GoodsReceipt = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	status: GoodsReceiptStatus;
	sourceType: GoodsReceiptSourceType;
	sourceId: string | null;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	notes: string | null;
	reversesReceiptId: string | null;
	reversedByReceiptId: string | null;
	reverseReason: string | null;
	inventoryApplicationStatus: InventoryApplicationStatus;
	inventoryMovementId: string | null;
	inventoryApplicationError: string | null;
	createIdempotencyKey: string | null;
	postIdempotencyKey: string | null;
	cancelIdempotencyKey: string | null;
	reverseIdempotencyKey: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: GoodsReceiptLine[];
	discrepancies: ReceivingDiscrepancy[];
};
