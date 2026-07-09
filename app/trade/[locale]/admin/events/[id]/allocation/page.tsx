import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeAllocationControls } from "@/components/trade/trade-allocation-controls";
import { TradeTransferAdminRow } from "@/components/trade/trade-transfer-forms";
import { requireTradeAdmin } from "@/lib/auth/trade-session";
import {
  getEventById,
  listOrdersForEvent,
  listProductsForEvent,
  listTransfersForEvent,
} from "@/lib/domain/trade/store";
import { isTradeLocale, tradeHref, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeAdminAllocationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/admin/events");
  const locale = localeParam as TradeLocale;

  await requireTradeAdmin();
  const event = await getEventById(id);
  if (!event) redirect(tradeHref(locale, "/admin/events"));

  const [orders, products, transfers] = await Promise.all([
    listOrdersForEvent(id),
    listProductsForEvent(id),
    listTransfersForEvent(id),
  ]);

  const serializableOrders = orders.map((o) => ({
    ...o,
    registeredAt: o.registeredAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={tradeHref(locale, `/admin/events/${id}/setup`)}
          className="text-muted-foreground text-sm"
        >
          ← Setup
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Allocation — {event.eventName}</h1>
        <p className="text-muted-foreground text-sm">
          Sort: priority_rank → registered_at → order_id. Manual adjust never exceeds
          final confirmed supply.
        </p>
      </div>

      <TradeAllocationControls
        locale={locale}
        eventId={id}
        orders={serializableOrders}
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Order</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Priority</th>
              <th className="p-2">Registered</th>
              <th className="p-2">Requested</th>
              <th className="p-2">Confirmed</th>
              <th className="p-2">Fulfilled</th>
              <th className="p-2">Est. support</th>
              <th className="p-2">Final support</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.orderNumber}</td>
                <td className="p-2">{o.customerName}</td>
                <td className="p-2">{o.priorityRank}</td>
                <td className="p-2">{o.registeredAt.toISOString()}</td>
                <td className="p-2">{o.requestedQuantity}</td>
                <td className="p-2">{o.confirmedQuantity ?? "—"}</td>
                <td className="p-2">{o.fulfilledQuantity ?? "—"}</td>
                <td className="p-2">{o.estimatedSupport ?? "—"}</td>
                <td className="p-2">{o.finalSupport ?? "—"}</td>
                <td className="p-2">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Supply</h2>
        <ul className="text-sm">
          {products.map((p) => (
            <li key={p.id}>
              {p.productName}: final {p.finalConfirmedQuantity ?? "—"} / allocated{" "}
              {p.allocatedQuantity}
            </li>
          ))}
        </ul>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Transfer requests</h2>
        {transfers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No transfers.</p>
        ) : (
          <ul className="space-y-2">
            {transfers.map((t) => (
              <TradeTransferAdminRow key={t.id} locale={locale} transfer={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
