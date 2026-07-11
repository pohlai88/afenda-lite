import { TradeRbacAdminPanel } from "@/features/trade/trade-rbac-admin";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
import { requireTradePermission } from "@/modules/trade/auth/trade-session";
import {
  listAllRoleAssignments,
  listHotSalesRoles,
} from "@/modules/trade/domain/store";

export const dynamic = "force-dynamic";

export default async function TradeRbacPage() {
  await requireTradePermission("role.manage");

  const [roles, assignments] = await Promise.all([
    listHotSalesRoles(),
    listAllRoleAssignments(),
  ]);

  return (
    <main className="space-y-4 p-6" data-testid="trade-rbac-page">
      <h1 className="text-2xl font-semibold tracking-tight">RBAC</h1>
      <p className="text-muted-foreground text-sm">
        Feed Farm Trade roles and assignments (permission codes).
      </p>
      <TradeRbacAdminPanel
        locale={TRADE_UI_LOCALE}
        roles={roles}
        assignments={assignments}
      />
    </main>
  );
}
