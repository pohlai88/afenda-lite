import {
  previewUnavailablePageMetadata,
  runClientPreviewUnavailablePage,
} from "@/lib/client-preview-unavailable-page";

export const metadata = previewUnavailablePageMetadata;
export const dynamic = "force-dynamic";

/** Operator preview sandbox is missing or unreachable — gate route (no workspace shell). */
export default runClientPreviewUnavailablePage;
