import { FftRbacAdminPanel } from "@/features/fft/fft-rbac-admin";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import { requireTradePermission } from "@/modules/fft/auth/fft-session";
import {
  listAllRoleAssignments,
  listFftRoles,
} from "@/modules/fft/domain/store";

export const dynamic = "force-dynamic";

export default async function FftRbacPage() {
  await requireTradePermission("role.manage");

  const [roles, assignments] = await Promise.all([
    listFftRoles(),
    listAllRoleAssignments(),
  ]);

  return (
    <main className="space-y-4 p-6" data-testid="trade-rbac-page">
      <h1 className="text-2xl font-semibold tracking-tight">RBAC</h1>
      <p className="text-muted-foreground text-sm">
        Feed Farm Trade roles and assignments (permission codes).
      </p>
      <FftRbacAdminPanel
        locale={FFT_UI_LOCALE}
        roles={roles}
        assignments={assignments}
      />
    </main>
  );
}
