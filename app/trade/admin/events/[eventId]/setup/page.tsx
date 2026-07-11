import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeCloneEventButton } from "@/features/trade/trade-clone-button";
import { TradeExportPanel } from "@/features/trade/trade-export-panel";
import {
  TradeEventSetupForm,
  TradeEventStatusActions,
  TradeFieldDefForm,
  TradePriorityImportForm,
  TradeProductForm,
} from "@/features/trade/trade-setup-forms";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
import {
  getEventById,
  listAuditForEvent,
  listFieldDefsForEvent,
  listPrioritiesForEvent,
  listProductsForEvent,
} from "@/modules/trade/domain/store";
import { tradeHref } from "@/modules/trade/i18n/trade";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function TradeEventSetupPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const [products, fieldDefs, priorities, audit] = await Promise.all([
    listProductsForEvent(eventId),
    listFieldDefsForEvent(eventId),
    listPrioritiesForEvent(eventId),
    listAuditForEvent(eventId),
  ]);

  return (
    <main className="space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.eventName}</h1>
          <p className="text-muted-foreground text-sm">
            Setup · {event.status} · {event.eventCode}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline" href={tradeHref(`/events/${eventId}/order`)}>
            Order
          </Link>
          <Link
            className="underline"
            href={tradeHref(`/admin/events/${eventId}/allocation`)}
          >
            Allocation
          </Link>
          <TradeCloneEventButton locale={TRADE_UI_LOCALE} eventId={eventId} />
        </div>
      </div>

      <TradeEventStatusActions
        locale={TRADE_UI_LOCALE}
        eventId={eventId}
        status={event.status}
      />

      <TradeEventSetupForm locale={TRADE_UI_LOCALE} event={event} />

      <section className="space-y-4">
        <h2 className="font-medium">Products / supply</h2>
        <TradeProductForm
          locale={TRADE_UI_LOCALE}
          eventId={eventId}
          eventStatus={event.status}
        />
        <ul className="space-y-4">
          {products.map((product) => (
            <li key={product.id}>
              <TradeProductForm
                locale={TRADE_UI_LOCALE}
                eventId={eventId}
                product={product}
                eventStatus={event.status}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Custom fields</h2>
        <TradeFieldDefForm
          locale={TRADE_UI_LOCALE}
          eventId={eventId}
          eventStatus={event.status}
        />
        <ul className="space-y-4">
          {fieldDefs.map((field) => (
            <li key={field.id}>
              <TradeFieldDefForm
                locale={TRADE_UI_LOCALE}
                eventId={eventId}
                field={field}
                eventStatus={event.status}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium">Customer priority</h2>
        <TradePriorityImportForm locale={TRADE_UI_LOCALE} eventId={eventId} />
        <ul className="text-muted-foreground text-sm">
          {priorities.map((row) => (
            <li key={`${row.customerName}-${row.priorityRank}`}>
              #{row.priorityRank} {row.customerName}
              {row.customerCode ? ` (${row.customerCode})` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Exports</h2>
        <TradeExportPanel locale={TRADE_UI_LOCALE} eventId={eventId} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Audit</h2>
        <ul className="text-muted-foreground max-h-64 overflow-auto text-xs">
          {audit.map((row) => (
            <li key={String(row.id)}>
              {String(row.created_at)} · {String(row.action)} ·{" "}
              {String(row.actor_id ?? "")}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
