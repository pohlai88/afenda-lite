import Link from "next/link";
import { FftErpSyncPanel } from "@/features/fft/fft-erp-sync-panel";
import { FftOpsPlaceholder } from "@/features/fft/fft-ops-placeholder";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import { isFftErpSyncFeatureActive } from "@/modules/fft/auth/fft-phase2d";
import { requireFftAccess } from "@/modules/fft/auth/fft-session";
import {
  toFftSyncJobDetailDto,
} from "@/modules/fft/domain/erp/types";
import { listSyncJobsWithDetails } from "@/modules/fft/domain/erp-sync-store";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

export default async function FftErpSyncPage() {
  if (!isFftErpSyncFeatureActive()) {
    return <FftOpsPlaceholder title="ERP sync" />;
  }

  await requireFftAccess();
  const details = await listSyncJobsWithDetails();
  const jobs = details.map(toFftSyncJobDetailDto);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ERP sync</h1>
        <Link className="text-sm underline" href={fftHref("/admin/events")}>
          Back to admin events
        </Link>
      </div>
      <FftErpSyncPanel locale={FFT_UI_LOCALE} jobs={jobs} />
    </main>
  );
}
