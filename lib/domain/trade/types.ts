export const HOT_SALES_EVENT_STATUSES = [
  "draft",
  "scheduled",
  "open",
  "closed",
  "allocating",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type HotSalesEventStatus = (typeof HOT_SALES_EVENT_STATUSES)[number];

export const HOT_SALES_ORDER_STATUSES = [
  "submitted",
  "registered",
  "pending_allocation",
  "partial",
  "full",
  "rejected",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type HotSalesOrderStatus = (typeof HOT_SALES_ORDER_STATUSES)[number];

export const HOT_SALES_DEPOSIT_STATUSES = [
  "not_required",
  "pending",
  "paid",
  "partially_paid",
  "waived",
  "forfeited",
  "refunded",
  "cancelled",
] as const;

export type HotSalesDepositStatus = (typeof HOT_SALES_DEPOSIT_STATUSES)[number];

export const HOT_SALES_TRANSFER_STATUSES = [
  "none",
  "requested",
  "approved",
  "rejected",
] as const;

export type HotSalesTransferStatus = (typeof HOT_SALES_TRANSFER_STATUSES)[number];

export const HOT_SALES_FIELD_TYPES = [
  "text",
  "number",
  "currency",
  "date",
  "datetime",
  "select",
  "boolean",
  "long_text",
] as const;

export type HotSalesFieldType = (typeof HOT_SALES_FIELD_TYPES)[number];

export const HOT_SALES_ALLOCATION_MODES = ["auto", "manual", "rerun"] as const;

export type HotSalesAllocationMode = (typeof HOT_SALES_ALLOCATION_MODES)[number];

export type HotSalesEvent = {
  id: string;
  eventCode: string;
  eventName: string;
  eventType: string;
  descriptionEn: string | null;
  descriptionVi: string | null;
  opensAt: Date;
  closesAt: Date;
  timezone: string;
  status: HotSalesEventStatus;
  sourceLocation: string | null;
  allocationMethod: string;
  standaloneProgram: boolean;
  combinationAllowed: boolean;
  transferAllowed: boolean;
  depositRequired: boolean;
  depositRefundable: boolean;
  supportType: string;
  supportAmountPerUnit: number | null;
  supportUnitLabel: string | null;
  isTemplate: boolean;
  clonedFromId: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HotSalesProduct = {
  id: string;
  eventId: string;
  productName: string;
  productCode: string | null;
  source: string | null;
  batch: string | null;
  category: string | null;
  weight: string | null;
  unit: string;
  tentativeQuantity: number | null;
  finalConfirmedQuantity: number | null;
  allocatedQuantity: number;
  fulfilledQuantity: number;
  supportAmountPerUnit: number | null;
  pickupLocation: string | null;
  sortOrder: number;
  attrs: Record<string, unknown>;
};

export type HotSalesFieldDef = {
  id: string;
  eventId: string;
  entityType: string;
  fieldKey: string;
  fieldType: HotSalesFieldType;
  required: boolean;
  defaultValue: string | null;
  labelEn: string;
  labelVi: string;
  helpTextEn: string | null;
  helpTextVi: string | null;
  dropdownOptions: string[] | null;
  visibleToRoles: string[];
  editableByRoles: string[];
  displayOrder: number;
  active: boolean;
};

export type HotSalesCustomerPriority = {
  id: string;
  eventId: string;
  customerName: string;
  customerCode: string | null;
  priorityRank: number;
  priorityGroup: string | null;
  salespersonUserId: string | null;
  maxAllocation: number | null;
  remarks: string | null;
};

export type HotSalesOrder = {
  id: string;
  eventId: string;
  orderNumber: string;
  salespersonUserId: string;
  salespersonEmail: string;
  customerName: string;
  customerCode: string | null;
  priorityRank: number;
  priorityGroup: string | null;
  productId: string;
  requestedQuantity: number;
  confirmedQuantity: number | null;
  fulfilledQuantity: number | null;
  estimatedSupport: number | null;
  finalSupport: number | null;
  registeredAt: Date;
  status: HotSalesOrderStatus;
  depositStatus: HotSalesDepositStatus;
  pickupStatus: string;
  transferStatus: HotSalesTransferStatus;
  allocationRunId: string | null;
  attrs: Record<string, unknown>;
  remarks: string | null;
};

export type HotSalesAllocationRun = {
  id: string;
  eventId: string;
  runBy: string;
  runAt: Date;
  mode: HotSalesAllocationMode;
  reason: string | null;
  resultSummary: Record<string, unknown>;
};

export type HotSalesSalesMember = {
  id: string;
  userId: string | null;
  email: string;
  active: boolean;
};

export type HotSalesDepositRecord = {
  id: string;
  orderId: string;
  amount: number | null;
  currency: string;
  dueAt: Date | null;
  status: string;
  nonRefundable: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type HotSalesDepositReceipt = {
  id: string;
  depositId: string;
  reference: string | null;
  paidAt: Date;
  amount: number;
  recordedBy: string;
  createdAt: Date;
};

export type HotSalesDepositAdjustment = {
  id: string;
  depositId: string;
  adjustmentType: string;
  reason: string;
  amount: number | null;
  actorId: string;
  createdAt: Date;
};

export type HotSalesDepositListItem = HotSalesDepositRecord & {
  orderNumber: string;
  customerName: string;
  customerCode: string | null;
  orderDepositStatus: HotSalesDepositStatus;
};

export type HotSalesFinanceAuditEntry = {
  id: string;
  depositId: string | null;
  orderId: string | null;
  action: string;
  actorId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  createdAt: Date;
};

export type HotSalesPickupWindow = {
  id: string;
  eventId: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  capacity: number | null;
  createdAt: Date;
};

export type HotSalesPickupAssignment = {
  id: string;
  orderId: string;
  windowId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type HotSalesPickupListItem = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  confirmedQuantity: number | null;
  fulfilledQuantity: number | null;
  pickupStatus: string;
  orderStatus: string;
  assignmentId: string | null;
  assignmentStatus: string | null;
  windowId: string | null;
};

export type HotSalesFulfillmentRecord = {
  id: string;
  assignmentId: string;
  orderId: string;
  quantity: number;
  actorId: string;
  recordedAt: Date;
};

export type AllocationInputOrder = Pick<
  HotSalesOrder,
  | "id"
  | "productId"
  | "priorityRank"
  | "registeredAt"
  | "requestedQuantity"
  | "status"
>;

export type AllocationResult = {
  orderId: string;
  confirmedQuantity: number;
  status: "full" | "partial" | "rejected";
};

export type AllocationSummary = {
  totalRequested: number;
  totalAllocated: number;
  totalRejected: number;
  results: AllocationResult[];
};
