import Link from "next/link";
import { notFound } from "next/navigation";
import { FftImportPanel } from "@/features/fft/fft-import-panel";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import {
  isFftDepositFeatureActive,
  isFftPickupFeatureActive,
} from "@/modules/fft/auth/fft-phase2b";
import { requireFftAccess } from "@/modules/fft/auth/fft-session";
import { getEventById } from "@/modules/fft/domain/store";
import { getFftEventForOrganization } from "@/features/fft/fft-organization-context";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

/** Imports: no dedicated enable flag — dry-run/confirm always available; type→perm + module flags for deposit/pickup types. */
export default async function TradeImportsPage({ params }: Props) {
  const { eventId } = await params;
  await requireFftAccess();
  const event = await getFftEventForOrganization(eventId);
  if (!event) notFound();

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Imports · {event.eventName}
        </h1>
        <Link className="text-sm underline" href={fftHref(`/admin/events/${eventId}/setup`)}>
          Back to setup
        </Link>
      </div>
      <FftImportPanel
        locale={FFT_UI_LOCALE}
        eventId={eventId}
        depositEnabled={isFftDepositFeatureActive()}
        pickupEnabled={isFftPickupFeatureActive()}
      />
    </main>
  );
}
