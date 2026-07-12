/**
 * FFT adapter bootstrap: resolve Neon org context.
 * Composes Identity + FFT at the page/action layer only.
 */

import "server-only";

import { resolvePlatformOrgContext } from "@/modules/identity/domain/platform-rbac-access";
import { getEventById } from "@/modules/fft/domain/store";

export async function resolveFftOrganizationContext(userId?: string) {
  const org = await resolvePlatformOrgContext(
    userId ? { userId, ensureOrgAdminAssignment: false } : undefined,
  );
  return org;
}

/** Org-scoped event read for product pages (hard org filter). */
export async function getFftEventForOrganization(
  eventId: string,
  userId?: string,
) {
  const org = await resolveFftOrganizationContext(userId);
  return getEventById(eventId, org.organizationId);
}
