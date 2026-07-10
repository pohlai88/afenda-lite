import "server-only";

import type { Metadata } from "next";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";
import { ClientWorkspaceUnavailable } from "@/lib/pages/client-workspace-unavailable";

export const clientOnboardingPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.clientOnboarding.unavailableTitle}`,
  description: portalCopy.clientOnboarding.unavailableDescription,
  robots: { index: false, follow: false },
};

/**
 * Onboarding wizard UI is tombstoned (rebuild deferred).
 * Renders a stable unavailable state so incomplete clients are not
 * bounced `/client/onboarding` ↔ `/` via post-auth landing.
 */
export async function runClientOnboardingPage() {
  const copy = portalCopy.clientOnboarding;

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
