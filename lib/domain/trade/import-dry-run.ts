import "server-only";

import {
  buildBulkOrderValidationContext,
  buildOrderLookupForEvent,
  buildProductLookupForEvent,
} from "@/lib/domain/trade/import-store";
import type {
  BulkOrderImportRow,
  CustomerPriorityImportRow,
  DepositRecordImportRow,
  HotSalesImportType,
  ImportRowPayload,
  PickupConfirmationImportRow,
  ProductSupplyImportRow,
} from "@/lib/domain/trade/import-types";
import {
  validateBulkOrderRows,
  validateCustomerPriorityRows,
  validateDepositRecordRows,
  validatePickupConfirmationRows,
  validateProductSupplyRows,
} from "@/lib/domain/trade/import-validators";
import {
  isHotSalesDepositEnabled,
  isHotSalesPickupOpsEnabled,
} from "@/lib/env/accessors";

export type ValidatedImportRowRecord = {
  rowNumber: number;
  payload: Record<string, unknown>;
  validationErrors: string[];
};

function mapValidated<T>(
  rows: Array<{ rowNumber: number; payload: T; validationErrors: string[] }>,
): ValidatedImportRowRecord[] {
  return rows.map((r) => ({
    rowNumber: r.rowNumber,
    payload: r.payload as Record<string, unknown>,
    validationErrors: r.validationErrors,
  }));
}

export async function validateImportRowsForDryRun(
  eventId: string,
  importType: HotSalesImportType,
  parsedRows: Array<{ rowNumber: number; payload: ImportRowPayload }>,
): Promise<ValidatedImportRowRecord[]> {
  switch (importType) {
    case "customer_priority":
      return mapValidated(
        validateCustomerPriorityRows(
          parsedRows.map((r) => ({
            rowNumber: r.rowNumber,
            payload: r.payload as CustomerPriorityImportRow,
          })),
        ),
      );
    case "product_supply": {
      const lookup = await buildProductLookupForEvent(eventId);
      return mapValidated(
        validateProductSupplyRows(
          parsedRows.map((r) => ({
            rowNumber: r.rowNumber,
            payload: r.payload as ProductSupplyImportRow,
          })),
          lookup,
        ),
      );
    }
    case "bulk_order": {
      const ctx = await buildBulkOrderValidationContext(eventId);
      return mapValidated(
        validateBulkOrderRows(
          parsedRows.map((r) => ({
            rowNumber: r.rowNumber,
            payload: r.payload as BulkOrderImportRow,
          })),
          ctx,
        ),
      );
    }
    case "deposit_record": {
      const lookup = await buildOrderLookupForEvent(eventId);
      return mapValidated(
        validateDepositRecordRows(
          parsedRows.map((r) => ({
            rowNumber: r.rowNumber,
            payload: r.payload as DepositRecordImportRow,
          })),
          { ...lookup, depositFeatureEnabled: isHotSalesDepositEnabled() },
        ),
      );
    }
    default: {
      const lookup = await buildOrderLookupForEvent(eventId);
      return mapValidated(
        validatePickupConfirmationRows(
          parsedRows.map((r) => ({
            rowNumber: r.rowNumber,
            payload: r.payload as PickupConfirmationImportRow,
          })),
          { ...lookup, pickupFeatureEnabled: isHotSalesPickupOpsEnabled() },
        ),
      );
    }
  }
}
