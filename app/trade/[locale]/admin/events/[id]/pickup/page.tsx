import Link from "next/link";
import { redirect } from "next/navigation";
import { TradePickupPanel } from "@/components/trade/trade-pickup-forms";
import {
  hasTradeEventManagePermission,
  requireHotSalesPickupFeature,
} from "@/lib/auth/trade-phase2b";
import { requireTradePermission } from "@/lib/auth/trade-session";
import {
  listPickupQueueForEvent,
  listPickupWindowsForEvent,
} from "@/lib/domain/trade/pickup-store";
import { getEventById } from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminPickupPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  requireHotSalesPickupFeature(locale);
  const access = await requireTradePermission("pickup.view", { eventId: id });
  const event = await getEventById(id);
  if (!event) redirect(tradeHref(locale, "/admin/events"));

  const [windows, queue] = await Promise.all([
    listPickupWindowsForEvent(id),
    listPickupQueueForEvent(id),
  ]);

  const canManage = await hasTradeEventManagePermission(
    access,
    "pickup.manage",
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
          {locale === "vi" ? "Vận hành lấy hàng" : "Pickup operations"}
        </p>
      </div>
      <TradePickupPanel
        locale={locale}
        eventId={id}
        windows={windows}
        queue={queue}
        canManage={canManage}
      />
    </div>
  );
}
