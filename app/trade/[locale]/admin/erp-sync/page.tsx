import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeErpSyncPanel } from "@/components/trade/trade-erp-sync-panel";
import { requireHotSalesErpSyncFeature } from "@/lib/auth/trade-phase2d";
import { requireTradePermission } from "@/lib/auth/trade-session";
import { listSyncJobsWithDetails } from "@/lib/domain/trade/erp-sync-store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeErpSyncAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  requireHotSalesErpSyncFeature(locale);
  await requireTradePermission("export.finance");

  const jobs = await listSyncJobsWithDetails(100);

  return (
    <div className="space-y-6">
      <div>
        <Link href={tradeHref(locale, "/admin/events")} className="text-muted-foreground text-sm">
          ← Events
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">ERP sync queue</h1>
        <p className="text-muted-foreground text-sm">
          Async outbound jobs (ADR-004). No synchronous ERP calls in request path.
        </p>
      </div>
      <TradeErpSyncPanel locale={locale} jobs={jobs} />
    </div>
  );
}
