import "server-only";

import { isFftRbacEnabled } from "@/modules/platform/env/accessors";
import { isSalesMemberActive } from "@/modules/fft/domain/access";
import {
  listRoleAssignmentsForUser,
  listSalesMembers,
} from "@/modules/fft/domain/store";

/**
 * Feed Farm Trade module entry — allowlist or RBAC assignment.
 * Organization admin alone does **not** grant Feed Farm Trade.
 */
export async function hasFftModuleAccess(input: {
  userId: string;
  email: string;
  organizationId?: string;
}): Promise<boolean> {
  const members = await listSalesMembers(input.organizationId);
  if (isSalesMemberActive(members, input.email)) {
    return true;
  }

  if (!isFftRbacEnabled()) {
    return false;
  }

  const assignments = await listRoleAssignmentsForUser(input.userId);
  return assignments.length > 0;
}
