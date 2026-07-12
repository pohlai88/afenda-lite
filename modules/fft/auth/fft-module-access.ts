import "server-only";

/**
 * Feed Farm Trade module entry (multi-tenant control plane).
 * SoT: platform `fft.access` for the active org.
 * Bridges: sales allowlist; FFT role assignment when FFT_RBAC_ENABLED.
 */

import { isFftRbacEnabled } from "@/modules/platform/env/accessors";
import { hasPlatformPermission } from "@/modules/identity/domain/platform-rbac";
import { isSalesMemberActive } from "@/modules/fft/domain/access";
import {
  listRoleAssignmentsForUser,
  listSalesMembers,
} from "@/modules/fft/domain/store";

export async function hasFftModuleAccess(input: {
  userId: string;
  email: string;
  organizationId: string;
  /** Neon admin bootstrap until Org Admin assignment exists */
  neonAdminBootstrap?: boolean;
}): Promise<boolean> {
  const platform = await hasPlatformPermission({
    userId: input.userId,
    organizationId: input.organizationId,
    code: "fft.access",
    neonAdminBootstrap: input.neonAdminBootstrap ?? false,
  });
  if (platform.allowed) {
    return true;
  }

  const members = await listSalesMembers(input.organizationId);
  if (isSalesMemberActive(members, input.email)) {
    return true;
  }

  if (!isFftRbacEnabled()) {
    return false;
  }

  const assignments = await listRoleAssignmentsForUser(
    input.userId,
    input.organizationId,
  );
  return assignments.length > 0;
}
