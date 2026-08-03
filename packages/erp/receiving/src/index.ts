import "server-only";

export { createMasterDataLookupPort } from "./composition/master-lookup";
export { createProductionMutationPorts } from "./composition/production-ports";
export {
	addGoodsReceiptLine,
	cancelGoodsReceipt,
	createDraftGoodsReceipt,
	getGoodsReceiptById,
	listGoodsReceipts,
	listReceivingInventoryExceptions,
	postGoodsReceipt,
	recordReceivingDiscrepancy,
	resolveReceivingDiscrepancy,
	reverseGoodsReceipt,
} from "./facade/capabilities";
export type { ReceivingCommandOptions } from "./facade/contracts";
export {
	createDrizzleReceivingStore,
	DrizzleReceivingStore,
} from "./features/receipts/receipts.drizzle";
export {
	createMemoryReceivingStore,
	MemoryReceivingStore,
} from "./features/receipts/receipts.memory";
export {
	addGoodsReceiptLineInputSchema,
	cancelGoodsReceiptInputSchema,
	createDraftGoodsReceiptInputSchema,
	getGoodsReceiptByIdInputSchema,
	listGoodsReceiptsInputSchema,
	listReceivingInventoryExceptionsInputSchema,
	postGoodsReceiptInputSchema,
	recordReceivingDiscrepancyInputSchema,
	resolveReceivingDiscrepancyInputSchema,
	reverseGoodsReceiptInputSchema,
} from "./features/receipts/receipts.schema";
export type {
	DiscrepancyCreateRecord,
	DiscrepancyResolveRecord,
	PoConsumptionGuard,
	PoConsumptionGuardLine,
	PostedAcceptedByPoLine,
	ReceiptCancelRecord,
	ReceiptCreateRecord,
	ReceiptInventoryApplicationRecord,
	ReceiptLineCreateRecord,
	ReceiptListFilter,
	ReceiptPostRecord,
	ReceiptReverseRecord,
	ReceivingStore,
} from "./features/receipts/receipts.store";
export {
	GOODS_RECEIPT_SOURCE_TYPES,
	GOODS_RECEIPT_STATUSES,
	type GoodsReceipt,
	type GoodsReceiptLine,
	type GoodsReceiptSource,
	type GoodsReceiptSourceType,
	type GoodsReceiptStatus,
	INVENTORY_APPLICATION_STATUSES,
	type InventoryApplicationStatus,
	RECEIVING_DISCREPANCY_STATUSES,
	RECEIVING_DISCREPANCY_TYPES,
	type ReceivingDiscrepancy,
	type ReceivingDiscrepancyStatus,
	type ReceivingDiscrepancyType,
} from "./kernel/contracts/domain";
export type {
	AuditFactInput,
	AuditFactPort,
	MasterLookupPort,
	MutationPorts,
	OutboxFactInput,
	OutboxPort,
	PurchaseOrderReceivingLineSnapshot,
	PurchaseOrderReceivingQueryPort,
	PurchaseOrderReceivingSnapshot,
	PurchaseOrderReceivingStatus,
} from "./kernel/contracts/ports";
export type {
	ReceivingAuthorizationPort,
	ReceivingPermission,
} from "./kernel/execution/authorization";
export {
	RECEIVING_PERMISSION_CODES,
	RECEIVING_PERMISSION_DISCREPANCY_RECORD,
	RECEIVING_PERMISSION_DISCREPANCY_RESOLVE,
	RECEIVING_PERMISSION_RECEIPT_CANCEL,
	RECEIVING_PERMISSION_RECEIPT_CREATE,
	RECEIVING_PERMISSION_RECEIPT_POST,
	RECEIVING_PERMISSION_RECEIPT_READ,
	RECEIVING_PERMISSION_RECEIPT_REVERSE,
	RECEIVING_PERMISSION_RECEIPT_UPDATE,
} from "./kernel/execution/permissions";
export {
	type GoodsReceiptId,
	type GoodsReceiptLineId,
	goodsReceiptIdSchema,
	goodsReceiptLineIdSchema,
	type ReceivingDiscrepancyId,
	receivingDiscrepancyIdSchema,
} from "./kernel/identity/brands";
