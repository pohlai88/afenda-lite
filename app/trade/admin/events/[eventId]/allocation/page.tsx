import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeAllocationControls } from "@/features/trade/trade-allocation-controls";
import {
  TradeTransferAdminRow,
} from "@/features/trade/trade-transfer-forms";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
import {
  getEventById,
  listOrdersForEvent,
  listTransfersForEvent,
} from "@/modules/trade/domain/store";
import { tradeHref } from "@/modules/trade/i18n/trade";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function TradeAllocationPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const [orders, transfers] = await Promise.all([
    listOrdersForEvent(eventId),
    listTransfersForEvent(eventId),
  ]);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Allocation · {event.eventName}
        </h1>
        <Link className="text-sm underline" href={tradeHref(`/admin/events/${eventId}/setup`)}>
          Back to setup
        </Link>
      </div>

      <TradeAllocationControls
        locale={TRADE_UI_LOCALE}
        eventId={eventId}
        orders={orders}
      />

      <section className="space-y-3">
        <h2 className="font-medium">Transfer requests</h2>
        {transfers.length === 0 ? (
          <p className="text-muted-foreground text-sm">None</p>
        ) : (
          <ul className="space-y-3">
            {transfers.map((transfer) => (
              <li key={transfer.id}>
                <TradeTransferAdminRow locale={TRADE_UI_LOCALE} transfer={transfer} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
