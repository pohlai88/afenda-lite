import { assertHotSalesDepositFeatureAction, assertHotSalesPickupFeatureAction } from "@/lib/auth/trade-phase2b";
import {
  HOT_SALES_IMPORT_TYPES,
  HOT_SALES_IMPORT_TYPE_PERMISSION,
  type HotSalesImportType,
} from "@/lib/domain/trade/import-types";

const SUPPORTED_IMPORT_TYPES = new Set<HotSalesImportType>(HOT_SALES_IMPORT_TYPES);

export function parseImportType(value: string): HotSalesImportType | null {
  if (SUPPORTED_IMPORT_TYPES.has(value as HotSalesImportType)) {
    return value as HotSalesImportType;
  }
  return null;
}

export function assertImportFeatureGate(
  importType: HotSalesImportType,
): { error: string } | null {
  if (importType === "deposit_record") {
    return assertHotSalesDepositFeatureAction();
  }
  if (importType === "pickup_confirmation") {
    return assertHotSalesPickupFeatureAction();
  }
  return null;
}

export function importPermissionForType(importType: HotSalesImportType): string {
  return HOT_SALES_IMPORT_TYPE_PERMISSION[importType];
}
