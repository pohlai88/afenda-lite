import { TradeNewEventForm } from "@/features/trade/trade-admin-forms";
import { TRADE_UI_LOCALE } from "@/features/trade/trade-ui-locale";

export default function TradeNewEventPage() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <TradeNewEventForm locale={TRADE_UI_LOCALE} />
    </main>
  );
}
