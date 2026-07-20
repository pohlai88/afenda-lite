export const GOODS_RECEIPT_STATUSES = ["draft", "posted", "cancelled"] as const;
export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUSES)[number];

export const GOODS_RECEIPT_SOURCE_TYPES = [
	"purchase_order",
	"expected_receipt",
	"return_shipment",
	"unplanned",
] as const;
export type GoodsReceiptSourceType =
	(typeof GOODS_RECEIPT_SOURCE_TYPES)[number];

export const RECEIVING_DISCREPANCY_TYPES = [
	"shortfall",
	"overage",
	"damage",
	"wrong_item",
	"other",
] as const;
export type ReceivingDiscrepancyType =
	(typeof RECEIVING_DISCREPANCY_TYPES)[number];

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
	quantityReceived: string;
	purchaseOrderLineId: string | null;
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
