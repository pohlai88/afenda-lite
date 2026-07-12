import { redirect } from "next/navigation";
import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { resolvePlatformOrgContext } from "@/modules/identity/domain/platform-rbac-access";
import { isFftRbacEnabled } from "@/modules/platform/env/accessors";
import { hasFftModuleAccess } from "@/modules/fft/auth/fft-module-access";
import { AUTH_SIGN_IN_HREF } from "@/modules/platform/routing/portal-routes";
import { fftDefaultHref } from "@/modules/fft/i18n/fft-i18n";
import { canPermission } from "@/modules/fft/domain/rbac";
import type { FftScopeContext } from "@/modules/fft/domain/rbac";
import {
  bootstrapPhase1RbacAssignments,
  listRoleAssignmentsForUser,
} from "@/modules/fft/domain/store";

export type FftAccess = {
  userId: string;
  email: string;
  isAdmin: boolean;
  /** True when FFT_RBAC_ENABLED=true and dual-read path is active. */
  rbacEnabled: boolean;
  organizationId?: string;
};

const PHASE_1_SALES_PERMISSIONS = new Set([
  "event.view",
  "order.create",
  "order.view_own",
  "transfer.request",
  "deposit.view",
]);

const SELF_SERVICE_PERMISSIONS = new Set(PHASE_1_SALES_PERMISSIONS);

async function loadAssignments(userId: string, organizationId?: string) {
  const rows = await listRoleAssignmentsForUser(userId, organizationId);
  return rows.map((row) => ({
    roleId: row.roleId,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    permissionCodes: row.permissionCodes,
    active: row.active,
  }));
}

export async function requireFftAccess(): Promise<FftAccess> {
  const session = await getAuthSession();
  const user = session?.user;
  if (!user?.id || !user.email) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  const isAdmin = isAdminSession(session);
  const rbacEnabled = isFftRbacEnabled();
  const { organizationId } = await resolvePlatformOrgContext({
    userId: user.id,
    ensureOrgAdminAssignment: isAdmin,
  });
  const moduleOk = await hasFftModuleAccess({
    userId: user.id,
    email: user.email,
    organizationId,
    neonAdminBootstrap: isAdmin,
  });

  if (!moduleOk) {
    redirect(`${AUTH_SIGN_IN_HREF}?reason=fft-access-denied`);
  }

  if (rbacEnabled) {
    await bootstrapPhase1RbacAssignments({
      userId: user.id,
      email: user.email,
      isAdmin,
      organizationId,
    });
  }

  return {
    userId: user.id,
    email: user.email,
    isAdmin,
    rbacEnabled,
    organizationId,
  };
}

export async function requireFftAdmin(): Promise<{
  userId: string;
  email: string;
}> {
  const access = await requireFftAccess();
  if (!access.rbacEnabled) {
    if (!access.isAdmin) {
      redirect(fftDefaultHref("/events"));
    }
    return { userId: access.userId, email: access.email };
  }

  if (access.isAdmin) {
    return { userId: access.userId, email: access.email };
  }

  const assignments = await loadAssignments(
    access.userId,
    access.organizationId,
  );
  const ok = canPermission(access.userId, "event.edit", assignments, {
    // Platform/company scoped admin templates match without event id.
  }).allowed;
  if (!ok) {
    redirect(fftDefaultHref("/events"));
  }
  return { userId: access.userId, email: access.email };
}

/**
 * Non-redirecting permission check for RSC composition.
 * Mirrors requireTradePermission so pages can hide write controls without
 * weakening the server-action guard.
 */
export async function hasTradePermission(
  access: FftAccess,
  permissionCode: string,
  ctx: FftScopeContext = {},
): Promise<boolean> {
  if (!access.rbacEnabled) {
    return access.isAdmin || PHASE_1_SALES_PERMISSIONS.has(permissionCode);
  }

  if (access.isAdmin) return true;

  const assignments = await loadAssignments(
    access.userId,
    access.organizationId,
  );
  const permissionCtx: FftScopeContext = {
    ...ctx,
    resourceOwnerUserId:
      ctx.resourceOwnerUserId ??
      (SELF_SERVICE_PERMISSIONS.has(permissionCode) ? access.userId : undefined),
  };
  return canPermission(
    access.userId,
    permissionCode,
    assignments,
    permissionCtx,
  ).allowed;
}

/** Server-side permission check. When RBAC flag is off, admin = all; sales = limited set. */
export async function requireTradePermission(
  permissionCode: string,
  ctx: FftScopeContext = {},
): Promise<FftAccess> {
  const access = await requireFftAccess();
  if (!(await hasTradePermission(access, permissionCode, ctx))) {
    redirect(fftDefaultHref("/events"));
  }
  return access;
}
