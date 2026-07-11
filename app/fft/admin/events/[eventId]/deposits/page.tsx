import Link from "next/link";
import { notFound } from "next/navigation";
import { FftDepositPanel } from "@/features/fft/fft-deposit-forms";
import { FftOpsPlaceholder } from "@/features/fft/fft-ops-placeholder";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import { isFftDepositFeatureActive } from "@/modules/fft/auth/fft-phase2b";
import {
  hasTradePermission,
  requireFftAccess,
} from "@/modules/fft/auth/fft-session";
import {
  listDepositsForEvent,
  listFinanceAuditForEvent,
} from "@/modules/fft/domain/deposit-store";
import { getEventById } from "@/modules/fft/domain/store";
import { getFftEventForOrganization } from "@/features/fft/fft-organization-context";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function FftDepositsPage({ params }: Props) {
  if (!isFftDepositFeatureActive()) {
    return <FftOpsPlaceholder title="Deposits" />;
  }

  const { eventId } = await params;
  const access = await requireFftAccess();
  const event = await getFftEventForOrganization(eventId);
  if (!event) notFound();

  const canView = await hasTradePermission(
    access,
    "deposit.view",
    { eventId },
  );
  if (!canView) {
    return (
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Deposits</h1>
        <p className="text-muted-foreground text-sm">
          Missing permission: deposit.view
        </p>
        <Link className="text-sm underline" href={fftHref(`/admin/events/${eventId}/setup`)}>
          Back to setup
        </Link>
      </main>
    );
  }

  const canManage = await hasTradePermission(
    access,
    "deposit.manage",
    { eventId },
  );
  const [deposits, audit] = await Promise.all([
    listDepositsForEvent(eventId),
    listFinanceAuditForEvent(eventId),
  ]);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Deposits · {event.eventName}
        </h1>
        <Link className="text-sm underline" href={fftHref(`/admin/events/${eventId}/setup`)}>
          Back to setup
        </Link>
      </div>
      <FftDepositPanel
        locale={FFT_UI_LOCALE}
        eventId={eventId}
        deposits={deposits}
        audit={audit}
        canManage={canManage}
      />
    </main>
  );
}
