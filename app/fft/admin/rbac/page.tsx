import { redirect } from "next/navigation";
import { FftRbacAdminPanel } from "@/features/fft/fft-rbac-admin";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import { resolveFftOrganizationContext } from "@/features/fft/fft-organization-context";
import { ORG_ACCESS_DENIED_HREF } from "@/modules/identity/admin";
import { requirePlatformPermission } from "@/modules/identity/domain/platform-rbac-access";
import { requireFftPermission } from "@/modules/fft/auth/fft-session";
import {
  listAllRoleAssignments,
  listFftRoles,
} from "@/modules/fft/domain/store";

export const dynamic = "force-dynamic";

/**
 * FFT domain RBAC editor — entry requires platform org.roles.manage
 * (control plane) plus FFT role.manage (data plane).
 */
export default async function FftRbacPage() {
  const access = await requireFftPermission("role.manage");
  const { check } = await requirePlatformPermission({
    userId: access.userId,
    code: "org.roles.manage",
    isNeonAdmin: access.isAdmin,
  });
  if (!check.allowed) {
    redirect(ORG_ACCESS_DENIED_HREF);
  }

  const org = await resolveFftOrganizationContext(access.userId);

  const [roles, assignments] = await Promise.all([
    listFftRoles(org.organizationId),
    listAllRoleAssignments(org.organizationId),
  ]);

  return (
    <main className="space-y-4 p-6" data-testid="fft-rbac-page">
      <h1 className="text-2xl font-semibold tracking-tight">RBAC</h1>
      <p className="text-muted-foreground text-sm">
        Feed Farm Trade domain roles and assignments. Module entry is
        controlled by platform <code>fft.access</code>; this page also
        requires <code>org.roles.manage</code>.
      </p>
      <FftRbacAdminPanel
        locale={FFT_UI_LOCALE}
        roles={roles}
        assignments={assignments}
      />
    </main>
  );
}
