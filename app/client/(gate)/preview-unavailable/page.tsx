import { ClientPreviewUnavailableView } from "@/components/client-preview-unavailable-view";
import {
  previewUnavailablePageMetadata,
  runPreviewUnavailablePage,
} from "@/lib/preview-client";

export const metadata = previewUnavailablePageMetadata;
export const dynamic = "force-dynamic";

/** Operator preview sandbox is missing or unreachable — gate route (no workspace shell). */
export default async function ClientPreviewUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; reason?: string }>;
}) {
  const { reason, embed } = await runPreviewUnavailablePage({ searchParams });
  return <ClientPreviewUnavailableView reason={reason} embed={embed} />;
}
