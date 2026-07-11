import "server-only";

/**
 * Organization operator for product surfaces: Neon admin (bootstrap) OR
 * a signed-in user with at least one of the required platform permissions.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  isAdminSession,
  ORG_ACCESS_DENIED_HREF,
  toAdminAuthenticatedSession,
  type AdminAuthenticatedSession,
} from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import { requireAnyPlatformPermission } from "@/modules/identity/domain/platform-rbac-access";
import type { PlatformPermissionCode } from "@/modules/identity/domain/platform-rbac-catalog";
import { AUTH_SIGN_IN_HREF } from "@/modules/platform/routing/portal-routes";

export async function requirePlatformOperatorSession(input: {
  anyOf: readonly PlatformPermissionCode[];
}): Promise<AdminAuthenticatedSession> {
  const session = await getAuthSession();
  const authenticated = toAdminAuthenticatedSession(session);

  if (!authenticated) {
    redirect(AUTH_SIGN_IN_HREF);
  }

  const neonAdmin = isAdminSession(authenticated);
  if (neonAdmin) {
    return authenticated;
  }

  const { check } = await requireAnyPlatformPermission({
    userId: authenticated.user.id,
    codes: input.anyOf,
    isNeonAdmin: false,
  });

  if (!check.allowed) {
    redirect(ORG_ACCESS_DENIED_HREF);
  }

  return authenticated;
}

/** Cached dashboard bootstrap default: declarations read/manage. */
export const requireDeclarationsOperatorSession = cache(async () =>
  requirePlatformOperatorSession({
    anyOf: ["declarations.read", "declarations.manage"],
  }),
);
