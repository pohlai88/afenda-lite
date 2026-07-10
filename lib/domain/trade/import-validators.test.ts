import { describe, expect, it } from "vitest";
import {
  assertImportRowLimit,
  validateBulkOrderRows,
  validateCustomerPriorityRows,
  validateDepositRecordRows,
  validateProductSupplyRows,
} from "@/lib/domain/trade/import-validators";

describe("validateCustomerPriorityRows", () => {
  it("flags missing name and invalid rank", () => {
    const result = validateCustomerPriorityRows([
      { rowNumber: 2, payload: { customerName: "", priorityRank: 0 } },
    ]);
    expect(result[0]?.validationErrors).toContain("customer_name_required");
    expect(result[0]?.validationErrors).toContain("priority_rank_invalid");
  });

  it("detects duplicate customer codes within batch", () => {
    const result = validateCustomerPriorityRows([
      {
        rowNumber: 2,
        payload: { customerName: "A", customerCode: "X", priorityRank: 1 },
      },
      {
        rowNumber: 3,
        payload: { customerName: "B", customerCode: "X", priorityRank: 2 },
      },
    ]);
    expect(result[1]?.validationErrors).toContain("duplicate_customer_code_row_2");
  });
});

describe("validateProductSupplyRows", () => {
  const ctx = {
    existingProductCodes: new Set(["sku-1"]),
    existingProductNames: new Set(["widget"]),
  };

  it("requires product identifier and quantity", () => {
    const result = validateProductSupplyRows(
      [{ rowNumber: 2, payload: {} }],
      ctx,
    );
    expect(result[0]?.validationErrors).toContain("product_code_or_name_required");
    expect(result[0]?.validationErrors).toContain("quantity_required");
  });

  it("blocks unknown product code", () => {
    const result = validateProductSupplyRows(
      [
        {
          rowNumber: 2,
          payload: { productCode: "missing", finalConfirmedQuantity: 10 },
        },
      ],
      ctx,
    );
    expect(result[0]?.validationErrors).toContain("unknown_product_code");
  });

  it("accepts valid supply update row", () => {
    const result = validateProductSupplyRows(
      [
        {
          rowNumber: 2,
          payload: { productCode: "SKU-1", finalConfirmedQuantity: 50 },
        },
      ],
      ctx,
    );
    expect(result[0]?.validationErrors).toHaveLength(0);
  });
});

describe("validateBulkOrderRows", () => {
  const ctx = {
    existingProductCodes: new Set(["sku-1"]),
    existingProductNames: new Set(["widget"]),
    eventOpenForOrders: true,
  };

  it("requires open event and valid quantity", () => {
    const closed = validateBulkOrderRows(
      [
        {
          rowNumber: 2,
          payload: {
            customerName: "A",
            productCode: "SKU-1",
            requestedQuantity: 10,
          },
        },
      ],
      { ...ctx, eventOpenForOrders: false },
    );
    expect(closed[0]?.validationErrors).toContain("event_not_open");
  });
});

describe("validateDepositRecordRows", () => {
  it("blocks when deposit feature disabled", () => {
    const result = validateDepositRecordRows(
      [{ rowNumber: 2, payload: { orderNumber: "HS-1", amount: 100 } }],
      { existingOrderNumbers: new Set(["hs-1"]), depositFeatureEnabled: false },
    );
    expect(result[0]?.validationErrors).toContain("deposit_feature_disabled");
  });
});

describe("assertImportRowLimit", () => {
  it("rejects empty files", () => {
    expect(assertImportRowLimit("customer_priority", 0)).toEqual({
      ok: false,
      error: "empty_file",
      maxRows: 5000,
    });
  });

  it("accepts rows within limit", () => {
    expect(assertImportRowLimit("customer_priority", 10)).toEqual({ ok: true });
  });
});
