import { notFound } from "next/navigation";
import { FftOrderForm } from "@/features/fft/fft-order-form";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import {
  getEventById,
  listFieldDefsForEvent,
  listProductsForEvent,
} from "@/modules/fft/domain/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function FftEventOrderPage({ params }: Props) {
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
      <FftOrderForm
        locale={FFT_UI_LOCALE}
        eventId={eventId}
        products={products}
        fieldDefs={fieldDefs}
        depositRequired={Boolean(event.depositRequired)}
        eventStatus={event.status}
      />
    </main>
  );
}
