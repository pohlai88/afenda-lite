/**
 * Shared org-admin RSC bootstrap: session + org context resolution.
 * Composes Identity at the adapter (features) layer only.
 */

import "server-only";

import { isAdminSession } from "@/modules/identity/admin";
import { requirePlatformOperatorSession } from "@/modules/identity/auth/platform-operator-session";
import { resolvePlatformOrgContext } from "@/modules/identity/domain/platform-rbac-access";
import type { PlatformPermissionCode } from "@/modules/identity/domain/platform-rbac-catalog";

const DEFAULT_OPERATOR_CODES = [
  "declarations.read",
  "declarations.manage",
  "org.users.manage",
  "org.roles.manage",
  "clients.invite",
] as const satisfies readonly PlatformPermissionCode[];

export async function bootstrapOrganizationAdminTenancy(options?: {
  anyOf?: readonly PlatformPermissionCode[];
}) {
  const anyOf = options?.anyOf ?? DEFAULT_OPERATOR_CODES;
  const session = await requirePlatformOperatorSession({ anyOf });
  const neonAdmin = isAdminSession(session);
  const org = await resolvePlatformOrgContext({
    userId: session.user.id,
    ensureOrgAdminAssignment: neonAdmin,
  });
  return { session, org, isNeonAdmin: neonAdmin };
}
