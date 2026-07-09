import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeRbacAdminPanel } from "@/components/trade/trade-rbac-admin";
import { requireTradePermission } from "@/lib/auth/trade-session";
import {
  listAllRoleAssignments,
  listHotSalesRoles,
  seedHotSalesRbacCatalog,
} from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminRbacPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  const access = await requireTradePermission("role.manage");
  await seedHotSalesRbacCatalog(access.userId);
  const [roles, assignments] = await Promise.all([
    listHotSalesRoles(),
    listAllRoleAssignments(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={tradeHref(locale, "/admin/events")}
          className="text-muted-foreground text-sm"
        >
          ← Events
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          {locale === "vi" ? "Vai trò & quyền" : "Roles & permissions"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Permission codes only — job titles are templates. Sensitive grants are audited.
        </p>
      </div>
      <TradeRbacAdminPanel
        locale={locale}
        roles={roles}
        assignments={assignments}
      />
    </div>
  );
}
