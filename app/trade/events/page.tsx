import Link from "next/link";
import { TradeEventsList } from "@/features/trade/trade-events-list";
import { toTradeEventListItems } from "@/features/trade/trade-events-list-model";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
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
          <Link className="text-sm underline" href={tradeHref("/admin/events")}>
            Admin events
          </Link>
          <Link className="text-sm underline" href={tradeHref("/my-orders")}>
            My orders
          </Link>
        </div>
      </div>

      <TradeEventsList
        events={toTradeEventListItems(events)}
        locale={TRADE_UI_LOCALE}
        variant="sales"
      />
    </main>
  );
}
