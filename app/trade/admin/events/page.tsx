import Link from "next/link";
import {
  TradeEnsureTemplateButton,
  TradeNewEventForm,
} from "@/features/trade/trade-admin-forms";
import { TradeAddSalesMemberForm } from "@/features/trade/trade-sales-member-form";
import { TradeEventsList } from "@/features/trade/trade-events-list";
import { toTradeEventListItems } from "@/features/trade/trade-events-list-model";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
import { listEvents, listSalesMembers } from "@/modules/trade/domain/store";
import { tradeHref } from "@/modules/trade/i18n/trade";

export const dynamic = "force-dynamic";

export default async function TradeAdminEventsPage() {
  const [events, members] = await Promise.all([
    listEvents({ includeTemplates: true }),
    listSalesMembers(),
  ]);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin · Events</h1>
        <p className="text-muted-foreground text-sm">
          Create programs, seed templates, manage sales membership.
        </p>
        <Link className="text-sm underline" href={tradeHref("/events")}>
          Sales event list
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-medium">New event</h2>
          <TradeNewEventForm locale={TRADE_UI_LOCALE} />
          <TradeEnsureTemplateButton locale={TRADE_UI_LOCALE} />
        </div>
        <div className="space-y-3">
          <h2 className="font-medium">Sales members</h2>
          <TradeAddSalesMemberForm locale={TRADE_UI_LOCALE} />
          <ul className="text-muted-foreground text-sm">
            {members.map((m) => (
              <li key={m.email}>{m.email}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">All events</h2>
        <TradeEventsList
          events={toTradeEventListItems(events)}
          locale={TRADE_UI_LOCALE}
          variant="admin"
        />
      </section>
    </main>
  );
}
