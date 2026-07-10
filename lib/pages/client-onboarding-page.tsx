import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClientOnboardingWizard } from "@/components/client/client-onboarding-wizard";
import { PortalPageIntro } from "@/components/portal/portal-page-intro";
import { PortalTrustNotice } from "@/components/portal/portal-trust-notice";
import { requireClientSession } from "@/lib/auth/session";
import { loadClientOnboardingPageData } from "@/lib/client-onboarding.server";
import { isPlaygroundEmbedRequest } from "@/lib/playground/playground";
import { CLIENT_HOME_HREF } from "@/lib/routing/portal-routes";
import { PORTAL_NAME, portalCopy } from "@/lib/copy/portal-copy";

export const clientOnboardingPageMetadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientOnboarding.title}`,
  description: portalCopy.metadata.clientOnboarding.description,
};

/** Shared page handler for `/client/onboarding`. */
export async function runClientOnboardingPage() {
  const { clientOnboarding } = portalCopy;
  const session = await requireClientSession();
  const embed = await isPlaygroundEmbedRequest();
  const { email, formDefaults, onboardingComplete } =
    await loadClientOnboardingPageData(session.user);

  if (onboardingComplete && !embed) {
    redirect(CLIENT_HOME_HREF);
  }

  return (
    <div className="v-stack mx-auto w-full min-w-0 flex-1 gap-6 p-4 md:max-w-3xl md:p-6">
      <PortalPageIntro
        eyebrow={clientOnboarding.eyebrow}
        title={clientOnboarding.title}
        description={clientOnboarding.description}
      />
      <div className="v-stack gap-6">
        <ClientOnboardingWizard email={email} defaults={formDefaults} />
        <PortalTrustNotice />
      </div>
    </div>
  );
}
