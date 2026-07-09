import { requireTradeAccess } from "@/lib/auth/trade-session";
import { canTransferOrder } from "@/lib/domain/trade/transfer";
import {
  listAllOrdersForSalesperson,
  listEvents,
} from "@/lib/domain/trade/store";
import { TradeTransferRequestForm } from "@/components/trade/trade-transfer-forms";
import { isTradeLocale, type TradeLocale } from "@/lib/i18n/trade";
import { redirect } from "next/navigation";

export default async function TradeMyOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/my-orders");
  const locale = localeParam as TradeLocale;

  const access = await requireTradeAccess();
  const [orders, events] = await Promise.all([
    listAllOrdersForSalesperson(access.userId),
    listEvents(),
  ]);
  const eventById = new Map(events.map((e) => [e.id, e]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {locale === "vi" ? "Đơn của tôi" : "My orders"}
      </h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {locale === "vi" ? "Bạn chưa có đơn hàng." : "You have no orders yet."}
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const event = eventById.get(o.eventId);
            const canTransfer =
              event && canTransferOrder(o, event).allowed;
            return (
              <div key={o.id} className="space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-muted-foreground">
                      {event?.eventName ?? o.eventId} · {o.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      {o.requestedQuantity}
                      {o.confirmedQuantity != null ? ` → ${o.confirmedQuantity}` : ""}
                    </p>
                    <p className="text-muted-foreground">{o.status}</p>
                  </div>
                </div>
                {canTransfer ? (
                  <TradeTransferRequestForm locale={locale} order={o} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
