import Link from "next/link";
import { completeTradeOrderAction } from "@/app/actions/trade";
import { Button } from "@/components-V2/platform-components/ui/button";
import { TradeTransferRequestForm } from "@/features/trade/trade-transfer-forms";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
import { requireTradeAccess } from "@/modules/trade/auth/trade-session";
import { listAllOrdersForSalesperson } from "@/modules/trade/domain/store";
import { tradeHref } from "@/modules/trade/i18n/trade";

export const dynamic = "force-dynamic";

async function completeOrderFormAction(formData: FormData) {
  "use server";
  const orderId = String(formData.get("orderId") ?? "");
  const qty = Number(formData.get("fulfilledQuantity") ?? 0);
  if (!orderId || !Number.isFinite(qty) || qty <= 0) return;
  await completeTradeOrderAction(TRADE_UI_LOCALE, orderId, qty);
}

export default async function TradeMyOrdersPage() {
  const access = await requireTradeAccess();
  const orders = await listAllOrdersForSalesperson(access.userId);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <Link className="text-sm underline" href={tradeHref("/events")}>
          Events
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="space-y-2 rounded-lg border p-4"
              data-testid="trade-my-order-row"
              data-order-id={order.id}
              data-status={order.status}
              data-transfer-status={order.transferStatus ?? ""}
              data-customer={order.customerName}
            >              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-muted-foreground">
                    {order.customerName} · {order.status} · qty{" "}
                    {order.requestedQuantity}
                    {order.confirmedQuantity != null
                      ? ` / confirmed ${order.confirmedQuantity}`
                      : ""}
                  </p>
                </div>
                <Link
                  className="underline"
                  href={tradeHref(`/events/${order.eventId}/order`)}
                >
                  Event order
                </Link>
              </div>
              <TradeTransferRequestForm locale={TRADE_UI_LOCALE} order={order} />
              {order.status !== "completed" && order.status !== "cancelled" ? (
                <form
                  action={completeOrderFormAction}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <label className="text-xs">
                    Fulfilled qty
                    <input
                      className="border-input ml-2 rounded border px-2 py-1"
                      name="fulfilledQuantity"
                      type="number"
                      min={1}
                      defaultValue={
                        order.confirmedQuantity ?? order.requestedQuantity
                      }
                    />
                  </label>
                  <Button type="submit" variant="outline" size="sm">
                    Complete order
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
