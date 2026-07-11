/**
 * FFT adapter bootstrap: resolve Neon org + backfill FFT organization_id.
 * Composes Identity + FFT at the page/action layer only.
 */

import "server-only";

import { resolvePlatformOrgContext } from "@/modules/identity/domain/platform-rbac-access";
import { backfillFftOrganizationIds } from "@/modules/fft/domain/organization-scope";

export async function resolveFftOrganizationContext(userId?: string) {
  const org = await resolvePlatformOrgContext(
    userId ? { userId, ensureOrgAdminAssignment: false } : undefined,
  );
  await backfillFftOrganizationIds(org.organizationId);
  return org;
}
