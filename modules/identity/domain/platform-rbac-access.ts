/**
 * Adapter-facing helper: resolve active portal org + platform permission gate.
 * Uses fail-closed resolveActivePortalOrganization (M1 / N1).
 */

import "server-only";

import { resolveActivePortalOrganization } from "@/modules/identity/portal-organization";
import {
  ensureNeonAdminOrgAdminAssignment,
  hasPlatformPermission,
  seedPlatformRbacCatalog,
} from "@/modules/identity/domain/platform-rbac";
import { asOrganizationId } from "@/modules/identity/schemas/platform-rbac";
import type { PlatformPermissionCode } from "@/modules/identity/domain/platform-rbac-catalog";

export async function resolvePlatformOrgContext(input?: {
  userId?: string;
  ensureOrgAdminAssignment?: boolean;
}) {
  await seedPlatformRbacCatalog(input?.userId);
  const org = await resolveActivePortalOrganization();
  const organizationId = asOrganizationId(org.id);

  if (input?.userId && input.ensureOrgAdminAssignment) {
    await ensureNeonAdminOrgAdminAssignment({
      userId: input.userId,
      organizationId,
      actorUserId: input.userId,
    });
  }

  return {
    organizationId,
    organizationName: org.name,
    organizationSlug: org.slug,
  };
}

export async function requirePlatformPermission(input: {
  userId: string;
  code: PlatformPermissionCode;
  /** Neon admin|user bootstrap when no assignments yet */
  isNeonAdmin: boolean;
}) {
  const { organizationId } = await resolvePlatformOrgContext({
    userId: input.userId,
    ensureOrgAdminAssignment: input.isNeonAdmin,
  });
  const check = await hasPlatformPermission({
    userId: input.userId,
    organizationId,
    code: input.code,
    neonAdminBootstrap: input.isNeonAdmin,
  });

  return { organizationId, check };
}

/** True if the user has at least one of the listed platform permissions. */
export async function requireAnyPlatformPermission(input: {
  userId: string;
  codes: readonly PlatformPermissionCode[];
  isNeonAdmin: boolean;
}) {
  const org = await resolvePlatformOrgContext({
    userId: input.userId,
    ensureOrgAdminAssignment: input.isNeonAdmin,
  });

  for (const code of input.codes) {
    const check = await hasPlatformPermission({
      userId: input.userId,
      organizationId: org.organizationId,
      code,
      neonAdminBootstrap: input.isNeonAdmin,
    });
    if (check.allowed) {
      return { ...org, check, matchedCode: code };
    }
  }

  return {
    ...org,
    check: { allowed: false as const, reason: "missing_permission" as const },
    matchedCode: input.codes[0],
  };
}
