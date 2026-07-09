import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeCountdown } from "@/components/trade/trade-countdown";
import { Badge } from "@/components/ui/badge";
import { canSubmitOrder } from "@/lib/domain/trade/events";
import { listEvents } from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/events");
  const locale = localeParam as TradeLocale;

  const events = (await listEvents({ includeTemplates: false })).filter(
    (e) => e.status === "open" || e.status === "scheduled" || e.status === "closed",
  );
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {locale === "vi" ? "Sự kiện Hot Sales" : "Hot Sales events"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {locale === "vi"
            ? "Đăng ký đơn trong cửa sổ mở"
            : "Register orders during the open window"}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {locale === "vi" ? "Chưa có sự kiện." : "No events yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => {
            const open = canSubmitOrder(event, now).allowed;
            return (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                data-testid="trade-event-row"
              >
                <div>
                  <p className="font-medium">{event.eventName}</p>
                  <p className="text-muted-foreground text-sm">
                    {event.opensAt.toLocaleString(locale)} —{" "}
                    {event.closesAt.toLocaleString(locale)}
                  </p>
                  {event.status === "open" ? (
                    <TradeCountdown
                      closesAtIso={event.closesAt.toISOString()}
                      locale={locale}
                      label={locale === "vi" ? "Còn lại" : "Time remaining"}
                    />
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={event.status === "open" ? "default" : "secondary"}>
                    {event.status}
                  </Badge>
                  {open ? (
                    <Link
                      href={tradeHref(locale, `/events/${event.id}/order`)}
                      className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm"
                      data-testid="trade-place-order"
                    >
                      {locale === "vi" ? "Đăng ký đơn" : "Place order"}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
