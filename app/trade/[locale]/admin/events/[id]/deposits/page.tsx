import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeDepositPanel } from "@/components/trade/trade-deposit-forms";
import {
  hasTradeEventManagePermission,
  requireHotSalesDepositFeature,
} from "@/lib/auth/trade-phase2b";
import { requireTradePermission } from "@/lib/auth/trade-session";
import {
  listDepositsForEvent,
  listFinanceAuditForEvent,
} from "@/lib/domain/trade/deposit-store";
import { getEventById } from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminDepositsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  requireHotSalesDepositFeature(locale);
  const access = await requireTradePermission("deposit.view", { eventId: id });
  const event = await getEventById(id);
  if (!event) redirect(tradeHref(locale, "/admin/events"));

  const [deposits, audit] = await Promise.all([
    listDepositsForEvent(id),
    listFinanceAuditForEvent(id),
  ]);

  const canManage = await hasTradeEventManagePermission(
    access,
    "deposit.manage",
    id,
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={tradeHref(locale, `/admin/events/${id}/setup`)}
          className="text-muted-foreground text-sm"
        >
          ← {locale === "vi" ? "Thiết lập sự kiện" : "Event setup"}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{event.eventName}</h1>
        <p className="text-muted-foreground text-sm">
          {locale === "vi" ? "Quản lý tiền cọc vận hành" : "Operational deposit management"}
        </p>
      </div>
      <TradeDepositPanel
        locale={locale}
        eventId={id}
        deposits={deposits}
        audit={audit}
        canManage={canManage}
      />
    </div>
  );
}
