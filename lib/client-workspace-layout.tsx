import "server-only";

import { PortalPreviewBanner } from "@/components/portal-preview-banner";
import { ClientRouteShell } from "@/components/client-route-shell";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { resolvePortalMember } from "@/lib/portal-member";

/** Shared layout handler for `app/client/(workspace)`. */
export async function runClientWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const embed = await isPlaygroundEmbedRequest();
  const member = embed ? null : await resolvePortalMember();

  return (
    <>
      {!embed ? <PortalPreviewBanner member={member} /> : null}
      <ClientRouteShell embed={embed} member={member}>
        {children}
      </ClientRouteShell>
    </>
  );
}
