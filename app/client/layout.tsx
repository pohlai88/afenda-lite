import { PortalPreviewBanner } from "@/components/portal-preview-banner";
import { ClientRouteShell } from "@/components/client-route-shell";
import { isPlaygroundEmbedRequest } from "@/lib/playground";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const embed = await isPlaygroundEmbedRequest();

  return (
    <>
      {!embed ? <PortalPreviewBanner /> : null}
      <ClientRouteShell embed={embed}>{children}</ClientRouteShell>
    </>
  );
}
