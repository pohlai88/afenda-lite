/**
 * Shared org-admin RSC bootstrap: tenant backfill + Org Admin assignment.
 * Composes Identity + Declarations at the adapter (features) layer only.
 */

import "server-only";

import { requireAdminSession } from "@/modules/identity/auth/session";
import { resolvePlatformOrgContext } from "@/modules/identity/domain/platform-rbac-access";
import { backfillDeclarationOrganizationIds } from "@/modules/declarations/domain/organization-scope";

export async function bootstrapOrganizationAdminTenancy() {
  const session = await requireAdminSession();
  const org = await resolvePlatformOrgContext({
    userId: session.user.id,
    ensureOrgAdminAssignment: true,
  });
  await backfillDeclarationOrganizationIds(org.organizationId);
  return { session, org };
}
