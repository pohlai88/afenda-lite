import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeErpSyncNavLink } from "@/components/trade/trade-erp-sync-panel";
import {
  TradeEnsureTemplateButton,
  TradeNewEventForm,
} from "@/components/trade/trade-admin-forms";
import { TradeCloneEventButton } from "@/components/trade/trade-clone-button";
import { requireTradeAdmin } from "@/lib/auth/trade-session";
import { isHotSalesErpSyncFeatureActive } from "@/lib/auth/trade-phase2d";
import { listEvents } from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  await requireTradeAdmin();
  const events = await listEvents();
  const erpSyncActive = isHotSalesErpSyncFeatureActive();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {locale === "vi" ? "Quản trị sự kiện" : "Event admin"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Self-service Hot Sales event engine
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={tradeHref(locale, "/admin/events/new")}
          className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm"
        >
          {locale === "vi" ? "Tạo sự kiện" : "New event"}
        </Link>
        <Link
          href={tradeHref(locale, "/admin/rbac")}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          {locale === "vi" ? "Vai trò" : "Roles"}
        </Link>
        {erpSyncActive ? (
          <Link
            href={tradeHref(locale, "/admin/erp-sync")}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            ERP sync
          </Link>
        ) : null}
        <TradeEnsureTemplateButton locale={locale} />
      </div>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Quick create (on-list)
        </summary>
        <div className="mt-4">
          <TradeNewEventForm locale={locale} />
        </div>
      </details>

      <div className="space-y-3">
        <h2 className="font-medium">Events</h2>
        {events.map((event) => (
          <div
            key={event.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{event.eventName}</p>
              <p className="text-muted-foreground text-sm">
                {event.eventCode} · {event.status}
                {event.isTemplate ? " · template" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={tradeHref(locale, `/admin/events/${event.id}/setup`)}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Setup
              </Link>
              <Link
                href={tradeHref(locale, `/admin/events/${event.id}/allocation`)}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Allocation
              </Link>
              <TradeCloneEventButton locale={locale} eventId={event.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
