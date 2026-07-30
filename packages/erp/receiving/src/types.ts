export const GOODS_RECEIPT_STATUSES = ["draft", "posted", "cancelled"] as const;
export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUSES)[number];

/** V1 supports purchase_order receipts only. */
export const GOODS_RECEIPT_SOURCE_TYPES = ["purchase_order"] as const;
export type GoodsReceiptSourceType =
	(typeof GOODS_RECEIPT_SOURCE_TYPES)[number];

export interface GoodsReceiptSource {
	kind: "purchase_order";
	purchaseOrderId: string;
}

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

export interface GoodsReceiptLine {
	baseUomCode: string;
	baseUomId: string;
	createdAt: Date;
	createdBy: string;
	id: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineIdempotencyKey: string | null;
	lineNo: number;
	organizationId: string;
	purchaseOrderLineId: string | null;
	quantityAccepted: string;
	quantityDamaged: string;
	quantityExpected: string | null;
	quantityOrdered: string | null;
	quantityReceived: string;
	quantityRejected: string;
	receiptId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface ReceivingDiscrepancy {
	createdAt: Date;
	createdBy: string;
	discrepancyType: ReceivingDiscrepancyType;
	id: string;
	notes: string | null;
	organizationId: string;
	quantity: string;
	receiptId: string;
	receiptLineId: string | null;
	recordIdempotencyKey: string | null;
	resolution: string | null;
	resolvedAt: Date | null;
	resolvedBy: string | null;
	resolveIdempotencyKey: string | null;
	status: ReceivingDiscrepancyStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface GoodsReceipt {
	cancelIdempotencyKey: string | null;
	cancelledAt: Date | null;
	cancelledBy: string | null;
	code: string;
	createdAt: Date;
	createdBy: string;
	createIdempotencyKey: string | null;
	discrepancies: ReceivingDiscrepancy[];
	id: string;
	inventoryApplicationError: string | null;
	inventoryApplicationStatus: InventoryApplicationStatus;
	inventoryMovementId: string | null;
	lines: GoodsReceiptLine[];
	normalizedCode: string;
	notes: string | null;
	organizationId: string;
	postedAt: Date | null;
	postedBy: string | null;
	postIdempotencyKey: string | null;
	reversedByReceiptId: string | null;
	reverseIdempotencyKey: string | null;
	reverseReason: string | null;
	reversesReceiptId: string | null;
	sourceId: string | null;
	sourceType: GoodsReceiptSourceType;
	status: GoodsReceiptStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	warehouseCode: string;
	warehouseId: string;
	warehouseName: string;
}
