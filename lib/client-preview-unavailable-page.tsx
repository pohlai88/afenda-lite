import "server-only";

import { ClientPreviewUnavailableView } from "@/components/client-preview-unavailable-view";
import {
  previewUnavailablePageMetadata,
  runPreviewUnavailablePage,
} from "@/lib/preview-client";

export { previewUnavailablePageMetadata };

/** Shared page handler for `/client/preview-unavailable`. */
export async function runClientPreviewUnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; reason?: string }>;
}) {
  const { reason, embed } = await runPreviewUnavailablePage({ searchParams });
  return <ClientPreviewUnavailableView reason={reason} embed={embed} />;
}
