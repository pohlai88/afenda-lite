import Link from "next/link";
import { listEvents } from "@/modules/trade/domain/store";
import { tradeHref } from "@/modules/trade/i18n/trade";

export const dynamic = "force-dynamic";

export default async function TradeEventsPage() {
  const events = await listEvents({ includeTemplates: false });

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm">
            Feed Farm Trade programs — open windows, take orders, allocate.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className="text-sm underline"
            href={tradeHref("/admin/events")}
          >
            Admin events
          </Link>
          <Link className="text-sm underline" href={tradeHref("/my-orders")}>
            My orders
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">No events yet.</p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium">{event.eventName}</p>
                <p className="text-muted-foreground text-xs">
                  {event.status} · {event.eventCode}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <Link className="underline" href={tradeHref(`/events/${event.id}/order`)}>
                  Order
                </Link>
                <Link
                  className="underline"
                  href={tradeHref(`/admin/events/${event.id}/setup`)}
                >
                  Setup
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
