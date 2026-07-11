import { redirect } from "next/navigation";
import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { isHotSalesRbacEnabled } from "@/modules/platform/env/accessors";
import { hasHotSalesModuleAccess } from "@/modules/platform/shell/access";
import { AUTH_SIGN_IN_HREF } from "@/modules/platform/routing/portal-routes";
import { tradeDefaultHref } from "@/modules/trade/i18n/trade";
import { canPermission } from "@/modules/trade/domain/rbac";
import type { HotSalesScopeContext } from "@/modules/trade/domain/rbac";
import {
  bootstrapPhase1RbacAssignments,
  listRoleAssignmentsForUser,
} from "@/modules/trade/domain/store";

export type TradeAccess = {
  userId: string;
  email: string;
  isAdmin: boolean;
  /** True when HOT_SALES_RBAC_ENABLED=true and dual-read path is active. */
  rbacEnabled: boolean;
};

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

export async function requireTradeAccess(): Promise<TradeAccess> {
  const session = await getAuthSession();
  const user = session?.user;
  if (!user?.id || !user.email) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  const isAdmin = isAdminSession(session);
  const rbacEnabled = isHotSalesRbacEnabled();
  const moduleOk = await hasHotSalesModuleAccess({
    userId: user.id,
    email: user.email,
  });

  if (!moduleOk) {
    redirect(`${AUTH_SIGN_IN_HREF}?reason=trade-access-denied`);
  }

  if (rbacEnabled) {
    await bootstrapPhase1RbacAssignments({
      userId: user.id,
      email: user.email,
      isAdmin,
    });
  }

  return {
    userId: user.id,
    email: user.email,
    isAdmin,
    rbacEnabled,
  };
}

export async function requireTradeAdmin(): Promise<{
  userId: string;
  email: string;
}> {
  const access = await requireTradeAccess();
  if (!access.rbacEnabled) {
    if (!access.isAdmin) {
      redirect(tradeDefaultHref("/events"));
    }
    return { userId: access.userId, email: access.email };
  }

  if (access.isAdmin) {
    return { userId: access.userId, email: access.email };
  }

  const assignments = await loadAssignments(access.userId);
  const ok = canPermission(access.userId, "event.edit", assignments, {
    // Platform/company scoped admin templates match without event id.
  }).allowed;
  if (!ok) {
    redirect(tradeDefaultHref("/events"));
  }
  return { userId: access.userId, email: access.email };
}

/** Server-side permission check. When RBAC flag is off, admin = all; sales = limited set. */
export async function requireTradePermission(
  permissionCode: string,
  ctx: HotSalesScopeContext = {},
): Promise<TradeAccess> {
  const access = await requireTradeAccess();

  if (!access.rbacEnabled) {
    if (access.isAdmin) return access;
    const salesAllowed = new Set([
      "event.view",
      "order.create",
      "order.view_own",
      "transfer.request",
      "deposit.view",
    ]);
    if (!salesAllowed.has(permissionCode)) {
      redirect(tradeDefaultHref("/events"));
    }
    return access;
  }

  if (access.isAdmin) {
    return access;
  }

  const assignments = await loadAssignments(access.userId);
  const selfServicePermissions = new Set([
    "event.view",
    "order.create",
    "order.view_own",
    "transfer.request",
    "deposit.view",
  ]);
  const permissionCtx: HotSalesScopeContext = {
    ...ctx,
    resourceOwnerUserId:
      ctx.resourceOwnerUserId ??
      (selfServicePermissions.has(permissionCode) ? access.userId : undefined),
  };
  const result = canPermission(
    access.userId,
    permissionCode,
    assignments,
    permissionCtx,
  );
  if (!result.allowed) {
    redirect(tradeDefaultHref("/events"));
  }
  return access;
}
