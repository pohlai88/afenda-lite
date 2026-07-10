import "server-only";

import type { Metadata } from "next";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { ClientWorkspaceUnavailable } from "@/lib/pages/client-workspace-unavailable";

export const clientDashboardPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.clientWorkspace.unavailableTitle}`,
  description: portalCopy.clientWorkspace.unavailableDescription,
  robots: { index: false, follow: false },
};

/**
 * Client home UI is tombstoned (rebuild deferred).
 * Renders a stable unavailable state so onboarded clients are not
 * bounced `/client` ↔ `/` via post-auth landing.
 */
export async function runClientDashboardPage() {
  const copy = portalCopy.clientWorkspace;

  return (
    <ClientWorkspaceUnavailable
      copy={{
        eyebrow: copy.eyebrow,
        title: copy.unavailableTitle,
        description: copy.unavailableDescription,
        signOutLabel: copy.unavailableSignOutLabel,
      }}
    />
  );
}
