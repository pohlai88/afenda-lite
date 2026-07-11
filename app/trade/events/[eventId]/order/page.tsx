import { notFound } from "next/navigation";
import { TradeOrderForm } from "@/features/trade/trade-order-form";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";
import {
  getEventById,
  listFieldDefsForEvent,
  listProductsForEvent,
} from "@/modules/trade/domain/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function TradeEventOrderPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event) notFound();

  const [products, fieldDefs] = await Promise.all([
    listProductsForEvent(eventId),
    listFieldDefsForEvent(eventId),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Order · {event.eventName}
        </h1>
        <p className="text-muted-foreground text-sm">Status: {event.status}</p>
      </div>
      <TradeOrderForm
        locale={TRADE_UI_LOCALE}
        eventId={eventId}
        products={products}
        fieldDefs={fieldDefs}
        depositRequired={Boolean(event.depositRequired)}
      />
    </main>
  );
}
