import "server-only";

import type { Metadata } from "next";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { ClientWorkspaceUnavailable } from "@/lib/pages/client-workspace-unavailable";

export const clientProfilePageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.clientWorkspace.unavailableTitle}`,
  description: portalCopy.clientWorkspace.unavailableDescription,
  robots: { index: false, follow: false },
};

/**
 * Client profile UI is tombstoned (rebuild deferred).
 * Same unavailable panel as `/client` — no redirect loop.
 */
export async function runClientProfilePage() {
  const copy = portalCopy.clientWorkspace;

  return (
    <ClientWorkspaceUnavailable
      copy={{
        eyebrow: portalCopy.clientProfile.eyebrow,
        title: copy.unavailableTitle,
        description: copy.unavailableDescription,
        signOutLabel: copy.unavailableSignOutLabel,
      }}
    />
  );
}
