/** Feed Farm Trade Excel import types (ADR-003). */

export const FFT_IMPORT_TYPES = [
  "customer_priority",
  "product_supply",
  "bulk_order",
  "deposit_record",
  "pickup_confirmation",
] as const;

export type FftImportType = (typeof FFT_IMPORT_TYPES)[number];

export const FFT_IMPORT_TYPE_PERMISSION: Record<
  FftImportType,
  string
> = {
  customer_priority: "priority.manage",
  product_supply: "supply.manage",
  bulk_order: "order.create",
  deposit_record: "deposit.manage",
  pickup_confirmation: "pickup.manage",
};

export const FFT_IMPORT_MAX_ROWS: Record<FftImportType, number> = {
  customer_priority: 5000,
  product_supply: 5000,
  bulk_order: 2000,
  deposit_record: 2000,
  pickup_confirmation: 2000,
};

export type FftImportBatchStatus =
  | "dry_run"
  | "committed"
  | "cancelled"
  | "failed";

export type FftImportRowWriteStatus =
  | "pending"
  | "committed"
  | "skipped"
  | "failed";

export type CustomerPriorityImportRow = {
  customerName: string;
  customerCode?: string;
  priorityRank: number;
  priorityGroup?: string;
};

export type ProductSupplyImportRow = {
  productCode?: string;
  productName?: string;
  unit?: string;
  tentativeQuantity?: number;
  finalConfirmedQuantity?: number;
};

export type BulkOrderImportRow = {
  customerName: string;
  customerCode?: string;
  productCode?: string;
  productName?: string;
  requestedQuantity: number;
  remarks?: string;
};

export type DepositRecordImportRow = {
  orderNumber: string;
  amount: number;
  reference?: string;
  paidAt?: string;
};

export type PickupConfirmationImportRow = {
  orderNumber: string;
  fulfilledQuantity: number;
  finalSupport?: number;
};

export type ImportRowPayload =
  | CustomerPriorityImportRow
  | ProductSupplyImportRow
  | BulkOrderImportRow
  | DepositRecordImportRow
  | PickupConfirmationImportRow;

export type FftImportBatch = {
  id: string;
  eventId: string;
  importType: FftImportType;
  filename: string;
  status: FftImportBatchStatus;
  actorId: string;
  rowCount: number;
  validCount: number;
  errorCount: number;
  committedAt: Date | null;
  createdAt: Date;
};

export type FftImportRow = {
  id: string;
  batchId: string;
  rowNumber: number;
  payloadJson: Record<string, unknown>;
  validationErrors: string[];
  writeStatus: FftImportRowWriteStatus;
  createdAt: Date;
};

export type ImportDryRunSummary = {
  batchId: string;
  rowCount: number;
  validCount: number;
  errorCount: number;
  rows: Array<{
    rowNumber: number;
    validationErrors: string[];
    payload: Record<string, unknown>;
  }>;
};
