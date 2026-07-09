import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClientOnboardingWizard } from "@/components/client-onboarding-wizard";
import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { PortalTrustNotice } from "@/components/portal-trust-notice";
import { requireClientSession } from "@/lib/auth/session";
import { loadClientOnboardingPageData } from "@/lib/client-onboarding.server";
import { isPlaygroundEmbedRequest } from "@/lib/playground";
import { CLIENT_HOME_HREF } from "@/lib/portal-routes";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: `${PORTAL_NAME} — ${portalCopy.metadata.clientOnboarding.title}`,
  description: portalCopy.metadata.clientOnboarding.description,
};

export default async function ClientOnboardingPage() {
  const { clientOnboarding } = portalCopy;
  const session = await requireClientSession();
  const embed = await isPlaygroundEmbedRequest();
  const { email, formDefaults, onboardingComplete } =
    await loadClientOnboardingPageData(session.user);

  if (onboardingComplete && !embed) {
    redirect(CLIENT_HOME_HREF);
  }

  return (
    <PortalCustomerShell
      variant="app"
      eyebrow={clientOnboarding.eyebrow}
      title={clientOnboarding.title}
      description={clientOnboarding.description}
    >
      <div className="v-stack gap-6">
        <ClientOnboardingWizard email={email} defaults={formDefaults} />
        <PortalTrustNotice />
      </div>
    </PortalCustomerShell>
  );
}
