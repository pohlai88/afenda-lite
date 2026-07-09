import { redirect } from "next/navigation";
import { TradeOrderForm } from "@/components/trade/trade-order-form";
import { canSubmitOrder } from "@/lib/domain/trade/events";
import {
  getEventById,
  listFieldDefsForEvent,
  listProductsForEvent,
} from "@/lib/domain/trade/store";
import { isTradeLocale, type TradeLocale } from "@/lib/i18n/trade";

export default async function TradeOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  if (!isTradeLocale(localeParam)) redirect("/trade/vi/events");
  const locale = localeParam as TradeLocale;

  const event = await getEventById(id);
  if (!event) redirect(tradePath(locale, "/events"));

  const gate = canSubmitOrder(event, new Date());
  const [products, fieldDefs] = await Promise.all([
    listProductsForEvent(id),
    listFieldDefsForEvent(id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{event.eventName}</h1>
        <p className="text-muted-foreground text-sm">{event.status}</p>
      </div>
      {!gate.allowed ? (
        <p className="text-destructive text-sm">
          {locale === "vi"
            ? "Sự kiện đã đóng đăng ký."
            : "Ordering is closed for this event."}
        </p>
      ) : (
        <TradeOrderForm
          locale={locale}
          eventId={id}
          products={products}
          fieldDefs={fieldDefs.filter((f) => f.active)}
          depositRequired={event.depositRequired}
        />
      )}
    </div>
  );
}

function tradePath(locale: TradeLocale, path: string) {
  return `/trade/${locale}${path}`;
}
