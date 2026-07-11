import { redirect } from "next/navigation";
import { isFftErpSyncEnabled } from "@/modules/platform/env/accessors";

/** Phase 2D ERP sync gate — ADR-004 rollback: flag off = no enqueue. */

export function isFftErpSyncFeatureActive(): boolean {
  return isFftErpSyncEnabled();
}

export function assertFftErpSyncFeatureAction(): { error: string } | null {
  if (!isFftErpSyncEnabled()) return { error: "erp_sync_disabled" };
  return null;
}

export function requireFftErpSyncFeature(): void {
  if (!isFftErpSyncEnabled()) {
    redirect(`/fft/admin/events`);
  }
}
