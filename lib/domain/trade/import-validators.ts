import type {
  BulkOrderImportRow,
  CustomerPriorityImportRow,
  DepositRecordImportRow,
  HotSalesImportType,
  PickupConfirmationImportRow,
  ProductSupplyImportRow,
} from "@/lib/domain/trade/import-types";
import { HOT_SALES_IMPORT_MAX_ROWS } from "@/lib/domain/trade/import-types";

export type ImportValidationContext = {
  importType: HotSalesImportType;
  existingProductCodes?: Set<string>;
  existingProductNames?: Set<string>;
  productIdByCode?: Map<string, string>;
  productIdByName?: Map<string, string>;
  existingOrderNumbers?: Set<string>;
  eventOpenForOrders?: boolean;
  depositFeatureEnabled?: boolean;
  pickupFeatureEnabled?: boolean;
};

export type ValidatedImportRow<T> = {
  rowNumber: number;
  payload: T;
  validationErrors: string[];
};

function normalizeKey(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function validateCustomerPriorityRows(
  rows: Array<{ rowNumber: number; payload: CustomerPriorityImportRow }>,
): ValidatedImportRow<CustomerPriorityImportRow>[] {
  const seenCodes = new Map<string, number>();
  const seenNames = new Map<string, number>();

  return rows.map(({ rowNumber, payload }) => {
    const errors: string[] = [];
    const name = payload.customerName?.trim() ?? "";
    const code = payload.customerCode?.trim() ?? "";
    const rank = payload.priorityRank;

    if (!name) {
      errors.push("customer_name_required");
    }
    if (!Number.isFinite(rank) || rank < 1) {
      errors.push("priority_rank_invalid");
    }

    if (code) {
      const key = normalizeKey(code);
      const dup = seenCodes.get(key);
      if (dup != null) {
        errors.push(`duplicate_customer_code_row_${dup}`);
      } else {
        seenCodes.set(key, rowNumber);
      }
    }

    if (name) {
      const key = normalizeKey(name);
      const dup = seenNames.get(key);
      if (dup != null) {
        errors.push(`duplicate_customer_name_row_${dup}`);
      } else {
        seenNames.set(key, rowNumber);
      }
    }

    return {
      rowNumber,
      payload: {
        customerName: name,
        customerCode: code || undefined,
        priorityRank: Number.isFinite(rank) ? Math.trunc(rank) : 999,
        priorityGroup: payload.priorityGroup?.trim() || undefined,
      },
      validationErrors: errors,
    };
  });
}

export function validateProductSupplyRows(
  rows: Array<{ rowNumber: number; payload: ProductSupplyImportRow }>,
  ctx: Pick<ImportValidationContext, "existingProductCodes" | "existingProductNames">,
): ValidatedImportRow<ProductSupplyImportRow>[] {
  const codes = ctx.existingProductCodes ?? new Set<string>();
  const names = ctx.existingProductNames ?? new Set<string>();
  const seenCodes = new Map<string, number>();
  const seenNames = new Map<string, number>();

  return rows.map(({ rowNumber, payload }) => {
    const errors: string[] = [];
    const code = payload.productCode?.trim() ?? "";
    const name = payload.productName?.trim() ?? "";
    const tentative = payload.tentativeQuantity;
    const finalQty = payload.finalConfirmedQuantity;

    if (!code && !name) {
      errors.push("product_code_or_name_required");
    }

    if (code) {
      const key = normalizeKey(code);
      const dup = seenCodes.get(key);
      if (dup != null) {
        errors.push(`duplicate_product_code_row_${dup}`);
      } else {
        seenCodes.set(key, rowNumber);
      }
      if (!codes.has(key)) {
        errors.push("unknown_product_code");
      }
    } else if (name) {
      const key = normalizeKey(name);
      const dup = seenNames.get(key);
      if (dup != null) {
        errors.push(`duplicate_product_name_row_${dup}`);
      } else {
        seenNames.set(key, rowNumber);
      }
      if (!names.has(key)) {
        errors.push("unknown_product_name");
      }
    }

    const hasTentative = tentative != null && Number.isFinite(tentative);
    const hasFinal = finalQty != null && Number.isFinite(finalQty);
    if (!hasTentative && !hasFinal) {
      errors.push("quantity_required");
    }
    if (hasTentative && tentative! < 0) {
      errors.push("tentative_quantity_negative");
    }
    if (hasFinal && finalQty! < 0) {
      errors.push("final_quantity_negative");
    }

    return {
      rowNumber,
      payload: {
        productCode: code || undefined,
        productName: name || undefined,
        unit: payload.unit?.trim() || undefined,
        tentativeQuantity: hasTentative ? tentative : undefined,
        finalConfirmedQuantity: hasFinal ? finalQty : undefined,
      },
      validationErrors: errors,
    };
  });
}

export function assertImportRowLimit(
  importType: HotSalesImportType,
  rowCount: number,
): { ok: true } | { ok: false; error: string; maxRows: number } {
  const maxRows = HOT_SALES_IMPORT_MAX_ROWS[importType];
  if (rowCount > maxRows) {
    return { ok: false, error: "row_limit_exceeded", maxRows };
  }
  if (rowCount === 0) {
    return { ok: false, error: "empty_file", maxRows };
  }
  return { ok: true };
}

export function validateBulkOrderRows(
  rows: Array<{ rowNumber: number; payload: BulkOrderImportRow }>,
  ctx: Pick<
    ImportValidationContext,
    | "existingProductCodes"
    | "existingProductNames"
    | "productIdByCode"
    | "productIdByName"
    | "eventOpenForOrders"
  >,
): ValidatedImportRow<BulkOrderImportRow>[] {
  const seenKeys = new Map<string, number>();

  return rows.map(({ rowNumber, payload }) => {
    const errors: string[] = [];
    const name = payload.customerName?.trim() ?? "";
    const code = payload.customerCode?.trim() ?? "";
    const productCode = payload.productCode?.trim() ?? "";
    const productName = payload.productName?.trim() ?? "";
    const qty = payload.requestedQuantity;

    if (ctx.eventOpenForOrders === false) {
      errors.push("event_not_open");
    }
    if (!name) errors.push("customer_name_required");
    if (!productCode && !productName) errors.push("product_code_or_name_required");
    if (!Number.isFinite(qty) || qty <= 0) errors.push("requested_quantity_invalid");

    let productKey = "";
    if (productCode) {
      const key = normalizeKey(productCode);
      productKey = `code:${key}`;
      if (!ctx.existingProductCodes?.has(key)) errors.push("unknown_product_code");
    } else if (productName) {
      const key = normalizeKey(productName);
      productKey = `name:${key}`;
      if (!ctx.existingProductNames?.has(key)) errors.push("unknown_product_name");
    }

    const customerKey = code ? normalizeKey(code) : normalizeKey(name);
    const dupKey = `${customerKey}|${productKey}`;
    const dup = seenKeys.get(dupKey);
    if (dup != null) errors.push(`duplicate_order_row_${dup}`);
    else if (productKey) seenKeys.set(dupKey, rowNumber);

    return {
      rowNumber,
      payload: {
        customerName: name,
        customerCode: code || undefined,
        productCode: productCode || undefined,
        productName: productName || undefined,
        requestedQuantity: Number.isFinite(qty) ? qty : 0,
        remarks: payload.remarks?.trim() || undefined,
      },
      validationErrors: errors,
    };
  });
}

export function validateDepositRecordRows(
  rows: Array<{ rowNumber: number; payload: DepositRecordImportRow }>,
  ctx: Pick<ImportValidationContext, "existingOrderNumbers" | "depositFeatureEnabled">,
): ValidatedImportRow<DepositRecordImportRow>[] {
  const seenOrders = new Map<string, number>();

  return rows.map(({ rowNumber, payload }) => {
    const errors: string[] = [];
    const orderNumber = payload.orderNumber?.trim() ?? "";
    const amount = payload.amount;

    if (ctx.depositFeatureEnabled === false) errors.push("deposit_feature_disabled");
    if (!orderNumber) errors.push("order_number_required");
    if (!Number.isFinite(amount) || amount <= 0) errors.push("amount_invalid");

    if (orderNumber) {
      const key = normalizeKey(orderNumber);
      const dup = seenOrders.get(key);
      if (dup != null) errors.push(`duplicate_order_number_row_${dup}`);
      else seenOrders.set(key, rowNumber);
      if (!ctx.existingOrderNumbers?.has(key)) errors.push("unknown_order_number");
    }

    return {
      rowNumber,
      payload: {
        orderNumber,
        amount: Number.isFinite(amount) ? amount : 0,
        reference: payload.reference?.trim() || undefined,
        paidAt: payload.paidAt?.trim() || undefined,
      },
      validationErrors: errors,
    };
  });
}

export function validatePickupConfirmationRows(
  rows: Array<{ rowNumber: number; payload: PickupConfirmationImportRow }>,
  ctx: Pick<ImportValidationContext, "existingOrderNumbers" | "pickupFeatureEnabled">,
): ValidatedImportRow<PickupConfirmationImportRow>[] {
  const seenOrders = new Map<string, number>();

  return rows.map(({ rowNumber, payload }) => {
    const errors: string[] = [];
    const orderNumber = payload.orderNumber?.trim() ?? "";
    const qty = payload.fulfilledQuantity;
    const support = payload.finalSupport;

    if (ctx.pickupFeatureEnabled === false) errors.push("pickup_feature_disabled");
    if (!orderNumber) errors.push("order_number_required");
    if (!Number.isFinite(qty) || qty <= 0) errors.push("fulfilled_quantity_invalid");
    if (support != null && (!Number.isFinite(support) || support < 0)) {
      errors.push("final_support_invalid");
    }

    if (orderNumber) {
      const key = normalizeKey(orderNumber);
      const dup = seenOrders.get(key);
      if (dup != null) errors.push(`duplicate_order_number_row_${dup}`);
      else seenOrders.set(key, rowNumber);
      if (!ctx.existingOrderNumbers?.has(key)) errors.push("unknown_order_number");
    }

    return {
      rowNumber,
      payload: {
        orderNumber,
        fulfilledQuantity: Number.isFinite(qty) ? qty : 0,
        finalSupport: support != null && Number.isFinite(support) ? support : undefined,
      },
      validationErrors: errors,
    };
  });
}
