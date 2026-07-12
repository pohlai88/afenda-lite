import "server-only";

import { isAdminSession } from "@/modules/identity/admin";
import { getAuthSession } from "@/modules/identity/auth/get-session";
import {
  requireAnyPlatformPermission,
  resolvePlatformOrgContext,
} from "@/modules/identity/domain/platform-rbac-access";
import { hasFftModuleAccess } from "@/modules/fft/auth/fft-module-access";
import type { ShellAccess, ShellModuleId } from "@/modules/platform/shell/access";

/** Resolve sidebar entitlements for the shared shell (no redirects). */
export async function resolveShellAccess(): Promise<ShellAccess | null> {
  const session = await getAuthSession();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return null;
  }

  const neonAdmin = isAdminSession(session);
  const org = await resolvePlatformOrgContext({
    userId: user.id,
    ensureOrgAdminAssignment: neonAdmin,
  });

  /** IAM / mutating org-admin nav — excludes read-only Viewer (declarations.read). */
  const operator = neonAdmin
    ? { check: { allowed: true as const } }
    : await requireAnyPlatformPermission({
        userId: user.id,
        codes: [
          "org.users.manage",
          "org.roles.manage",
          "declarations.manage",
          "clients.invite",
        ],
        isNeonAdmin: false,
      });

  const modules: ShellModuleId[] = ["declarations"];
  if (
    await hasFftModuleAccess({
      userId: user.id,
      email: user.email,
      organizationId: org.organizationId,
      neonAdminBootstrap: neonAdmin,
    })
  ) {
    modules.push("fft");
  }

  return {
    modules,
    isOrgAdmin: neonAdmin || operator.check.allowed,
  };
}
