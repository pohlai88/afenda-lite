import Link from "next/link";
import { notFound } from "next/navigation";
import { FftAllocationControls } from "@/features/fft/fft-allocation-controls";
import { FftTransferAdminRow } from "@/features/fft/fft-transfer-forms";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import { hasFftEventManagePermission } from "@/modules/fft/auth/fft-phase2b";
import { requireFftAccess } from "@/modules/fft/auth/fft-session";
import {
  listOrdersForEvent,
  listTransfersForEvent,
} from "@/modules/fft/domain/store";
import { getFftEventForOrganization } from "@/features/fft/fft-organization-context";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function FftAllocationPage({ params }: Props) {
  const { eventId } = await params;
  const access = await requireFftAccess();
  const event = await getFftEventForOrganization(eventId);
  if (!event) notFound();

  const canOverride = await hasFftEventManagePermission(
    access,
    "allocation.override",
    eventId,
  );

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
        <Link className="text-sm underline" href={fftHref(`/admin/events/${eventId}/setup`)}>
          Back to setup
        </Link>
      </div>

      <FftAllocationControls
        locale={FFT_UI_LOCALE}
        eventId={eventId}
        orders={orders}
        canOverride={canOverride}
      />

      <section className="space-y-3" data-testid="trade-transfer-requests">
        <h2 className="font-medium">Transfer requests</h2>
        {transfers.length === 0 ? (
          <p className="text-muted-foreground text-sm">None</p>
        ) : (
          <ul className="space-y-3">
            {transfers.map((transfer) => (
              <FftTransferAdminRow
                key={transfer.id}
                locale={FFT_UI_LOCALE}
                transfer={transfer}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
