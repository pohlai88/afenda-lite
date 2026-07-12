/**
 * Feed Farm Trade module entry (multi-tenant control plane).
 * SoT: platform `fft.access` for the active org only.
 * Legacy allowlist / FFT domain assignment do not grant entry and do not auto-promote.
 */

import { hasPlatformPermission } from "@/modules/identity/domain/platform-rbac";

export async function hasFftModuleAccess(input: {
  userId: string;
  email: string;
  organizationId: string;
  /** Neon admin bootstrap until Org Admin assignment exists */
  neonAdminBootstrap?: boolean;
}): Promise<boolean> {
  void input.email;
  const platform = await hasPlatformPermission({
    userId: input.userId,
    organizationId: input.organizationId,
    code: "fft.access",
    neonAdminBootstrap: input.neonAdminBootstrap ?? false,
  });
  return platform.allowed;
}
