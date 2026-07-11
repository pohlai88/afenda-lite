import { redirect } from "next/navigation";
import { canPermission, type HotSalesScopeContext } from "@/modules/trade/domain/rbac";
import { listRoleAssignmentsForUser } from "@/modules/trade/domain/store";
import {
  isHotSalesDepositEnabled,
  isHotSalesPickupOpsEnabled,
} from "@/modules/platform/env/accessors";
import type { TradeAccess } from "@/modules/trade/auth/trade-session";

/** Phase 2B feature gates — ADR-002 rollback: flags off = no new-table writes. */

export function isHotSalesDepositFeatureActive(): boolean {
  return isHotSalesDepositEnabled();
}

export function isHotSalesPickupFeatureActive(): boolean {
  return isHotSalesPickupOpsEnabled();
}

export function requireHotSalesDepositFeature(): void {
  if (!isHotSalesDepositEnabled()) {
    redirect(`/trade/admin/events`);
  }
}

export function requireHotSalesPickupFeature(): void {
  if (!isHotSalesPickupOpsEnabled()) {
    redirect(`/trade/admin/events`);
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
