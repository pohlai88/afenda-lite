import { redirect } from "next/navigation";
import { canPermission, type FftScopeContext } from "@/modules/fft/domain/rbac";
import { listRoleAssignmentsForUser } from "@/modules/fft/domain/store";
import {
  isFftDepositEnabled,
  isFftPickupOpsEnabled,
} from "@/modules/platform/env/accessors";
import type { FftAccess } from "@/modules/fft/auth/fft-session";

/** Phase 2B feature gates — ADR-002 rollback: flags off = no new-table writes. */

export function isFftDepositFeatureActive(): boolean {
  return isFftDepositEnabled();
}

export function isFftPickupFeatureActive(): boolean {
  return isFftPickupOpsEnabled();
}

export function requireFftDepositFeature(): void {
  if (!isFftDepositEnabled()) {
    redirect(`/fft/admin/events`);
  }
}

export function requireFftPickupFeature(): void {
  if (!isFftPickupOpsEnabled()) {
    redirect(`/fft/admin/events`);
  }
}

export function assertFftDepositFeatureAction(): { error: string } | null {
  if (!isFftDepositEnabled()) return { error: "deposit_feature_disabled" };
  return null;
}

export function assertFftPickupFeatureAction(): { error: string } | null {
  if (!isFftPickupOpsEnabled()) return { error: "pickup_feature_disabled" };
  return null;
}

async function loadAssignments(userId: string, organizationId: string) {
  const rows = await listRoleAssignmentsForUser(userId, organizationId);
  return rows.map((row) => ({
    roleId: row.roleId,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    permissionCodes: row.permissionCodes,
    active: row.active,
  }));
}

/** DRY: event-scoped manage permission for admin pages (deposit.manage / pickup.manage). */
export async function hasFftEventManagePermission(
  access: FftAccess,
  permissionCode: string,
  eventId: string,
  ctx: FftScopeContext = {},
): Promise<boolean> {
  if (!access.rbacEnabled) {
    // Phase 1 (RBAC off): Neon admin only.
    return access.isAdmin;
  }

  const assignments = await loadAssignments(access.userId, access.organizationId);
  return canPermission(access.userId, permissionCode, assignments, {
    eventId,
    ...ctx,
  }).allowed;
}
