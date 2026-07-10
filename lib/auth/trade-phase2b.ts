import { redirect } from "next/navigation";
import { canPermission, type HotSalesScopeContext } from "@/lib/domain/trade/rbac";
import { listRoleAssignmentsForUser } from "@/lib/domain/trade/store";
import {
  isHotSalesDepositEnabled,
  isHotSalesPickupOpsEnabled,
} from "@/lib/env/accessors";
import type { TradeAccess } from "@/lib/auth/trade-session";

/** Phase 2B feature gates — ADR-002 rollback: flags off = no new-table writes. */

export function isHotSalesDepositFeatureActive(): boolean {
  return isHotSalesDepositEnabled();
}

export function isHotSalesPickupFeatureActive(): boolean {
  return isHotSalesPickupOpsEnabled();
}

export function requireHotSalesDepositFeature(locale: string): void {
  if (!isHotSalesDepositEnabled()) {
    redirect(`/trade/${locale}/admin/events`);
  }
}

export function requireHotSalesPickupFeature(locale: string): void {
  if (!isHotSalesPickupOpsEnabled()) {
    redirect(`/trade/${locale}/admin/events`);
  }
}

export function assertHotSalesDepositFeatureAction(): { error: string } | null {
  if (!isHotSalesDepositEnabled()) return { error: "deposit_feature_disabled" };
  return null;
}

export function assertHotSalesPickupFeatureAction(): { error: string } | null {
  if (!isHotSalesPickupOpsEnabled()) return { error: "pickup_feature_disabled" };
  return null;
}

async function loadAssignments(userId: string) {
  const rows = await listRoleAssignmentsForUser(userId);
  return rows.map((row) => ({
    roleId: row.roleId,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    permissionCodes: row.permissionCodes,
    active: row.active,
  }));
}

/** DRY: event-scoped manage permission for admin pages (deposit.manage / pickup.manage). */
export async function hasTradeEventManagePermission(
  access: TradeAccess,
  permissionCode: string,
  eventId: string,
  ctx: HotSalesScopeContext = {},
): Promise<boolean> {
  if (access.isAdmin) return true;
  if (!access.rbacEnabled) return false;
  const assignments = await loadAssignments(access.userId);
  return canPermission(access.userId, permissionCode, assignments, {
    eventId,
    ...ctx,
  }).allowed;
}
