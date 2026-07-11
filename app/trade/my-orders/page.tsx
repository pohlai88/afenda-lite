import Link from "next/link";
import {
  TradeMyOrdersList,
  toTradeMyOrderListItems,
} from "@/features/trade/trade-my-orders-list";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
import { requireTradeAccess } from "@/modules/trade/auth/trade-session";
import { listAllOrdersForSalesperson } from "@/modules/trade/domain/store";
import { tradeHref } from "@/modules/trade/i18n/trade";

export const dynamic = "force-dynamic";

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

      <TradeMyOrdersList
        orders={toTradeMyOrderListItems(orders)}
        locale={TRADE_UI_LOCALE}
      />
    </main>
  );
}
