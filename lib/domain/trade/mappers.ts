import type {
  HotSalesAllocationRun,
  HotSalesCustomerPriority,
  HotSalesEvent,
  HotSalesFieldDef,
  HotSalesFieldType,
  HotSalesOrder,
  HotSalesProduct,
  HotSalesSalesMember,
} from "@/lib/domain/trade/types";

type EventRow = {
  id: string;
  event_code: string;
  event_name: string;
  event_type: string;
  description_en: string | null;
  description_vi: string | null;
  opens_at: Date;
  closes_at: Date;
  timezone: string;
  status: string;
  source_location: string | null;
  allocation_method: string;
  standalone_program: boolean;
  combination_allowed: boolean;
  transfer_allowed: boolean;
  deposit_required: boolean;
  deposit_refundable: boolean;
  support_type: string;
  support_amount_per_unit: string | null;
  support_unit_label: string | null;
  is_template: boolean;
  cloned_from_id: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export function mapEventRow(row: EventRow): HotSalesEvent {
  return {
    id: row.id,
    eventCode: row.event_code,
    eventName: row.event_name,
    eventType: row.event_type,
    descriptionEn: row.description_en,
    descriptionVi: row.description_vi,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    timezone: row.timezone,
    status: row.status as HotSalesEvent["status"],
    sourceLocation: row.source_location,
    allocationMethod: row.allocation_method,
    standaloneProgram: row.standalone_program,
    combinationAllowed: row.combination_allowed,
    transferAllowed: row.transfer_allowed,
    depositRequired: row.deposit_required,
    depositRefundable: row.deposit_refundable,
    supportType: row.support_type,
    supportAmountPerUnit: row.support_amount_per_unit
      ? Number(row.support_amount_per_unit)
      : null,
    supportUnitLabel: row.support_unit_label,
    isTemplate: row.is_template,
    clonedFromId: row.cloned_from_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ProductRow = {
  id: string;
  event_id: string;
  product_name: string;
  product_code: string | null;
  source: string | null;
  batch: string | null;
  category: string | null;
  weight: string | null;
  unit: string;
  tentative_quantity: string | null;
  final_confirmed_quantity: string | null;
  allocated_quantity: string;
  fulfilled_quantity: string;
  support_amount_per_unit: string | null;
  pickup_location: string | null;
  sort_order: number;
  attrs: Record<string, unknown>;
};

export function mapProductRow(row: ProductRow): HotSalesProduct {
  return {
    id: row.id,
    eventId: row.event_id,
    productName: row.product_name,
    productCode: row.product_code,
    source: row.source,
    batch: row.batch,
    category: row.category,
    weight: row.weight,
    unit: row.unit,
    tentativeQuantity: row.tentative_quantity
      ? Number(row.tentative_quantity)
      : null,
    finalConfirmedQuantity: row.final_confirmed_quantity
      ? Number(row.final_confirmed_quantity)
      : null,
    allocatedQuantity: Number(row.allocated_quantity),
    fulfilledQuantity: Number(row.fulfilled_quantity),
    supportAmountPerUnit: row.support_amount_per_unit
      ? Number(row.support_amount_per_unit)
      : null,
    pickupLocation: row.pickup_location,
    sortOrder: row.sort_order,
    attrs: row.attrs ?? {},
  };
}

type FieldDefRow = {
  id: string;
  event_id: string;
  entity_type: string;
  field_key: string;
  field_type: string;
  required: boolean;
  default_value: string | null;
  label_en: string;
  label_vi: string;
  help_text_en: string | null;
  help_text_vi: string | null;
  dropdown_options: string[] | null;
  visible_to_roles: string[];
  editable_by_roles: string[];
  display_order: number;
  active: boolean;
};

export function mapFieldDefRow(row: FieldDefRow): HotSalesFieldDef {
  return {
    id: row.id,
    eventId: row.event_id,
    entityType: row.entity_type,
    fieldKey: row.field_key,
    fieldType: row.field_type as HotSalesFieldType,
    required: row.required,
    defaultValue: row.default_value,
    labelEn: row.label_en,
    labelVi: row.label_vi,
    helpTextEn: row.help_text_en,
    helpTextVi: row.help_text_vi,
    dropdownOptions: row.dropdown_options,
    visibleToRoles: row.visible_to_roles,
    editableByRoles: row.editable_by_roles,
    displayOrder: row.display_order,
    active: row.active,
  };
}

type OrderRow = {
  id: string;
  event_id: string;
  order_number: string;
  salesperson_user_id: string;
  salesperson_email: string;
  customer_name: string;
  customer_code: string | null;
  priority_rank: number;
  priority_group: string | null;
  product_id: string;
  requested_quantity: string;
  confirmed_quantity: string | null;
  fulfilled_quantity: string | null;
  estimated_support: string | null;
  final_support: string | null;
  registered_at: Date;
  status: string;
  deposit_status: string;
  pickup_status: string;
  transfer_status: string;
  allocation_run_id: string | null;
  attrs: Record<string, unknown>;
  remarks: string | null;
};

export function mapOrderRow(row: OrderRow): HotSalesOrder {
  return {
    id: row.id,
    eventId: row.event_id,
    orderNumber: row.order_number,
    salespersonUserId: row.salesperson_user_id,
    salespersonEmail: row.salesperson_email,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    priorityRank: row.priority_rank,
    priorityGroup: row.priority_group,
    productId: row.product_id,
    requestedQuantity: Number(row.requested_quantity),
    confirmedQuantity: row.confirmed_quantity
      ? Number(row.confirmed_quantity)
      : null,
    fulfilledQuantity: row.fulfilled_quantity
      ? Number(row.fulfilled_quantity)
      : null,
    estimatedSupport: row.estimated_support
      ? Number(row.estimated_support)
      : null,
    finalSupport: row.final_support ? Number(row.final_support) : null,
    registeredAt: row.registered_at,
    status: row.status as HotSalesOrder["status"],
    depositStatus: row.deposit_status as HotSalesOrder["depositStatus"],
    pickupStatus: row.pickup_status,
    transferStatus: row.transfer_status as HotSalesOrder["transferStatus"],
    allocationRunId: row.allocation_run_id,
    attrs: row.attrs ?? {},
    remarks: row.remarks,
  };
}

type PriorityRow = {
  id: string;
  event_id: string;
  customer_name: string;
  customer_code: string | null;
  priority_rank: number;
  priority_group: string | null;
  salesperson_user_id: string | null;
  max_allocation: string | null;
  remarks: string | null;
};

export function mapPriorityRow(row: PriorityRow): HotSalesCustomerPriority {
  return {
    id: row.id,
    eventId: row.event_id,
    customerName: row.customer_name,
    customerCode: row.customer_code,
    priorityRank: row.priority_rank,
    priorityGroup: row.priority_group,
    salespersonUserId: row.salesperson_user_id,
    maxAllocation: row.max_allocation ? Number(row.max_allocation) : null,
    remarks: row.remarks,
  };
}

type SalesMemberRow = {
  id: string;
  user_id: string | null;
  email: string;
  active: boolean;
};

export function mapSalesMemberRow(row: SalesMemberRow): HotSalesSalesMember {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    active: row.active,
  };
}

type AllocationRunRow = {
  id: string;
  event_id: string;
  run_by: string;
  run_at: Date;
  mode: string;
  reason: string | null;
  result_summary: Record<string, unknown>;
};

export function mapAllocationRunRow(row: AllocationRunRow): HotSalesAllocationRun {
  return {
    id: row.id,
    eventId: row.event_id,
    runBy: row.run_by,
    runAt: row.run_at,
    mode: row.mode as HotSalesAllocationRun["mode"],
    reason: row.reason,
    resultSummary: row.result_summary ?? {},
  };
}

export function resolvePriorityForCustomer(
  priorities: HotSalesCustomerPriority[],
  customerCode: string | null,
  customerName: string,
): { priorityRank: number; priorityGroup: string | null } {
  const normalizedCode = customerCode?.trim().toLowerCase();
  const match = priorities.find((p) => {
    if (normalizedCode && p.customerCode?.trim().toLowerCase() === normalizedCode) {
      return true;
    }
    return p.customerName.trim().toLowerCase() === customerName.trim().toLowerCase();
  });

  if (match) {
    return {
      priorityRank: match.priorityRank,
      priorityGroup: match.priorityGroup,
    };
  }

  return { priorityRank: 999, priorityGroup: "P4" };
}
