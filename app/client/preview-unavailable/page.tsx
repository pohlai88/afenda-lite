import { PortalEmptyState } from "@/components/portal-empty-state";
import { portalCopy } from "@/lib/portal-copy";

export default function ClientPreviewUnavailablePage() {
  return (
    <main className="mx-auto flex min-h-[50dvh] max-w-lg items-center p-6">
      <PortalEmptyState>{portalCopy.previewClient.notConfigured}</PortalEmptyState>
    </main>
  );
}
