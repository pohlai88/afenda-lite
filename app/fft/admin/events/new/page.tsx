import { TradeNewEventForm } from "@/features/fft/fft-admin-forms";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";

export default function TradeNewEventPage() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      <TradeNewEventForm locale={FFT_UI_LOCALE} />
    </main>
  );
}
