import type { Result } from "@afenda/errors";
import type {
	GoodsReceipt,
	GoodsReceiptLine,
	GoodsReceiptSourceType,
	GoodsReceiptStatus,
	InventoryApplicationStatus,
	ReceivingDiscrepancy,
	ReceivingDiscrepancyType,
} from "../../kernel/contracts/domain";
import type { MutationPorts } from "../../kernel/contracts/ports";

export interface ReceiptCreateRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	normalizedCode: string;
	notes: string | null;
	organizationId: string;
	sourceId: string | null;
	sourceType: GoodsReceiptSourceType;
	warehouseCode: string;
	warehouseId: string;
	warehouseName: string;
}
export interface ReceiptLineCreateRecord {
	baseUomCode: string;
	baseUomId: string;
	createdBy: string;
	itemCode: string;
	itemId: string;
	itemName: string;
	lineIdempotencyKey: string;
	organizationId: string;
	purchaseOrderLineId: string | null;
	quantityAccepted: string;
	quantityDamaged: string;
	quantityExpected: string | null;
	quantityOrdered: string | null;
	quantityReceived: string;
	quantityRejected: string;
	receiptId: string;
}
/** Receiving-owned PO accepted-qty ceiling check enforced inside post TX. */
export interface PoConsumptionGuardLine {
	ceiling: number;
	purchaseOrderLineId: string;
	thisAccepted: number;
}
export interface PoConsumptionGuard {
	lines: PoConsumptionGuardLine[];
	purchaseOrderId: string;
}

export interface ReceiptPostRecord {
	actorUserId: string;
	expectedVersion: number;
	lineSnapshots: Array<{
		lineId: string;
		itemCode: string;
		itemName: string;
		baseUomId: string;
		baseUomCode: string;
	}>;
	organizationId: string;
	/** When set, post TX locks PO consumption and re-validates accepted ceilings. */
	poConsumptionGuard?: PoConsumptionGuard | undefined;
	postIdempotencyKey: string;
	receiptId: string;
	warehouseCode: string;
	warehouseName: string;
}
export interface ReceiptCancelRecord {
	actorUserId: string;
	cancelIdempotencyKey: string;
	expectedVersion: number;
	organizationId: string;
	receiptId: string;
}
export interface ReceiptReverseRecord {
	actorUserId: string;
	code: string;
	expectedVersion: number;
	normalizedCode: string;
	organizationId: string;
	originalReceiptId: string;
	reason: string;
	reverseIdempotencyKey: string;
}
export interface ReceiptInventoryApplicationRecord {
	actorUserId: string;
	errorMessage: string | null;
	inventoryMovementId: string | null;
	organizationId: string;
	receiptId: string;
	status: InventoryApplicationStatus;
}
export interface DiscrepancyCreateRecord {
	createdBy: string;
	discrepancyType: ReceivingDiscrepancyType;
	notes: string | null;
	organizationId: string;
	quantity: string;
	receiptId: string;
	receiptLineId: string | null;
	recordIdempotencyKey: string;
}
export interface DiscrepancyResolveRecord {
	actorUserId: string;
	discrepancyId: string;
	expectedVersion: number;
	organizationId: string;
	receiptId: string;
	resolution: string;
	resolveIdempotencyKey: string;
}
export interface ReceiptListFilter {
	organizationId: string;
	page: number;
	pageSize: number;
	sourceType?: GoodsReceiptSourceType | undefined;
	status?: GoodsReceiptStatus | undefined;
}
export interface PostedAcceptedByPoLine {
	acceptedQuantity: number;
	purchaseOrderLineId: string;
}

export interface ReceivingStore {
	addLine: (
		record: ReceiptLineCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<GoodsReceiptLine>>;
	cancelReceipt: (
		record: ReceiptCancelRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<GoodsReceipt>>;
	createReceipt: (
		record: ReceiptCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<GoodsReceipt>>;
	getReceiptByCreateIdempotencyKey: (
		organizationId: string,
		idempotencyKey: string,
	) => Promise<Result<GoodsReceipt | null>>;
	getReceiptById: (
		organizationId: string,
		id: string,
	) => Promise<Result<GoodsReceipt | null>>;
	listInventoryExceptions: (
		filter: ReceiptListFilter,
	) => Promise<Result<GoodsReceipt[]>>;
	listReceipts: (filter: ReceiptListFilter) => Promise<Result<GoodsReceipt[]>>;
	postReceipt: (
		record: ReceiptPostRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<GoodsReceipt>>;
	recordDiscrepancy: (
		record: DiscrepancyCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ReceivingDiscrepancy>>;
	resolveDiscrepancy: (
		record: DiscrepancyResolveRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<ReceivingDiscrepancy>>;
	reverseReceipt: (
		record: ReceiptReverseRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	) => Promise<Result<GoodsReceipt>>;
	setInventoryApplication: (
		record: ReceiptInventoryApplicationRecord,
	) => Promise<Result<GoodsReceipt>>;
	sumPostedAcceptedByPoLines: (
		organizationId: string,
		purchaseOrderId: string,
		purchaseOrderLineIds: readonly string[],
		excludeReceiptId?: string,
	) => Promise<Result<PostedAcceptedByPoLine[]>>;
}
