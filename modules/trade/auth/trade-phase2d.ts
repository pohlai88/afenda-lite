import { redirect } from "next/navigation";
import { isHotSalesErpSyncEnabled } from "@/modules/platform/env/accessors";

/** Phase 2D ERP sync gate — ADR-004 rollback: flag off = no enqueue. */

export function isHotSalesErpSyncFeatureActive(): boolean {
  return isHotSalesErpSyncEnabled();
}

export function assertHotSalesErpSyncFeatureAction(): { error: string } | null {
  if (!isHotSalesErpSyncEnabled()) return { error: "erp_sync_disabled" };
  return null;
}

export function requireHotSalesErpSyncFeature(): void {
  if (!isHotSalesErpSyncEnabled()) {
    redirect(`/trade/admin/events`);
  }
}
