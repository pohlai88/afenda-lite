import Link from "next/link";
import { notFound } from "next/navigation";
import { FftOpsPlaceholder } from "@/features/fft/fft-ops-placeholder";
import { FftPickupPanel } from "@/features/fft/fft-pickup-forms";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import { isFftPickupFeatureActive } from "@/modules/fft/auth/fft-phase2b";
import {
  hasFftPermission,
  requireFftAccess,
} from "@/modules/fft/auth/fft-session";
import {
  listPickupQueueForEvent,
  listPickupWindowsForEvent,
} from "@/modules/fft/domain/pickup-store";
import { getEventById } from "@/modules/fft/domain/store";
import { getFftEventForOrganization } from "@/features/fft/fft-organization-context";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function FftPickupPage({ params }: Props) {
  if (!isFftPickupFeatureActive()) {
    return <FftOpsPlaceholder title="Pickup" />;
  }

  const { eventId } = await params;
  const access = await requireFftAccess();
  const event = await getFftEventForOrganization(eventId);
  if (!event) notFound();

  const canView = await hasFftPermission(
    access,
    "pickup.view",
    { eventId },
  );
  if (!canView) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pickup</h1>
        <p className="text-muted-foreground text-sm">
          Missing permission: pickup.view
        </p>
        <Link className="text-sm underline" href={fftHref(`/admin/events/${eventId}/setup`)}>
          Back to setup
        </Link>
      </main>
    );
  }

  const canManage = await hasFftPermission(
    access,
    "pickup.manage",
    { eventId },
  );
  const [windows, queue] = await Promise.all([
    listPickupWindowsForEvent(eventId),
    listPickupQueueForEvent(eventId),
  ]);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pickup · {event.eventName}
        </h1>
        <Link className="text-sm underline" href={fftHref(`/admin/events/${eventId}/setup`)}>
          Back to setup
        </Link>
      </div>
      <FftPickupPanel
        locale={FFT_UI_LOCALE}
        eventId={eventId}
        windows={windows}
        queue={queue}
        canManage={canManage}
      />
    </main>
  );
}
